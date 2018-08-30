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

            if (message.method) {
                switch (message.method) {
                    case 'get':
                        var summoner = await db.select.summoner(message.user);
                        if (summoner.error) {
                            ws.send(
                                JSON.stringify({
                                    error: summoner.error
                                })
                            );
                        } else if (summoner.data.length === 0) {
                            // New summoner
                            var summoner = await userData.get.summoner(message.user);
                            if (summoner.error)
                                ws.send(
                                    JSON.stringify({
                                        error: summoner.error
                                    })
                                );
                            else {
                                ws.send(
                                    JSON.stringify({
                                        summoner: summoner.data
                                    })
                                );
                            }
                        } else {
                            summoner = summoner.data[0];
                            // Existing summoner
                            ws.send(
                                JSON.stringify({
                                    summoner: summoner
                                })
                            );
                            db.select.championMasteries(summoner.id).then(function(championMasteries) {
                                if (championMasteries.error) {
                                    ws.send(
                                        JSON.stringify({
                                            error: championMasteries.error
                                        })
                                    );
                                } else {
                                    ws.send(
                                        JSON.stringify({
                                            masteries: championMasteries.data
                                        })
                                    );
                                }
                            });
                            db.select.summonerLeagues(summoner.id).then(function(leagues) {
                                if (leagues.error) {
                                    ws.send(
                                        JSON.stringify({
                                            error: championMasteries.error
                                        })
                                    );
                                } else {
                                    ws.send(
                                        JSON.stringify({
                                            leagues: leagues.data
                                        })
                                    );
                                }
                            });
                            db.select.matchlist(summoner.id).then(function(matchlist) {
                                if (matchlist.error) {
                                    ws.send(
                                        JSON.stringify({
                                            error: matchlist.error
                                        })
                                    );
                                } else {
                                    ws.send(
                                        JSON.stringify({
                                            matchlist: matchlist.data
                                        })
                                    );
                                }
                            });
                        }
                        break;
                    default:
                        break;
                }
            } else {
                ws.send(
                    JSON.stringify({
                        error: 'You should not have landed here'
                    })
                );
            }
        });
        ws.on('close', function() {
            console.log('WS was closed');
        });
    });
};
