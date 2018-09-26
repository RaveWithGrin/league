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
        if (req.query.user) {
            var currentVersion = await staticData.getVersion();
            // If we can't get the summoner from the API, try and get it from the DB
            var summonerResult = await userData.summoner.get(req.query.user);
            if (summonerResult.error) {
                res.render('masteries.ejs', {
                    data: null
                });
            } else {
                var summoner = summonerResult.data;
                userData.summoner.save(summoner);
                // If we can't get champions from the API, try and get them from the DB
                var championResult = await staticData.getChampions();
                if (championResult.error) {
                    res.render('masteries.ejs');
                } else {
                    var champions = championResult.data;
                    // If we can't get summoner's champion masteries from API, try and get them from the DB
                    var masteriesResult = await userData.championMasteries.get(summoner);
                    if (masteriesResult.error) {
                        res.render('masteries.ejs');
                    } else {
                        var masteries = masteriesResult.data;
                        userData.championMasteries.save(masteries, summoner.name);
                        for (var i = 0; i < champions.length; i++) {
                            var champion = champions[i];
                            for (var j = 0; j < masteries.length; j++) {
                                var mastery = masteries[j];
                                if (parseInt(champion.id) === mastery.championId) {
                                    for (var key in mastery) {
                                        champion[key] = mastery[key];
                                    }
                                }
                            }
                        }
                        res.render('masteries.ejs', {
                            data: {
                                summoner: summoner,
                                champions: champions,
                                version: currentVersion
                            }
                        });
                    }
                }
            }
        } else {
            res.render('masteries.ejs', { data: null });
        }
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

    app.get('/getUserMasteries', async function(req, res) {
        if (req.query.user) {
            var currentVersion = await staticData.getVersion();
            var summonerResult = await userData.summoner.get(req.query.user);
            if (summonerResult.error) {
                res.send(JSON.stringify({ error: 'Unknown summoner' }));
            } else {
                var summoner = summonerResult.data;
                userData.summoner.save(summoner);
                var championResult = await staticData.getChampions();
                if (championResult.error) {
                    res.send(JSON.stringify({ error: 'Problem with the API' }));
                } else {
                    var champions = championResult.data;
                    var masteriesResult = await userData.championMasteries.get(summoner);
                    if (masteriesResult.error) {
                        res.send(JSON.stringify({ error: 'Problem with the API' }));
                    } else {
                        var masteries = masteriesResult.data;
                        userData.championMasteries.save(masteries, summoner.name);
                        for (var i = 0; i < champions.length; i++) {
                            var champion = champions[i];
                            for (var j = 0; j < masteries.length; j++) {
                                var mastery = masteries[j];
                                if (parseInt(champion.id) === mastery.championId) {
                                    for (var key in mastery) {
                                        champion[key] = mastery[key];
                                    }
                                }
                            }
                        }
                        res.send(
                            JSON.stringify({
                                data: {
                                    summoner: summoner,
                                    champions: champions,
                                    version: currentVersion
                                }
                            })
                        );
                    }
                }
            }
        } else {
            res.send(JSON.stringify({ error: 'Unknown summoner' }));
        }
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
