var winston = require('winston');
var Promise = require('bluebird');

var myFormat = winston.format.printf(function(info) {
    return info.timestamp + ' ' + info.level.toUpperCase() + ' ' + info.message;
});

var winstonLogger = winston.createLogger({
    format: winston.format.combine(winston.format.timestamp(), myFormat),
    transports: [new winston.transports.Console()],
    level: 'silly'
});

var logger = require('./logger')(winstonLogger);
var api = require('./apiCaller')(logger);
var db = require('./dbCaller')(logger);

var staticData = require('./staticData')(logger, api, db);
var userData = require('./userData')(logger, api, db);
var matchData = require('./matchData')(logger, api, db);
var userTest = require('./singleUserTest')(logger, userData);

var webserver = require('./webserver')(logger, userData, matchData);
//webserver.start();

var getAllStaticData = async function() {
    var staticDataPromises = [];
    staticDataPromises.push(staticData.getChampions());
    staticDataPromises.push(staticData.getItems());
    staticDataPromises.push(staticData.getRunes());
    staticDataPromises.push(staticData.getSpells());
    staticDataPromises.push(staticData.getSkins());
    await Promise.all(staticDataPromises);
    logger.info('Done getting static data');
};

var test = async function(){
    var match = await db.select.newGames(1);
    match = match.data[0];
    await matchData.newgetMatch(match);
}

test();


//getAllStaticData();

//userTest.pipeline('Rave With Grin');

//matchData.processMatchList(25);

//matchData.fetchNewMatches(10000);

process.on('unhandledRejection', function(error) {
    console.error(error);
    process.exit(1);
});
