var Promise = require('bluebird');
var path = require('path');

var fileName = path.basename(__filename);

module.exports = function (logger, api, db) {
    var get = {
        summoner: async function (name) {
            var summonerResult = await api.summoner.byName(name);
            if (summonerResult.error)
                return { error: summonerResult.error }
            else {
                var summoner = JSON.parse(summonerResult.data);
                var dbResult = await db.insert.summoner(summoner);
                if (dbResult.error)
                    return { error: dbResult.error };
                else
                    return { data: summoner };
            }
        },
        championMasteries: async function (summoner) {
            var masteriesResponse = await api.summoner.championMasteries(summoner.id);
            if (masteriesResponse.error)
                return { error: masteriesResponse.error };
            else {
                var masteriesArray = JSON.parse(masteriesResponse.data);
                var masteriesPromises = [];
                masteriesArray.forEach(function (mastery) {
                    masteriesPromises.push(db.insert.championMasteries(mastery));
                });
                await Promise.all(masteriesPromises);
                return { data: 'Done' };
            }
        },
        leaguePosition: async function (summoner) {
            var leagueResponse = await api.summoner.leaguePosition(summoner.id);
            if (leagueResponse.error)
                return { error: leagueResponse.error };
            else {
                var leaguesArray = JSON.parse(leagueResponse.data);
                var leaguesPromises = [];
                leaguesArray.forEach(function (league) {
                    leaguesPromises.push(db.insert.leaguePosition(league));
                });
                await Promise.all(leaguesPromises);
                return { data: 'Done' };
            }
        },
        matchList: async function (summoner, full = false) {
            var matchlistResponse = await api.summoner.matchList(summoner.accountId);
            if (matchlistResponse.error)
                return { error: matchlistResponse.error };
            else {
                var matchlistArray = JSON.parse(matchlistResponse.data).matches;
                var matchlistPromises = [];
                matchlistArray.forEach(function (match) {
                    match.playerId = summoner.id;
                    matchlistPromises.push(db.insert.matchList(match));
                });
                await Promise.all(matchlistArray);
                if (!full)
                    return { data: 'Done' };
                else {
                    var totalGames = JSON.parse(matchlistResponse.data).totalGames;
                    var endIndex = JSON.parse(matchlistResponse.data).endIndex;
                    while (totalGames > endIndex) {
                        matchlistResponse = await api.summoner.matchList(summoner.accountId, (endIndex + 1));
                        if (matchlistResponse.error)
                            return { error: matchlistResponse.error };
                        else {
                            matchlistArray = JSON.parse(matchlistResponse.data).matches;
                            matchlistPromises = [];
                            matchlistArray.forEach(function (match) {
                                match.playerId = summoner.id;
                                matchlistPromises.push(db.insert.matchList(match));
                            });
                            await Promise.all(matchlistPromises);
                            totalGames = JSON.parse(matchlistResponse.data).totalGames;
                            endIndex = JSON.parse(matchlistResponse.data).endIndex;
                        }
                    }
                    return { data: 'Done' };
                }
            }
        }
    };

    return {
        get: get
    };
};