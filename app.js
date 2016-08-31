
var cfenv = require('cfenv'),
  path = require('path'),
  appEnv = cfenv.getAppEnv(),
  express = require('express'),
  bodyParser = require('body-parser'),s
  CryptoJS = require("crypto-js"),
  router = express.Router();
  cloudant = null,
  teamsdb = null,
  tokensdb = null,
  uuid = require('uuid'),
  appurl = (appEnv.app.application_uris)?appEnv.app.application_uris[0]:"localhost:"+appEnv.port,
  thekey = 'bj0uSrR1WZtxIZ6thpMX',
  dbName = 'advocated2';

var encrypt = function(str, key) {
  return CryptoJS.AES.encrypt(str, key).toString();
};

var decrypt = function(str, key) {
  var bytes  = CryptoJS.AES.decrypt(str, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

var createUser = function(q, team, callback) {
  envoy.auth.getUser(q.user_id, function (err, data) {
    if (err) {
      var meta = {
        user_name: q.user_name,
        team_id: team._id,
        team_name: team.name
      };
      console.log("created new user", q.user_id, meta);
      var password = uuid.v4();
      meta.password = encrypt(password, thekey);
      envoy.auth.newUser(q.user_id, password, meta, function (err, data) {
        envoy.auth.getUser(q.user_id, function(err, data) {
          callback(err, data);
        });
      })
    } else {
      console.log("User already exists", data);
      callback(err, data);
    }
  });
}
 
router.post('/slack', bodyParser.urlencoded({ extended: false }), function(req, res) {
  var q = req.body;s
  if (q.team_id) {
    console.log("Incoming slack request for team_id", q.team_id);
    teamsdb.get(q.team_id, function (err, team) {
      if (err) {
        res.status(403).send("Team not found");
      } else {
        // if the incoming token matches the team token
        if (team.slack.token === q.token) {
          createUser(q, team, function(err, data) {
            data._id = uuid.v4();
            data.ts = new Date().getTime() + 1000*60*60;
            delete data._rev;
            tokensdb.insert(data, function (err, data) {
              res.send("Thanks for advocating. Please visit this URL to enter the details <https://" + appurl + "/?token=" + data.id + "#token.html>");
            });
          });
        } else {
          res.status(403).send("Invalid token");
        }
      }
    });
  } else {
    res.send(403);
  }
});

// exchange
router.get('/api/token/:token', function(req, res) {
  tokensdb.get(req.params.token, function(err, data) {
    if (err) {
      res.send({ok: false});
    } else {
      tokensdb.destroy(data._id, data._rev);
      if (data.ts > new Date().getTime()) {
        data.meta.password = decrypt(data.meta.password, thekey);
        res.send(data);
      } else {
        res.send({ok: false, msg: 'out of date'});
      }
    }
  });
});

// setup envoy with our static files
var opts = {
    databaseName: dbName,
    port: appEnv.port,
    logFormat: 'dev',
    production: true,
    static: path.join(__dirname, './public'),
    router: router
};

// run envoy
var envoy = require('cloudant-envoy')(opts);
envoy.events.on('listening', function() {
  cloudant = envoy.cloudant;
  teamsdb = cloudant.db.use('teams');
  tokensdb = cloudant.db.use('tokens');
  console.log('[OK]  Server is up');
});



