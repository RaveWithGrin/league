//var logger = require('./logger')('silly');
var logger = require('./logger')('debug');
var api = require('./apiCaller_v4')(logger);
var db = require('./dbCaller')(logger);

var staticData = require('./staticData')(logger, api, db);
var userData = require('./userData_v4')(logger, api, db);
var matchData = require('./matchData_v4')(logger, api, db);

var main = async function(){
    await matchData.processMatchList(1);
};

main();

process.on('unhandledRejection', function(error){
    console.error(error);
    process.exit(1);
});
