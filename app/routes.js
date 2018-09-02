var path = require('path');
var fileName = path.basename(__filename);

module.exports = function(app, logger, userData, matchData) {
    app.get('/', function(req, res) {
        res.render('index.ejs');
    });

    app.get('/profile', function(req, res) {
        res.render('profile.ejs');
    });

    app.get('/championmasteries', function(req, res) {
        res.render('masteries.ejs');
    });

    app.get('/matchlist', function(req, res) {
        res.render('matchlist.ejs');
    });

    app.get('/match', function(req, res) {
        res.render('match.ejs');
    });

    app.get('/stats', function(req, res) {
        res.render('stats.ejs');
    });

    app.get(/^(\/static\/.+)$/, function(req, res) {
        res.sendFile(path.join(__dirname, '../', req.params[0]));
    });

    app.get(/^(\/views\/.+)$/, function(req, res) {
        res.sendFile(path.join(__dirname, '../', req.params[0]));
    });

    app.get(/^(\/images\/.+)$/, function(req, res) {
        res.sendFile(path.join(__dirname, '../', req.params[0]));
    });

    app.ws('/summoner', function(ws, req) {
        ws.on('message', async function(msg) {
            var message = JSON.parse(msg);
            logger.debug(message);
        });
        ws.on('close', function() {
            console.log('WS was closed');
        });
    });
};
