import Promise from 'bluebird';

export default function(logger, userData) {
    var pipeline = async function(summonerName) {
        var summoner = await userData.summoner.get(summonerName);
        if (summoner.error) {
            logger.error('Unable to process summonerName=[' + summonerName + ']');
        } else {
            summoner = summoner.data;
            await userData.summoner.save(summoner);
            var masteries = await userData.championMasteries.get(summoner);
            if (masteries.error) {
                logger.error('Unable to fetch champion masteries for summonerName=[' + summonerName + ']');
            } else {
                masteries = masteries.data;
                await userData.championMasteries.save(masteries, summoner.name);
                var leagues = await userData.leaguePosition.get(summoner);
                if (leagues.error) {
                    logger.error('Unable to fetch league position for summonerName=[' + summonerName + ']');
                } else {
                    leagues = leagues.data;
                    await userData.leaguePosition.save(summoner, leagues);
                    var matchList = await userData.matchList.get(summoner, true);
                    if (matchList.error) {
                        logger.error('Unable to fetch matchlist for summonerName=[' + summonerName + ']');
                    } else {
                        matchList = matchList.data;
                        await userData.matchList.save(summoner, matchList);
                        logger.info('Done getting all data for summonerName=[' + summonerName + ']');
                    }
                }
            }
        }
    };

    return {
        pipeline: pipeline
    };
}
