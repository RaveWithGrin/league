var winston = require('winston');
var argv = require('yargs');

var winstonLogger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(function(info) {
            return info.timestamp + ' ' + info.level.toUpperCase() + ' ' + info.message;
        })
    ),
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

/*
argv
    .command('server [port]', 'Starts the webserver', {}, function(argv) {
        webserver.start();
    })
    .command('static', 'Gets static data', {}, async function(argv) {
        await staticData.getAll();
        process.exit(0);
    })
    .command('user <username>', 'Gets summoner data', {}, async function(argv) {
        await userTest.pipeline(argv.username);
        process.exit(0);
    })
    .demandCommand()
    .command('matchlist [limit]', 'Gets data for matches in the DB', {}, async function(argv) {
        await matchData.processMatchList(argv.limit);
    })
    .command('newmatches [limit]', 'Gets new matches from new summoners', {}, async function(argv) {
        await matchData.fetchNewMatches(argv.limit);
    })
    .help().argv;
*/

var main = async function() {
    await staticData.getAll();
    await userTest.pipeline('Rave With Grin');
    await matchData.processMatchList(10);
};

main();
//webserver.start();
//matchData.processMatchList(25);
//matchData.fetchNewMatches(10000);

process.on('unhandledRejection', function(error) {
    console.error(error);
    process.exit(1);
});
