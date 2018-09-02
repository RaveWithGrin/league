var Promise = require('bluebird');

module.exports = function(logger, api, db) {
    var summoner = {
        get: async function(name) {
            logger.debug('Getting summoner summonerName=[' + name + '] from API');
            var summonerResult = await api.summoner.byName(name);
            if (summonerResult.error) {
                logger.error('Error getting summoner summonerName=[' + name + '] from API');
                return { error: summonerResult.error };
            } else {
                var summoner = JSON.parse(summonerResult.data);
                return { data: summoner };
            }
        },
        save: async function(summoner) {
            logger.debug('Inserting summoner summonerName=[' + summoner.name + '] into DB');
            var dbResult = await db.insert.summoner(summoner);
            if (dbResult.error) {
                logger.error('Error inserting summoner summonerName=[' + summoner.name + '] into DB');
                return { error: dbResult.error };
            } else {
                logger.info('Inserted summoner summonerName=[' + summoner.name + '] into DB');
                return { data: summoner };
            }
        }
    };
    var championMasteries = {
        get: async function(summoner) {
            logger.debug('Getting champion masteries for summonerName=[' + summoner.name + '] from API');
            var masteriesResponse = await api.summoner.championMasteries(summoner.id);
            if (masteriesResponse.error) {
                logger.error('Error getting champion masteries for summonerName=[' + summoner.name + '] from API');
                return { error: masteriesResponse.error };
            } else {
                var masteriesArray = JSON.parse(masteriesResponse.data);
                return { data: masteriesArray };
            }
        },
        save: async function(masteriesArray) {
            var masteriesPromises = [];
            logger.debug('Inserting champion masteries for summonerName=[' + summoner.name + '] into DB');
            for (var i = 0; i < masteriesArray.length; i++) {
                var mastery = masteriesArray[i];
                masteriesPromises.push(db.insert.championMasteries(mastery));
            }
            await Promise.all(masteriesPromises);
            logger.info('Done inserting champion masteries for summonerName=[' + summoner.name + '] into DB');
            return { data: 'Done' };
        }
    };
    var leaguePosition = {
        get: async function(summoner) {
            logger.debug('Getting league position for summonerName=[' + summoner.name + '] from API');
            var leagueResponse = await api.summoner.leaguePosition(summoner.id);
            if (leagueResponse.error) {
                logger.error('Error getting league position for summonerName=[' + summoner.name + '] from API');
                return { error: leagueResponse.error };
            } else {
                var leaguesArray = JSON.parse(leagueResponse.data);
                return { data: leaguesArray };
            }
        },
        save: async function(leaguesArray) {
            var leaguesPromises = [];
            logger.debug('Inserting league positions for summonerName=[' + summoner.name + '] into DB');
            for (var i = 0; i < leaguesArray; i++) {
                var league = leaguesArray[i];
                leaguesPromises.push(db.insert.leaguePosition(league));
            }
            await Promise.all(leaguesPromises);
            logger.info('Done inserting league positions for summonerName=[' + summoner.name + '] into DB');
            return { data: 'Done' };
        }
    };
    var matchList = {
        get: async function(summoner, full = false) {
            logger.debug('Getting most recent match for summonerName=[' + summoner.name + '] from DB');
            var recentMatch = await db.select.recentSummonerMatchIds(summoner.name);
            if (recentMatch.error) {
                logger.error('Error getting most recent gameId for summonerName=[' + summoner.name + '] from DB');
                recentMatch = 0;
            } else {
                recentMatch = recentMatch.data[0].gameId;
            }
            logger.debug('Getting match list for summonerName=[' + summoner.name + '] from API');
            var matchListArray = [];
            var matchlistResponse = await api.summoner.matchList(summoner.accountId);
            if (matchlistResponse.error) {
                logger.error('Error getting match list for summonerName=[' + summoner.name + '] from API');
                return { error: matchlistResponse.error };
            } else {
                var rawMatchlist = JSON.parse(matchlistResponse.data);
                var newGameFound = false;
                for (var i = 0; i < rawMatchlist.matches.length; i++) {
                    var match = rawMatchlist.matches[i];
                    if (match.gameId > recentMatch) {
                        matchListArray.push(match);
                        newGameFound = true;
                    }
                }
                logger.debug('Got [' + matchListArray.length + '] matches from API');
                var totalGames = rawMatchlist.totalGames;
                var endIndex = rawMatchlist.endIndex;
                if (!newGameFound) {
                    return { data: matchListArray };
                } else if (matchListArray.length < endIndex) {
                    return { data: matchListArray };
                } else if (!full) {
                    return { data: matchListArray };
                } else {
                    while (totalGames > endIndex) {
                        logger.debug('Getting more matches for summonerName=[' + summoner.name + '] from API');
                        matchlistResponse = await api.summoner.matchList(summoner.accountId, endIndex + 1);
                        if (matchlistResponse.error) {
                            logger.error('Error getting match list for summonerName=[' + summoner.name + '] from API');
                            return { error: matchlistResponse.error };
                        } else {
                            rawMatchlist = JSON.parse(matchlistResponse.data);
                            for (var i = 0; i < rawMatchlist.matches.length; i++) {
                                var match = rawMatchlist.matches[i];
                                if (match.gameId > recentMatch) {
                                    matchListArray.push(match);
                                    newGameFound = true;
                                }
                            }
                            logger.debug('Got [' + matchListArray.length + '] matches from API');
                            totalGames = rawMatchlist.totalGames;
                            endIndex = rawMatchlist.endIndex;
                            if (!newGameFound) {
                                totalGames = endIndex;
                            } else if (matchListArray.length < endIndex) {
                                totalGames = endIndex;
                            }
                        }
                    }
                    return { data: matchListArray };
                }
            }
        },
        save: async function(summoner, matchListArray) {
            var matchlistPromises = [];
            logger.debug('Inserting matches for summonerName=[' + summoner.name + '] into DB');
            for (var i = 0; i < matchListArray.length; i++) {
                var match = matchListArray[i];
                match.playerId = summoner.id;
                matchlistPromises.push(db.insert.matchList(match));
            }
            await Promise.all(matchlistPromises);
            logger.info('Done inserting all matches for summonerName=[' + summoner.name + '] into DB');
            return { data: 'Done' };
        },
        process: async function(summoner, full = false) {
            logger.debug('Getting match list for summonerName=[' + summoner.name + '] from API');
            var matchlistResponse = await api.summoner.matchList(summoner.accountId);
            if (matchlistResponse.error) {
                logger.error('Error getting match list for summonerName=[' + summoner.name + '] from API');
                return { error: matchlistResponse.error };
            } else {
                var matchlistArray = JSON.parse(matchlistResponse.data).matches;
                var matchlistPromises = [];
                logger.debug('Inserting matches for summonerName=[' + summoner.name + '] into DB');
                for (var i = 0; i < matchlistArray.length; i++) {
                    var match = matchlistArray[i];
                    match.playerId = summoner.id;
                    matchlistPromises.push(db.insert.matchList(match));
                }
                await Promise.all(matchlistArray);
                if (!full) {
                    logger.info('Done inserting recent matches for summonerName=[' + summoner.name + '] into DB');
                    return { data: 'Done' };
                } else {
                    var totalGames = JSON.parse(matchlistResponse.data).totalGames;
                    var endIndex = JSON.parse(matchlistResponse.data).endIndex;
                    while (totalGames > endIndex) {
                        logger.debug('Inserted [' + endIndex + '] / [' + totalGames + ']');
                        logger.debug('Getting more matches for summonerName=[' + summoner.name + '] from API');
                        matchlistResponse = await api.summoner.matchList(summoner.accountId, endIndex + 1);
                        if (matchlistResponse.error) {
                            logger.error('Error getting match list for summonerName=[' + summoner.name + '] from API');
                            return { error: matchlistResponse.error };
                        } else {
                            matchlistArray = JSON.parse(matchlistResponse.data).matches;
                            matchlistPromises = [];
                            logger.debug('Inserting matches for summonerName=[' + summoner.name + '] into DB');
                            for (var i = 0; i < matchlistArray.length; i++) {
                                var match = matchlistArray[i];
                                match.playerId = summoner.id;
                                matchlistPromises.push(db.insert.matchList(match));
                            }
                            await Promise.all(matchlistPromises);
                            logger.info('Done inserting more matches for summonerName=[' + summoner.name + '] into DB');
                            totalGames = JSON.parse(matchlistResponse.data).totalGames;
                            endIndex = JSON.parse(matchlistResponse.data).endIndex;
                        }
                    }
                    logger.info('Done inserting all matches for summonerName=[' + summoner.name + '] into DB');
                    return { data: 'Done' };
                }
            }
        }
    };

    return {
        summoner: summoner,
        championMasteries: championMasteries,
        leaguePosition: leaguePosition,
        matchList: matchList
    };
};
