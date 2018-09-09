var path = require('path');

module.exports = function(app, logger, staticData, userData, matchData) {
    app.get('/', function(req, res) {
        res.render('index.ejs');
    });

    app.get('/profile', function(req, res) {
        res.render('profile.ejs');
    });

    app.get('/championmasteries', async function(req, res) {
        if (req.query.user) {
            var summonerResult = await userData.summoner.get(req.query.user);
            if (summonerResult.data) {
                var summoner = summonerResult.data;
                userData.summoner.save(summoner);
                var championResult = await staticData.getChampions();
                if (championResult.data) {
                    var champions = championResult.data;
                    var masteriesResult = await userData.championMasteries.get(summoner);
                    if (masteriesResult.data) {
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
                                champions: champions
                            }
                        });
                    } else {
                        res.render('masteries.ejs');
                    }
                } else {
                    res.render('masteries.ejs');
                }
            } else {
                res.render('masteries.ejs');
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
            if (summonerResult.data) {
                var summoner = summonerResult.data;
                userData.summoner.save(summoner);
                var championResult = await staticData.getChampions();
                if (championResult.data) {
                    var champions = championResult.data;
                    var masteriesResult = await userData.championMasteries.get(summoner);
                    if (masteriesResult.data) {
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
                    } else {
                        res.send(JSON.stringify({ error: 'Problem with the API' }));
                    }
                } else {
                    res.send(JSON.stringify({ error: 'Problem with the API' }));
                }
            } else {
                res.send(JSON.stringify({ error: 'Unknown summoner' }));
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
