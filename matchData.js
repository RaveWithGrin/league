var Promise = require('bluebird');
var path = require('path');

var fileName = path.basename(__filename);

module.exports = function (logger, api, db) {
    var flattenObject = function (obj) {
        var toReturn = {};
        for (var i in obj) {
            if (!obj.hasOwnProperty(i)) continue;
            if ((typeof obj[i] === 'object') && (obj[i] !== null)) {
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

    var processMatchList = async function (limit = 1) {
        var newIds = (await db.select.newGames(limit)).data;
        logger('debug', fileName, 'processMatchList', 'Got ' + newIds.length + ' matches to insert');
        var matchPromises = [];
        newIds.forEach(async function (id) {
            matchPromises.push(getMatch(id.id));
        });
        await Promise.all(matchPromises);
        logger('info', fileName, 'processMatchList', 'Inserted ' + newIds.length + ' matches');
        if (newIds.length === limit) {
            setTimeout(function () {
                processMatchList(limit)
            }, 3000);
        } else {
            logger('info', fileName, 'processMatchList', 'Inserted all matches');
        }
    };

    var getMatch = async function (matchId) {
        return new Promise(async function (resolve, reject) {
            var matchResponse = await api.match.get(matchId);
            if (matchResponse.data) {
                var match = JSON.parse(matchResponse.data);
                var bans = [];
                bans.push(match.teams[0].bans);
                bans.push(match.teams[1].bans);
                delete match.teams[0].bans;
                delete match.teams[1].bans;
                match.teams.forEach(async function (team, index) {
                    team.gameId = matchId;
                    var teamResult = await db.insert.teams(team);
                    if (teamResult.data) {
                        var teamId = teamResult.data[0];
                        bans[index].forEach(async function (ban) {
                            ban.teamId = teamId;
                            if (ban.championId < 0)
                                ban.championId = 0;
                            var banResult = await db.insert.bans(ban);
                            if (banResult.error) {
                                logger('error', fileName, 'getMatch', 'Unable to insert ban into DB');
                            }
                        });
                    } else {
                        logger('error', fileName, 'getMatch', 'Unable to insert team into DB');
                    }
                });
                logger('info', fileName, 'getMatch', 'Teams + Bans inserted for ' + matchId);
                var summoners = {};
                for (var id in match.participantIdentities) {
                    if (match.participantIdentities[id].player.hasOwnProperty('summonerId')) {
                        var summonerResult = await api.summoner.bySummonerID(match.participantIdentities[id].player.summonerId);
                        if (summonerResult.data) {
                            var summoner = JSON.parse(summonerResult.data);
                            var summonerResult = await db.insert.summoner(summoner);
                            if (summonerResult.error) {
                                logger('error', fileName, 'getMatch', 'Unable to insert summoner into DB');
                            }
                            summoners[parseInt(id) + 1] = summoner.id;
                        }
                    } else {
                        summoners[parseInt(id) + 1] = 0;
                    }
                }
                logger('info', fileName, 'getMatch', 'Summoners inserted for ' + matchId);
                match.participants.forEach(async function (participant) {
                    var statsResponse = await db.insert.participantStats(participant.stats);
                    if (statsResponse.data) {
                        var statsId = statsResponse.data[0];
                        var timeline = flattenObject(participant.timeline);
                        var timelineResponse = await db.insert.participantTimeline(timeline);
                        if (timelineResponse.data) {
                            var timelineId = timelineResponse.data[0];
                            participant.gameId = matchId;
                            participant.timelineId = timelineId;
                            participant.statsId = statsId;
                            participant.summonerId = summoners[participant.participantId];
                            delete participant.stats;
                            delete participant.timeline;
                            delete participant.masteries;
                            delete participant.runes;
                            var participantResponse = await db.insert.participant(participant);
                            if (participantResponse.error) {
                                logger('error', fileName, 'getMatch', 'Unable to insert participant into DB');
                            }
                        } else {
                            logger('error', fileName, 'getMatch', 'Unable to insert participant timeline into DB');
                        }
                    } else {
                        logger('error', fileName, 'getMatch', 'Unable to insert participant stats into DB');
                    }
                });
                logger('info', fileName, 'getMatch', 'Done inserting participants for ' + matchId);
                delete match.gameId;
                delete match.teams;
                delete match.participants;
                delete match.participantIdentities;
                var matchResponse = await db.update.match(match, matchId);
                if (matchResponse.error) {
                    logger('error', fileName, 'getMatch', 'Unable to insert match into DB');
                }
                logger('info', fileName, 'getMatch', 'Finished: ' + matchId);
                resolve();
            } else {
                logger('error', fileName, 'getMatch', 'Unable to get match from API');
            }
        });
    };

    var fetchNewMatches = async function (limit = 1) {
        var summonerResponse = await db.select.unQueriedSummoner(limit);
        if (summonerResponse.data) {
            var unQueriedSummoners = summonerResponse.data;
            logger('debug', fileName, 'fetchNewMatches', 'Fetched ' + unQueriedSummoners.length + ' summoners to query');
            unQueriedSummoners.forEach(async function (summoner) {
                var matchListResponse = await api.summoner.matchList(summoner.accountId, 0);
                if (matchListResponse.data) {
                    var matchList = JSON.parse(matchListResponse.data).matches;
                    var matchListPromises = [];
                    matchList.forEach(async function (match) {
                        match.playerId = summoner.id;
                        matchListPromises.push(db.insert.matchList(match));
                    });
                    await Promise.all(matchListPromises);
                    logger('info', fileName, 'fetchNewMatches', 'Inserted ' + matchList.length + ' matches into the matchlist');
                } else {
                    logger('error', fileName, 'fetchNewMatches', 'Unable to get match list for summoner');
                }
            });
        } else {
            logger('error', fileName, 'fetchNewMatches', 'Unable to get unqueried summoners from DB');
        }
    };

    return {
        processMatchList: processMatchList,
        getMatch: getMatch,
        fetchNewMatches: fetchNewMatches
    };
};