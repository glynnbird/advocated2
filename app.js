
var cfenv = require('cfenv'),
  path = require('path'),
  appEnv = cfenv.getAppEnv(),
  dbName = 'advocated2';

// setup envoy with our static files
var opts = {
    databaseName: dbName,
    port: appEnv.port,
    logFormat: 'dev',
    production: true,
    static: path.join(__dirname, './public')
};

// run envoy
var envoy = require('../envoy')(opts);



