var logger = require('./logger')('info');
var api = require('./apiCaller')(logger);
var db = require('./dbCaller')(logger);

var staticData = require('./staticData')(logger, api, db);
var userData = require('./userData')(logger, api, db);
var matchData = require('./matchData')(logger, api, db);
var userTest = require('./singleUserTest')(logger, userData);
var webserver = require('./webserver')(logger, staticData, userData, matchData, db);

var main = async function() {
    //await staticData.getAll();
    //await userTest.pipeline('Rave With Grin');
    //await matchData.processMatchList(10);
    webserver.start();
};

main();

process.on('unhandledRejection', function(error) {
    console.error(error);
    process.exit(1);
});
