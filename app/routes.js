var path = require('path');
var fileName = path.basename(__filename);

module.exports = function (app, logger, api, db) {
    app.get('/', function (req, res) {
        res.render('index.ejs');
    });

    app.get('/profile', async function (req, res) {
        logger('debug', fileName, 'getProfile', JSON.stringify(req.query));
        var summonerResult = await db.select.summoner(req.query.user);
        if (summonerResult.data) {
            res.render('profile.ejs', {summoner: summonerResult.data[0]});
        } else if (summonerResult.data.length > 0) {
            res.render('profile.ejs', {summoner: {id: 0, accountId: 0, name: 'Searching...', profileIconId: 0, revisionDate: 0, summonerLevel: 0, lastQueried: null}});
            userData.mainPipeline(req.query.user);
        } else {
            logger('error', fileName, 'getProfile', summonerResult.error);
            res.render('error.ejs');
        }
    });

    app.get(/^(\/static\/.+)$/, function (req, res) {
        res.sendFile(path.join(__dirname, '../', req.params[0]));
    });

    app.get(/^(\/views\/.+)$/, function (req, res) {
        res.sendFile(path.join(__dirname, '../', req.params[0]));
    });

    app.get(/^(\/images\/.+)$/, function (req, res) {
        res.sendFile(path.join(__dirname, '../', req.params[0]));
    });
};
