if ('serviceWorker' in navigator) {
 /* navigator.serviceWorker.register('/demo/serviceworker.js', { scope: '/demo/' }).then(function(reg) {
    
    if (reg.installing) {
      console.log('Service worker installing');
    } else if (reg.waiting) {
      console.log('Service worker installed');
    } else if (reg.active) {
      console.log('Service worker active');
    }
    
  }).catch(function(error) {
    // registration failed
    console.log('Registration failed with ' + error);
  });*/
}

// ET phone home
var envoy = window.location.origin;
var db = new PouchDB('advocated');
var loggedinuser = null;


var user = {
  "_id": "07cebfee8de061fd61bc5cec969acf42",
  "_rev": "1-1efb5312fe624eff0df2abb74cf53f1e",
  "collection": "user",
  "display_name": "markwats",
  "identifiers": {
    "slack": {
      "token": "iwnqIhAVxV5IWDhw8HTuFTV8",
      "team_id": "T08LVDR7Y",
      "team_domain": "ibm-analytics",
      "channel_id": "C0L9K4CBH",
      "channel_name": "cds-advocated",
      "user_id": "U0NMU6A8K",
      "user_name": "markwats",
      "command": "/advocated",
      "text": "SXSW",
      "response_url": "https://hooks.slack.com/commands/T08LVDR7Y/29356843537/dmhVY2KVwKU3ZYzCdpYj5RE4"
    }
  }
};

// get milliseconds
var ms = function() {
  return new Date().getTime();
}

// perform a sync
var sync = function() {
  var start = ms();
  var remote = new PouchDB(envoy + '/advocated2');
  $('#syncprogress').removeClass('hide');

  db.sync(remote).then(function() {
    var t = (ms() - start)/1000;
    Materialize.toast('Sync complete ('+ t + ')', 4000);
    $('#syncprogress').addClass('hide');
    //renderList();
  });
}


// form submitter
var submitForm = function (id) {

  var o = {};
  var elements = $(id + ' :input')
  for(var i in elements) {
    var a = elements[i];
    if (a.type && a.name && a.id) {
      var val = a.value;
      var grouped = ($(a).attr('data-meta') === 'grouped')? true: false;

      switch (a.type) {
        case 'number':
          val = parseInt(val);
        break;

        case 'checkbox':
          if (grouped) {
            if (!a.checked) {
              val = null;
            }
            // use text value
          } else {
            // use boolean
            val = a.checked;
          }
        break;

        case 'text':
          if (grouped) {
            val = val.split(',');
          }
        break;

        case 'url':
        case 'hidden':
        default:
        break;
      }

      if (val != null) {
        if (o[a.name] !== undefined) {
          if (!o[a.name].push) {
            o[a.name] = [o[a.name]];
          }
          o[a.name].push(val);
        } else {
          o[a.name] = val;
        }
      }

    }
    else if (a.name === '_id' && a.value) {
      o._id = a.value;
    }
    else if (a.name === '_rev' && a.value) {
      o._rev = a.value;
    }
    
  };

  // add user data into the mix
  o.userid = user._id;
  o.userDisplayName = user.display_name;
  o.userDomain = user.identifiers.slack.team_domain;
  o.ts = ms();

  // write to the database
  if (o._id) {
    db.put(o).then(function() {
      Materialize.toast('Updated', 1500, '', function() {
        renderEvents();
      });
    });
  }
  else {
    db.post(o).then(function() {
      Materialize.toast('Saved', 1500, '', function() {
        renderEvents();
      });
    });
  }
}

var initForm = function() {
  $('form').on('submit', function(event) {
    event.preventDefault();
    var btn = $('button[type="submit"]');
    btn.prop('disabled', true)
      .addClass('disabled')
      .text(btn.text() === 'Update' ? 'Updating...' : 'Submitting...');

    submitForm('#' + $(this).attr('id'));
  });
};

var updatePage = function() {
  var docid = null,
    token = null;
  if (location.search && location.search.indexOf('id=') != -1) {
    var idx = location.search.indexOf('id=');
    var h = location.search.indexOf('#', idx) != -1 ? location.search.indexOf('#', idx) : location.search.length;
    var a = location.search.indexOf('&', idx) != -1 ? location.search.indexOf('&', idx) : location.search.length;
    docid = location.search.substring(idx+3, Math.min(h, a));
  }
  if (location.search && location.search.indexOf('token=') != -1) {
    var idx = location.search.indexOf('token=');
    var h = location.search.indexOf('#', idx) != -1 ? location.search.indexOf('#', idx) : location.search.length;
    var a = location.search.indexOf('&', idx) != -1 ? location.search.indexOf('&', idx) : location.search.length;
    token = location.search.substring(idx+6, Math.min(h, a));
  }
  if (docid) {
    db.get(docid)
      .then(function(doc) {
        var page = '/templates/';
        if (doc.collection == 'session') {
          page += 'presented.html';
        } else if (doc.collection == 'event') {
          page += 'attended.html';
        } else if (doc.collection == 'blog') {
          page += 'blogged.html';
        } else if (doc.collection == 'press') {
          page += 'pr.html';
        }
        $.get(page, function(template) {
          var rendered = Mustache.render(template, doc);
          $('#main').html(rendered);
          initForm();
        });
      })
      .catch(function(err) {
        console.error(err);
        renderEvents();
      });
  }
  else {
    var page = location.hash ? location.hash.substring(1) : null;
    if (page) {
      $.get(('/templates/' + page), function(template) {
        var rendered = Mustache.render(template, { token: token, loggedinuser: loggedinuser });
        $('#main').html(rendered);
        initForm();
      });
    }
    else {
      renderEvents();
    }
  }
};

var renderEvents = function() {
  var map = function(doc) {
    emit(doc.ts, null);
  }
  db.query(map, {include_docs:true, descending:true, limit: 50})
    .then(function(data) {
      var template = $('#frontpage').html();
      var rendered = Mustache.render(template, data);
      $('#main').html(rendered);
    });
};

var deleteEvent = function(id, rev) {
  if (id) {
    db.remove(id, rev)
      .then(function(result) {
        $("#" + id + "_delete").remove();
        $("#" + id + "_detail").remove();
      })
      .catch(function(err) {
        console.error(err);
      });
  }
};

var toggle = function(domNodeId, parentId) {
	var expanded = $("#" + domNodeId).is(":visible");
	if (!expanded && parentId) {
		$("#" + parentId).toggleClass("active");
	}
	$("#" + domNodeId).slideToggle(500, function() {
		if (expanded && parentId) {
			$("#" + parentId).toggleClass("active");
		}
	});
};

var initCheckboxes = function(sponsored, categories) {
	if (sponsored == true || sponsored.toLowerCase() === "true") {
		$('input[name="sponsored"][value="Sponsored"]').prop('checked', true);
	}
	if (categories) {
		var c = [];
		if ($.isArray(categories)) {
			c = categories;
		}
		else {
			c = categories.split(',');
		}
		
		for (var i in c) {
			$('input[name="categories"][value="' + c[i] + '"]').prop('checked', true);
		}
	}
};


$(document).ready(function(){
  // materialize special
  $(".button-collapse").sideNav({
    closeOnClick: true
  });

  db.get('_local/user').then(function(data) {
    loggedinuser = data;
    var msg = 'Welcome back, ' + data.meta.user_name + ' (' + data.meta.team_name + ')';
    Materialize.toast(msg, 4000);
  });

  updatePage();
});

