var Promise = require('bluebird');
var path = require('path');

var fileName = path.basename(__filename);

module.exports = function (logger, api, db) {
    var mainPipeline = async function (summonerName) {
        var summonerResult = await api.summoner.byName(summonerName);
        if (summonerResult.data) {
            var summoner = summonerResult.data;
            summoner = JSON.parse(summoner);
            summoner.lastQueried = new Date();
            var response = await db.insert.summoner(summoner);
            if (!response.error) {
                api.summoner.championMasteries(summoner.id).then(async function (masteriesResponse) {
                    if (masteriesResponse.data) {
                        var rawMasteries = masteriesResponse.data;
                        var masteriesArray = JSON.parse(rawMasteries);
                        var masteriesPromises = [];
                        masteriesArray.forEach(function (championMastery) {
                            masteriesPromises.push(db.insert.championMasteries(championMastery));
                        });
                        await Promise.all(masteriesPromises);
                        logger('info', fileName, 'mainPipeline', 'Done inserting champion masteries');
                    } else {
                        logger('error', fileName, 'mainPipeline', 'Unable to get champion mastery from API');
                    }
                }, function (error) {
                    logger('error', fileName, 'mainPipeline', 'Unable to get champion mastery from API, shouldn\'t be here.');
                });
                api.summoner.leaguePosition(summoner.id).then(async function (leaguesResponse) {
                    if (leaguesResponse.data) {
                        var rawLeague = leaguesResponse.data;
                        var leaguesArray = JSON.parse(rawLeague);
                        var leaguePromises = [];
                        leaguesArray.forEach(function (league) {
                            leaguePromises.push(db.insert.leaguePosition(league));
                        });
                        await Promise.all(leaguePromises);
                        logger('info', fileName, 'mainPipeline', 'Done inserting league data');
                    } else {
                        logger('error', fileName, 'mainPipeline', 'Unable to get league data from API');
                    }
                }, function (error) {
                    logger('error', fileName, 'mainPipeline', 'Unable to get league data from API, shouldn\'t be here.');
                });
                api.summoner.matchList(summoner.accountId, 0).then(async function (matchListResponse) {
                    if (matchListResponse.data) {
                        var rawMatchList = matchListResponse.data;
                        var matchList = JSON.parse(rawMatchList).matches;
                        var totalGames = JSON.parse(rawMatchList).totalGames;
                        var endIndex = JSON.parse(rawMatchList).endIndex;
                        var matchListPromises = [];
                        matchList.forEach(function (match) {
                            match.playerId = summoner.id;
                            matchListPromises.push(db.insert.matchList(match));
                        });
                        await Promise.all(matchListPromises);
                        while (totalGames > endIndex) {
                            logger('debug', fileName, 'mainPipeline', 'Inserted ' + endIndex + '/' + totalGames + ' of matches into list');
                            var nextMatchListResponse = await api.summoner.matchList(summoner.accountId, endIndex + 1);
                            if (nextMatchListResponse.data) {
                                var nextMatchList = nextMatchListResponse.data;
                                matchList = JSON.parse(nextMatchList).matches;
                                totalGames = JSON.parse(nextMatchList).totalGames;
                                endIndex = JSON.parse(nextMatchList).endIndex;
                                matchListPromises = [];
                                matchList.forEach(function (match) {
                                    match.playerId = summoner.id;
                                    matchListPromises.push(db.insert.matchList(match));
                                });
                                await Promise.all(matchListPromises);
                            } else {
                                logger('error', fileName, 'mainPipeline', 'Unable to get next batch of matches from API');
                                endIndex = totalGames;
                            }
                        }
                        logger('info', fileName, 'mainPipeline', 'Done inserting matchlist');
                    }
                }, function (error) {
                    logger('error', fileName, 'mainPipeline', 'Unable to get match list from API, shouldn\'t be here.');
                });
            } else {
                logger('error', fileName, 'mainPipeline', 'Unable to insert summoner into DB');
            }
        } else {
            logger('error', fileName, 'mainPipeline', 'Unable to get summoner from API');
        }
    };

    return {
        mainPipeline: mainPipeline
    };
};