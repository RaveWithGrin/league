var path = require('path');
var fileName = path.basename(__filename);

module.exports = function (app, logger, api, db, userData) {
    app.get('/', function (req, res) {
        res.render('index.ejs');
    });

    app.get('/profile', async function (req, res) {
<<<<<<< HEAD
        if (!req.query)
            res.render('index.ejs');
        else if (!req.query.user)
            res.render('index.ejs');
        else
            res.render('profile.ejs');
=======
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
>>>>>>> ef95ca48b94331859f7e5b6d37a56c432e0e01ff
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
<<<<<<< HEAD

    app.ws('/summoner', function (ws, req) {
        ws.on('message', async function (msg) {
            var message = JSON.parse(msg);
            if (message.method) {
                switch (message.method) {
                    case 'get':
                        var summoner = await db.select.summoner(message.user);
                        if (summoner.error) {
                            ws.send(JSON.stringify({
                                error: summoner.error
                            }));
                        } else if (summoner.data.length === 0) {
                            // New summoner
                            var summoner = await userData.get.summoner(message.user);
                            if (summoner.error)
                                ws.send(JSON.stringify({
                                    error: summoner.error
                                }));
                            else {
                                ws.send(JSON.stringify({
                                    summoner: summoner.data
                                }));
                            }
                        } else {
                            summoner = summoner.data[0];
                            // Existing summoner
                            ws.send(JSON.stringify({
                                summoner: summoner
                            }));
                            db.select.championMasteries(summoner.id).then(function (championMasteries) {
                                if (championMasteries.error) {
                                    ws.send(JSON.stringify({
                                        error: championMasteries.error
                                    }));
                                } else {
                                    ws.send(JSON.stringify({
                                        masteries: championMasteries.data
                                    }));
                                }
                            });
                            db.select.summonerLeagues(summoner.id).then(function (leagues) {
                                if (leagues.error) {
                                    ws.send(JSON.stringify({
                                        error: championMasteries.error
                                    }));
                                } else {
                                    ws.send(JSON.stringify({
                                        leagues: leagues.data
                                    }));
                                }
                            });
                            db.select.matchlist(summoner.id).then(function (matchlist) {
                                if (matchlist.error) {
                                    ws.send(JSON.stringify({
                                        error: matchlist.error
                                    }));
                                } else {
                                    ws.send(JSON.stringify({
                                        matchlist: matchlist.data
                                    }));
                                }
                            });
                        }
                        break;
                    default:
                        break;
                }
            } else {
                ws.send(JSON.stringify({
                    error: 'You should not have landed here'
                }));
            }
        });
        ws.on('close', function () {
            console.log('WS was closed');
        });
    });
};
=======
};
>>>>>>> ef95ca48b94331859f7e5b6d37a56c432e0e01ff
