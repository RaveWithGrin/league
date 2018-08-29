var Promise = require('bluebird');

module.exports = function(logger, api, db) {
    var get = {
        summoner: async function(name) {
            logger.debug('Getting summoner summonerName=[' + name + '] from API');
            var summonerResult = await api.summoner.byName(name);
            if (summonerResult.error) {
                logger.error('Error getting summoner summonerName=[' + name + '] from API');
                return { error: summonerResult.error };
            } else {
                var summoner = JSON.parse(summonerResult.data);
                logger.debug('Inserting summoner summonerName=[' + name + '] into DB');
                var dbResult = await db.insert.summoner(summoner);
                if (dbResult.error) {
                    logger.error('Error inserting summoner summonerName=[' + name + '] into DB');
                    return { error: dbResult.error };
                } else {
                    logger.info('Inserted summoner summonerName=[' + name + '] into DB');
                    return { data: summoner };
                }
            }
        },
        championMasteries: async function(summoner) {
            logger.debug('Getting champion masteries for summonerName=[' + summoner.name + '] from API');
            var masteriesResponse = await api.summoner.championMasteries(summoner.id);
            if (masteriesResponse.error) {
                logger.error('Error getting champion masteries for summonerName=[' + summoner.name + '] from API');
                return { error: masteriesResponse.error };
            } else {
                var masteriesArray = JSON.parse(masteriesResponse.data);
                var masteriesPromises = [];
                logger.debug('Inserting champion masteries for summonerName=[' + summoner.name + '] into DB');
                masteriesArray.forEach(function(mastery) {
                    masteriesPromises.push(db.insert.championMasteries(mastery));
                });
                await Promise.all(masteriesPromises);
                logger.info('Done inserting champion masteries for summonerName=[' + summoner.name + '] into DB');
                return { data: 'Done' };
            }
        },
        leaguePosition: async function(summoner) {
            logger.debug('Getting league position for summonerName=[' + summoner.name + '] from API');
            var leagueResponse = await api.summoner.leaguePosition(summoner.id);
            if (leagueResponse.error) {
                logger.error('Error getting league position for summonerName=[' + summoner.name + '] from API');
                return { error: leagueResponse.error };
            } else {
                var leaguesArray = JSON.parse(leagueResponse.data);
                var leaguesPromises = [];
                logger.debug('Inserting league positions for summonerName=[' + summoner.name + '] into DB');
                leaguesArray.forEach(function(league) {
                    leaguesPromises.push(db.insert.leaguePosition(league));
                });
                await Promise.all(leaguesPromises);
                logger.info('Done inserting league positions for summonerName=[' + summoner.name + '] into DB');
                return { data: 'Done' };
            }
        },
        matchList: async function(summoner, full = false) {
            logger.debug('Getting match list for summonerName=[' + summoner.name + '] from API');
            var matchlistResponse = await api.summoner.matchList(summoner.accountId);
            if (matchlistResponse.error) {
                logger.error('Error getting match list for summonerName=[' + summoner.name + '] from API');
                return { error: matchlistResponse.error };
            } else {
                var matchlistArray = JSON.parse(matchlistResponse.data).matches;
                var matchlistPromises = [];
                logger.debug('Inserting matches for summonerName=[' + summoner.name + '] into DB');
                matchlistArray.forEach(function(match) {
                    match.playerId = summoner.id;
                    matchlistPromises.push(db.insert.matchList(match));
                });
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
                            matchlistArray.forEach(function(match) {
                                match.playerId = summoner.id;
                                matchlistPromises.push(db.insert.matchList(match));
                            });
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
        get: get
    };
};
