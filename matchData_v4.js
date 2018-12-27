var Promise = require('bluebird');

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
        var newGames = await db.select.newGames(limit);
        if (newGames.error) {
            logger.error('Unable to get new games from DB');
        } else {
            newGames = newGames.data;
            logger.debug('Got [' + newGames.length + '] game(s) from DB');
            var matchPromises = [];
            for (var i = 0; i < newGames.length; i++) {
                var game = newGames[i];
                matchPromises.push(getMatch(game));
            }
            await Promise.all(matchPromises);
            logger.info('Inserted [' + newGames.length + '] into DB');
            if (newGames.length === limit) {
                logger.info('Waiting 5s');
                //setTimeout(function() {
                //    processMatchList(limit);
                //}, 5000);
            } else {
                logger.info('All games in DB processed');
            }
        }
    };

    var handleSummoners = async function(participantIdentities, gameId, platformId) {
        logger.debug('Parsing summoners for match matchId=[' + gameId + ']');
        var summonerIds = [];
        var summoners = {};
        for (var id in participantIdentities) {
            summoners[parseInt(id) + 1] = 0;
            if (participantIdentities[id].player.hasOwnProperty('summonerId')) {
                summonerIds.push(participantIdentities[id].player.summonerId);
            }
        }
        logger.debug('Getting known summoners from DB for match matchId=[' + gameId + '] from DB');
        var foundSummoners = await db.select.summonerByIds(summonerIds);
        if (foundSummoners.error) {
            logger.error('Unable to get known summoners from DB for match matchId=[' + gameId + '] from DB');
        } else {
            for (var i = 0; i < foundSummoners.data.length; i++) {
                var foundSummoner = foundSummoners.data[i];
                var index = summonerIds.indexOf(foundSummoner.id);
                summoners[index + 1] = foundSummoner.id;
                summonerIds[index] = null;
            }
        }
        for (var i = 0; i < summonerIds.length; i++) {
            if (summonerIds[i] === null) {
                summonerIds.splice(i, 1);
                i--;
            }
        }
        var summonerPromises = [];
        for (var i = 0; i < summonerIds.length; i++) {
            var summonerId = summonerIds[i];
            logger.debug('Getting summoner summonerId=[' + summonerId + '] for matchId=[' + gameId + '] from API');
            var summonerResult = await api.summoner.bySummonerId(summonerId, platformId);
            if (summonerResult.error) {
                logger.error('Unable to get summoner summonerId=[' + summonerId + '] for matchId=[' + gameId + '] from API');
            } else {
                var summoner = JSON.parse(summonerResult.data);
                logger.debug('Inserting summoner summonerId=[' + summonerId + '] for matchId=[' + gameId + '] into DB');
                summonerPromises.push(db.insert.summoner(summoner));
            }
        }
        await Promise.all(summonerPromises);
        logger.debug('Done inserting match summoners');
        return summoners;
    };

    var handleTeams = async function(teams, gameId) {
        logger.debug('Parsing teams and bans for match matchId=[' + gameId + ']');
        var bans = [];
        for (var i = 0; i < teams.length; i++) {
            var team = teams[i];
            team.gameId = gameId;
            for (var j = 0; j < team.bans.length; j++) {
                var ban = team.bans[j];
                ban.teamId = team.teamId;
                bans.push(ban);
            }
            delete team.bans;
        }
        return { teams: teams, bans: bans };
    };

    var handleParticipants = async function(participants, summoners, gameId) {
        logger.debug('Parsing participants for match matchId=[' + gameId + ']');
        for (var i = 0; i < participants.length; i++) {
            var participant = participants[i];
            participant.timeline = flattenObject(participant.timeline);
            participant.gameId = gameId;
            participant.summonerId = summoners[participant.participantId];
            delete participant.masteries;
            delete participant.runes;
        }
        return participants;
    };

    var getMatch = async function(game) {
        logger.debug('Getting match matchId=[' + game.id + '] from API');
        var matchResponse = await api.match.get(game);
        if (matchResponse.error) {
            logger.error('Unable to get match matchId=[' + game.id + '] from API');
        } else {
            var match = JSON.parse(matchResponse.data);
            var summoners = await handleSummoners(match.participantIdentities, game.id, game.platformId);
            var matchData = await handleTeams(match.teams, game.id);
            matchData.participants = await handleParticipants(match.participants, summoners, game.id);
            delete match.gameId;
            delete match.teams;
            delete match.participants;
            delete match.participantIdentities;
            matchData.match = match;
            logger.debug('Sending match matchId=[' + game.id + '] to DB');
            var result = await db.transaction.match(matchData, game.id);
            if (result.error) {
                logger.error('Unable to insert match matchId=[' + game.id + '] into DB');
            } else {
                logger.info('Match matchId=[' + game.id + '] inserted into DB');
            }
        }
    };

    var fetchNewMatches = async function(limit = 1) {
        logger.debug('Getting un-fetched summoner(s) from DB');
        var summonerResponse = await db.select.unQueriedSummoner(limit);
        if (summonerResponse.error) {
            logger.error('Unable to get un-fetched summoner(s) from DB');
        } else {
            var unQueriedSummoners = summonerResponse.data;
            logger.debug('Got [' + unQueriedSummoners.length + '] to fetch from DB');
            for (var i = 0; i < unQueriedSummoners.length; i++) {
                var summoner = unQueriedSummoners[i];
                logger.debug('Getting matchlist for summonerName=[' + summoner.name + '] from API');
                var matchListResponse = await api.summoner.matchList(summoner.accountId, 0);
                if (matchListResponse.error) {
                    logger.error('Unable to get matchlist for summonerName=[' + summoner.name + '] from API');
                } else {
                    var matchList = JSON.parse(matchListResponse.data).matches;
                    var matchListPromises = [];
                    for (var j = 0; j < matchList.length; j++) {
                        var match = matchList[j];
                        match.playerId = summoner.id;
                        logger.debug('Getting match matchId=[' + match + '] for summoner summonerName=[' + summoner.name + ']');
                        matchListPromises.push(db.insert.matchList(match));
                    }
                    await Promise.all(matchListPromises);
                    logger.info('Inserted [' + matchList.length + '] matches for summoner summonerName=[' + summoner.name + '] into DB');
                }
            }
        }
    };

    return {
        processMatchList: processMatchList,
        getMatch: getMatch,
        fetchNewMatches: fetchNewMatches
    };
};
