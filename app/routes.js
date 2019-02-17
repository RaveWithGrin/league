var path = require('path');

module.exports = function(app, logger, staticData, userData, matchData, db) {
    app.get('/', function(req, res) {
        res.render('index.ejs');
    });

    app.get('/profile', function(req, res) {
        res.render('profile.ejs');
    });

    app.get('/champion', async function(req, res) {
        var currentVersion = await staticData.getVersion();
        var championResult = await staticData.getChampions();
        if (championResult.error) {
            logger.error('Unable to get champions from API');
            res.render('champion.ejs', {
                data: null
            });
        } else {
            var champions = championResult.data;
            var champion =
                champions[
                    champions
                        .map(function(el) {
                            return el.key;
                        })
                        .indexOf(req.query.name)
                ];
            var skinsResult = await db.select.skins(champion.id);
            if (skinsResult.error) {
                logger.error('Unable to get skins from DB');
                res.render('champion.ejs', {
                    data: null
                });
            } else {
                var skins = skinsResult.data;
                var summonerResult = await userData.summoner.get(req.query.summoner);
                if (summonerResult.error) {
                    res.render('champions.ejs', {
                        data: null
                    });
                } else {
                    var summoner = summonerResult.data;
                    userData.summoner.save(summoner);
                    var stats = await db.select.stats(summoner.name, champion.id);
                    if (stats.error) {
                        res.render('champions.ejs', {
                            data: null
                        });
                    } else {
                        res.render('champions.ejs', {
                            data: {
                                version: currentVersion,
                                summoner: summoner,
                                champion: champion,
                                skins: skins,
                                stats: stats.data
                            }
                        });
                    }
                }
            }
        }
    });

    app.get('/championmasteries', async function(req, res) {
        res.render('masteries.ejs', { data: null });
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
            logger.info(JSON.stringify(message));
            ws.send(msg);
            var messageType = message.type;
            switch (messageType) {
                case 'championMasteries':
                    var summonerName = message.summonerName;
                    getUserMasteries(ws, summonerName);
                    break;
                default:
                    ws.send('Unknown message type [' + message.type + ']');
            }
        });
        ws.on('close', function() {
            console.log('WS was closed');
        });
    });

    app.ws('/champion', function(ws, req) {
        ws.on('message', async function(msg) {
            var message = JSON.parse(msg);
            logger.info(JSON.stringify(message));
            ws.send(msg);
            var messageType = message.type;
            switch (messageType) {
                case 'championGames':
                    var summonerName = message.summonerName;
                    var championName = message.championName;
                    getSummonerChampionGames(ws, summonerName, championName);
                    break;
                default:
                    ws.send('Unknown message type [' + message.type + ']');
            }
        });
        ws.on('close', function() {
            logger.debug('WS closed [' + ws + ']');
            console.log('WS closed');
        });
    });

    var getUserMasteries = async function(ws, summonerName) {
        var summonerResult = await userData.summoner.get(summonerName);
        if (summonerResult.error) {
            ws.send(
                JSON.stringify({
                    result: 'error',
                    type: 'championMasteries',
                    message: 'Error getting summoner from API',
                    data: summonerResult.error
                })
            );
        } else {
            var summoner = summonerResult.data;
            userData.summoner.save(summoner);
            var championResult = await staticData.getChampions();
            if (championResult.error) {
                ws.send(
                    JSON.stringify({
                        result: 'error',
                        type: 'championMasteries',
                        message: 'Error getting champions from API',
                        data: championResult.error
                    })
                );
            } else {
                var champions = championResult.data;
                var masteriesResult = await userData.championMasteries.get(summoner);
                if (masteriesResult.error) {
                    ws.send(
                        JSON.stringify({
                            result: 'error',
                            type: 'championMasteries',
                            message: 'Error getting champion masteries from API',
                            data: masteriesResult.error
                        })
                    );
                } else {
                    var masteries = masteriesResult.data;
                    userData.championMasteries.save(masteries, summoner.name);
                    for (var i = 0; i < champions.length; i++) {
                        var champion = champions[i];
                        for (var j = 0; j < masteries.length; j++) {
                            var mastery = masteries[j];
                            if (parseInt(champion.id) === mastery.championId) {
                                Object.assign(champion, mastery);
                            }
                        }
                    }
                    ws.send(
                        JSON.stringify({
                            result: 'success',
                            type: 'championMasteries',
                            data: champions
                        })
                    );
                }
            }
        }
    };

    var getSummonerChampionGames = async function(ws, summonerName, championName) {
        var summonerResult = await userData.summoner.get(summonerName);
        if (summonerResult.error) {
            ws.send(
                JSON.stringify({
                    result: 'error',
                    type: 'championGames',
                    message: 'Error getting summoner from API',
                    data: summonerResult.error
                })
            );
        } else {
            var summoner = summonerResult.data;
            userData.summoner.save(summoner);
            var championResult = await staticData.getChampions();
            if (championResult.error) {
                ws.send(
                    JSON.stringify({
                        result: 'error',
                        type: 'championGames',
                        message: 'Error getting champions from API',
                        data: championResult.error
                    })
                );
            } else {
                var champions = championResult.data;
                var champion =
                    champions[
                        champions
                            .map(function(el) {
                                return el.key;
                            })
                            .indexOf(championName)
                    ];
                var statsResult = await db.select.stats(summoner.name, champion.id);
                if (statsResult.error) {
                    ws.send(
                        JSON.stringify({
                            result: 'error',
                            type: 'championGames',
                            message: 'Error getting games from DB',
                            data: statsResult.error
                        })
                    );
                } else {
                    ws.send(
                        JSON.stringify({
                            result: 'success',
                            type: 'championGames',
                            data: statsResult.data
                        })
                    );
                }
            }
        }
    };
};
