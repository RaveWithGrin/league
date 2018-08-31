var Promise = require('bluebird');
var path = require('path');

var fileName = path.basename(__filename);

module.exports = function(logger, api, db) {
    var flattenObject = function(obj) {
        var toReturn = {};
        for (var i in obj) {
            if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] === 'object' && obj[i] !== null) {
                var flatObject = flattenObject(obj[i]);
                for (var x in flatObject) {
                    if (!flatObject.hasOwnProperty(x)) continue;
                    toReturn[i + '' + x] = flatObject[x];
                }
            } else {
                toReturn[i] = obj[i];
            }
        }
        return toReturn;
    };

    var processMatchList = async function(limit = 1) {
        logger.info('Getting non-processed matches from DB');
        logger.debug('Getting [' + limit + '] game(s) from DB');
        var newGames = (await db.select.newGames(limit)).data;
        logger.debug('Got [' + newGames.length + '] game(s) from DB');
        var matchPromises = [];
        newGames.forEach(async function(game) {
            matchPromises.push(getMatch(game));
        });
        await Promise.all(matchPromises);
        logger.info('Inserted [' + newGames.length + '] into DB');
        if (newGames.length === limit) {
            setTimeout(function() {
                processMatchList(limit);
            }, 10000);
        } else {
            logger.info('All games in DB processed');
        }
    };

    var newgetMatch = async function(game){
        logger.debug('Getting match matchID=[' + game.id + '] from API');
        var matchResponse = await api.match.get(game);
        if (matchResponse.data){
            var match = JSON.parse(matchResponse.data);
            var summonerIds = [];
            for (var id in match.participantIdentities){
                if (match.participantIdentities[id].player.hasOwnProperty('summonerId')){
                    summonerIds.push(match.participantIdentities[id].player.summonerId);
                }
            }
            var foundSummoners = await db.select.summonerByIds(summonerIds);
            var summoners = {};
            if (foundSummoners.data){
                foundSummoners.data.forEach(function(foundSummoner){
                    var index = summonerIds.indexOf(foundSummoner.id);
                    if (index !== -1){
                        summoners[parseInt(id) + 1] = foundSummoner.id;
                        summonerIds.splice(index, 1);
                    }
                });
            } else {
                logger.error('Unable to get known summoners from DB for match matchID=[' + game.id + '] from DB');
            }
            summonerIds.forEach(async function(summonerId){
                var summonerPromises = [];
                var summonerResult = await api.summoner.bySummonerID(summonerId, game.platformId);
                if (summonerResult.data){
                    var summoner = JSON.parse(summonerResult.data);
                    summonerPromises.push(await db.insert.summoner(summoner));
                } else {
                    logger.error('Unable to get summoner summonerID=[' + summonerID + '] for matchID=[' + game.id + '] from API');
                }
                await Promise.all(summonerPromises);
                logger.info('Inserted participant summoners for match matchID=[' + game.id + '] into DB');
            });
        } else {
            logger.error('Unable to get match matchID=[' + game.id + '] from API');
        }
    };


    var getMatch = async function(game) {
        logger.debug('Getting match matchID=[' + game.id + '] from API');
        var matchResponse = await api.match.get(game);
        if (matchResponse.data) {
            var match = JSON.parse(matchResponse.data);
            var bans = [];
            bans.push(match.teams[0].bans);
            bans.push(match.teams[1].bans);
            delete match.teams[0].bans;
            delete match.teams[1].bans;
            logger.debug('Inserting teams for matchID=[' + game.id + '] into DB');
            match.teams.forEach(async function(team, index) {
                team.gameId = game.id;
                var teamResult = await db.insert.teams(team);
                if (teamResult.data) {
                    var teamId = teamResult.data.insertId;
                    logger.debug('Inserting bans for matchID=[' + game.id + '] into DB');
                    bans[index].forEach(async function(ban) {
                        ban.teamId = teamId;
                        if (ban.championId < 0) {
                            ban.championId = 0;
                        }
                        var banResult = await db.insert.bans(ban);
                        if (banResult.error) {
                            logger.error('Unable to insert bans for matchID=[' + game.id + '] into DB');
                        }
                    });
                } else {
                    logger('error', fileName, 'getMatch', 'Unable to insert team into DB');
                }
            });
            logger.info('Teams (+ Bans) inserted for matchID=[' + game.id + '] into DB');
            var summoners = {};
            for (var id in match.participantIdentities) {
                if (match.participantIdentities[id].player.hasOwnProperty('summonerId')) {
                    var summonerID = match.participantIdentities[id].player.summonerId;
                    logger.debug('Getting summoner summonerID=[' + summonerID + '] for matchID=[' + game.id + '] from API');
                    var summonerResult = await api.summoner.bySummonerID(summonerID, game.platformId);
                    if (summonerResult.data) {
                        var summoner = JSON.parse(summonerResult.data);
                        logger.debug('Inserting summoner summonerID=[' + summonerID + '] for matchID=[' + game.id + '] into DB');
                        var summonerResult = await db.insert.summoner(summoner);
                        if (summonerResult.error) {
                            logger.error('Unable to insert summoner summonerID=[' + summonerID + '] for matchID=[' + game.id + '] into DB');
                        }
                        summoners[parseInt(id) + 1] = summoner.id;
                    } else {
                        logger.error('Unable to get summoner summonerID=[' + summonerID + '] for matchID=[' + game.id + '] from API');
                    }
                } else {
                    summoners[parseInt(id) + 1] = 0;
                }
            }
            logger.info('Participant summoners inserted for matchID=[' + game.id + '] into DB');
            logger.debug('Inserting participants + stats + timeline for matchID=[' + game.id + ']');
            match.participants.forEach(async function(participant) {
                var statsId = 0;
                var timelineId = 0;
                var statsResponse = await db.insert.participantStats(participant.stats);
                if (statsResponse.data) {
                    var statsId = statsResponse.data.insertId;
                } else {
                    logger.error('Unable to insert participant stats for matchID=[' + game.id + '] into DB');
                }
                var timeline = flattenObject(participant.timeline);
                var timelineResponse = await db.insert.participantTimeline(timeline);
                if (timelineResponse.data) {
                    var timelineId = timelineResponse.data.insertId;
                } else {
                    logger.error('Unable to insert participant timeline for matchID=[' + game.id + '] into DB');
                }
                participant.gameId = game.id;
                participant.timelineId = timelineId;
                participant.statsId = statsId;
                participant.summonerId = summoners[participant.participantId];
                delete participant.stats;
                delete participant.timeline;
                delete participant.masteries;
                delete participant.runes;
                var participantResponse = await db.insert.participant(participant);
                if (participantResponse.error) {
                    logger.error('Unable to insert participant for matchID=[' + game.id + '] into DB');
                }
            });
            logger.info('Participants + stats + timelines inserted for matchID=[' + game.id + '] into DB');
            delete match.gameId;
            delete match.teams;
            delete match.participants;
            delete match.participantIdentities;
            logger.debug('Updating match matchID=[' + game.id + '] in DB');
            var matchResponse = await db.update.match(match, game.id);
            if (matchResponse.error) {
                logger.error('Unable to update match matchID=[' + game.id + '] in DB');
            }
            logger.info('Match matchID=[' + game.id + '] finished processing');
        } else {
            logger.error('Error getting match matchID=[' + game.id + '] from API');
        }
    };

    var fetchNewMatches = async function(limit = 1) {
        logger.debug('Getting un-fetched summoner(s) from DB');
        var summonerResponse = await db.select.unQueriedSummoner(limit);
        if (summonerResponse.data) {
            var unQueriedSummoners = summonerResponse.data;
            logger.debug('Got [' + unQueriedSummoners.length + '] to fetch from DB');
            unQueriedSummoners.forEach(async function(summoner) {
                logger.debug('Getting matchlist for summonerName=[' + summoner.name + '] from API');
                var matchListResponse = await api.summoner.matchList(summoner.accountId,  0);
                if (matchListResponse.data) {
                    var matchList = JSON.parse(matchListResponse.data).matches;
                    var matchListPromises = [];
                    matchList.forEach(async function(match) {
                        match.playerId = summoner.id;
                        logger.debug('Getting match matchID=[' + match + '] for summoner summonerName=[' + summoner.name + ']');
                        matchListPromises.push(db.insert.matchList(match));
                    });
                    await Promise.all(matchListPromises);
                    logger.info('Inserted [' + matchList.length + '] matches for summoner summonerName=[' + summoner.name + '] into DB');
                } else {
                    logger.error('Unable to get matchlist for summonerName=[' + summoner.name + '] from API');
                }
            });
        } else {
            logger.error('Unable to get un-fetched summoner(s) from DB');
        }
    };

    return {
        processMatchList: processMatchList,
        getMatch: getMatch,
        fetchNewMatches: fetchNewMatches,
        newgetMatch: newgetMatch
    };
};
