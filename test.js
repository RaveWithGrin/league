//var logger = require('./logger')('silly');
//var logger = require('./logger')('debug');
var logger = require('./logger')('info');
var api = require('./apiCaller_v4')(logger);
var db = require('./dbCaller_v4')(logger);

var staticData = require('./staticData')(logger, api, db);
var userData = require('./userData_v4')(logger, api, db);
var matchData = require('./matchData_v4')(logger, api, db);
var userTest = require('./singleUserTest')(logger, userData);

var main = async function(){
    //await staticData.getAll();
    //await userTest.pipeline('Rave With Grin');
    await matchData.processMatchList(1);
    db.end();
};

main();

process.on('unhandledRejection', function(error){
    console.error(error);
    process.exit(1);
});
