var winston = require('winston');
var Promise = require('bluebird');
var argv = require('yargs');

var winstonLogger = winston.createLogger({
    format: winston.format.combine(winston.format.timestamp(), winston.format.printf(function(info){
        return info.timestamp + ' ' + info.level.toUpperCase() + ' ' + info.message;
    })),
    transports: [new winston.transports.Console()],
    level: 'info'
});

var logger = require('./logger')(winstonLogger);
var api = require('./apiCaller')(logger);
var db = require('./dbCaller')(logger);

var staticData = require('./staticData')(logger, api, db);
var userData = require('./userData')(logger, api, db);
var matchData = require('./matchData')(logger, api, db);
var userTest = require('./singleUserTest')(logger, userData);
var webserver = require('./webserver')(logger, staticData, userData, matchData, db);

argv.command('server [port]', 'Starts the webserver', {}, function(argv){
    logger.info('Starting the webserver on port ' + (argv.port || 'default'));
}).command('static', 'Gets static data', {}, function(argv){
    logger.info('Getting static data');
}).command('user <username>', 'Gets summoner data', {}, function(argv){
    logger.info('Getting summoner data for ' + argv.username);
}).demandCommand().command('matchlist [limit]', 'Gets data for matches in the DB', {}, function(argv){
    logger.info('Getting data for ' + (argv.limit || 1) + ' matches at a time');
}).command('newmatches [limit]', 'Gets new matches from new summoners', {}, function(argv){
    logger.info('Getting matches for' + (argv.limit || 1) + 'summoners at a time');
}).help().argv;

//webserver.start();

//staticData.getAll();

//userTest.pipeline('Rave With Grin');

//matchData.processMatchList(25);

//matchData.fetchNewMatches(10000);

process.on('unhandledRejection', function(error) {
    console.error(error);
    process.exit(1);
});
