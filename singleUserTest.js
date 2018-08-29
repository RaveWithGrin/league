var Promise = require('bluebird');

module.exports = function(logger, userData) {
    var pipeline = async function(summonerName) {
        var summoner = await userData.get.summoner(summonerName);
        if (summoner.data) {
            summoner = summoner.data;
            await userData.get.championMasteries(summoner);
            await userData.get.leaguePosition(summoner);
            await userData.get.matchList(summoner, true);
            logger.info('Done getting all data for summonerName=[' + summonerName + ']');
        } else {
            logger.info('Unable to process summonerName=[' + summonerName + ']');
        }
    };

    return {
        pipeline: pipeline
    };
};
