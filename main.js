var { createLogger, format, transports } = require('winston');
var { combine, timestamp, label, printf } = format;
var Promise = require('bluebird');

var myFormat = printf(function(info) {
    return `${info.timestamp} ${info.level.toUpperCase()} ${info.message}`;
});

var winstonLogger = createLogger({
    format: combine(timestamp(), myFormat),
    transports: [new transports.Console()],
    level: 'debug'
});

var logger = require('./logger')(winstonLogger);
var api = require('./apiCaller')(logger);
var db = require('./dbCaller')(logger);

var staticData = require('./staticData')(logger, api, db);
var userData = require('./userData')(logger, api, db);
var matchData = require('./matchData')(logger, api, db);
var userTest = require('./singleUserTest')(logger, userData);

var webserver = require('./webserver')(logger, api, db, userData);
//webserver.start();

var getAllStaticData = async function() {
    var staticDataPromises = [];
    staticDataPromises.push(staticData.getChampions());
    staticDataPromises.push(staticData.getItems());
    //staticDataPromises.push(staticData.getMasteries());
    staticDataPromises.push(staticData.getRunes());
    staticDataPromises.push(staticData.getSpells());
    staticDataPromises.push(staticData.getSkins());
    await Promise.all(staticDataPromises);
    logger.info('Done getting static data');
};

//getAllStaticData();

//userTest.mainPipeline('Rave With Grin');
userTest.pipeline('Rave With Grin');

//matchData.processMatchList(10);

//matchData.fetchNewMatches(10000);

process.on('unhandledRejection', function(error) {
    console.error(error);
    process.exit(1);
});
