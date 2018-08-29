var riotRateLimiter = require('riot-ratelimiter');
var limiter = new riotRateLimiter();
var path = require('path');
var fileName = path.basename(__filename);
var request = require('request-promise');

module.exports = function(logger) {
    var callRiotAPI = async function(url, region = 'na1') {
        var baseURL = 'https://' + region + '.api.riotgames.com';
        var token = require('./config/token').token;
        logger.silly(baseURL + url);
        try {
            var response = await limiter.executing({
                url: baseURL + url,
                token: token,
                resolveWithFullResponse: false
            });
            logger.silly(JSON.stringify(response));
            return { data: response };
        } catch (error) {
            logger.error(JSON.stringify(error));
            if (error.statusCode === 403) {
                logger.error('API token expired');
            }
            return { error: error };
        }
    };

    var ddragonVersion = async function() {
        logger.silly('https://ddragon.leagueoflegends.com/api/versions.json');
        var response = await request.get('https://ddragon.leagueoflegends.com/api/versions.json');
        logger.silly(JSON.stringify(response));
        return JSON.parse(response)[0];
    };

    var callDdragon = async function(url) {
        var baseURL = 'http://ddragon.leagueoflegends.com/cdn/';
        var version = await ddragonVersion();
        var requestURL = baseURL + version + '/data/en_US/' + url;
        logger.silly(requestURL);
        var response = await request.get(requestURL);
        logger.silly(JSON.stringify(response));
        return { data: JSON.parse(response) };
    };

    var static = {
        champions: async function() {
            return await callDdragon('champion.json');
        },
        items: async function() {
            return await callDdragon('item.json');
        },
        masteries: async function() {
            return await callDdragon('mastery.json');
        },
        profileIcons: async function() {
            return await callDdragon('profileicon.json');
        },
        runes: async function() {
            return await callDdragon('runesReforged.json');
        },
        summonerSpells: async function() {
            return await callDdragon('summoner.json');
        },
        skins: async function(champion) {
            return await callDdragon('champion/' + champion + '.json');
        }
    };

    var summoner = {
        byName: async function(summonerName) {
            return await callRiotAPI('/lol/summoner/v3/summoners/by-name/' + summonerName);
        },
        byAccountID: async function(accountID) {
            return await callRiotAPI('/lol/summoner/v3/summoners/by-account/' + accountID);
        },
        bySummonerID: async function(summonerID, region) {
            return await callRiotAPI('/lol/summoner/v3/summoners/' + summonerID, region);
        },
        matchList: async function(accountID, index = 0) {
            return await callRiotAPI('/lol/match/v3/matchlists/by-account/' + accountID + '?beginIndex=' + index);
        },
        championMasteries: async function(summonerID) {
            return await callRiotAPI('/lol/champion-mastery/v3/champion-masteries/by-summoner/' + summonerID);
        },
        leaguePosition: async function(summonerID) {
            return await callRiotAPI('/lol/league/v3/positions/by-summoner/' + summonerID);
        }
    };

    var match = {
        get: async function(game) {
            return await callRiotAPI('/lol/match/v3/matches/' + game.id, game.platformId);
        },
        timeline: async function(matchID) {
            return await callRiotAPI('/lol/match/v3/timelines/by-match/' + matchID);
        }
    };

    return {
        static: static,
        summoner: summoner,
        match: match
    };
};
