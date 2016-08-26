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
    
  };

  // add user data into the mix
  o.userid = user._id;
  o.userDisplayName = user.display_name;
  o.userDomain = user.identifiers.slack.team_domain;
  o.ts = ms();

  // write to the database
  db.post(o).then(function() {
    Materialize.toast('Saved', 4000);
  });
}

$( document ).ready(function(){

  // materialize special
  $(".button-collapse").sideNav();


});

