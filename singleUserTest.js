var Promise = require('bluebird');

module.exports = function(logger, userData) {
    var pipeline = async function(summonerName) {
        var summoner = await userData.summoner.get(summonerName);
        if (summoner.data) {
            summoner = summoner.data;
            await userData.summoner.save(summoner);
            var masteries = await userData.championMasteries.get(summoner);
            await userData.championMasteries.save(masteries.data);
            var leagues = await userData.leaguePosition.get(summoner);
            await userData.leaguePosition.save(leagues.data);
            await userData.matchList.process(summoner, true);
            logger.info('Done getting all data for summonerName=[' + summonerName + ']');
        } else {
            logger.info('Unable to process summonerName=[' + summonerName + ']');
        }
    };

    return {
        pipeline: pipeline
    };
};
