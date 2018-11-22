﻿var Promise = require('bluebird');

module.exports = function(logger, userData) {
    var pipeline = async function(summonerName) {
        var summoner = await userData.summoner.get(summonerName);
        if (summoner.error) {
            logger.info('Unable to process summonerName=[' + summonerName + ']');
        } else {
            summoner = summoner.data;
            await userData.summoner.save(summoner);
            var masteries = await userData.championMasteries.get(summoner);
            await userData.championMasteries.save(masteries.data, summoner.name);
            var leagues = await userData.leaguePosition.get(summoner);
            await userData.leaguePosition.save(summoner, leagues.data);
            var matchList = await userData.matchList.get(summoner, true);
            await userData.matchList.save(summoner, matchList.data);
            logger.info('Done getting all data for summonerName=[' + summonerName + ']');
        }
    };

    return {
        pipeline: pipeline
    };
};
