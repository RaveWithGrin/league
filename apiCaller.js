var riotRateLimiter = require('riot-ratelimiter');
var limiter = new riotRateLimiter();
var path = require('path');
var fileName = path.basename(__filename);
var request = require('request-promise');

module.exports = function(logger) {
    var callRiotAPI = async function(url, region = 'na1') {
        var baseURL = 'https://' + region + '.api.riotgames.com';
        var token = require('./config/token').token;
        logger('silly', fileName, 'callAPI', 'API url: ' + baseURL + url);
        try {
            var response = await limiter.executing({
                url: baseURL + url,
                token: token,
                resolveWithFullResponse: false
            });
            logger('silly', fileName, 'callAPI', 'API response: ' + response);
            return { data: response };
        } catch (error) {
            logger('error', fileName, 'callAPI', 'API error: ' + error.statusCode + ' - ' + JSON.parse(error.error).status.message + ' @ ' + error.options.url);
            return { error: error };
        }
    };

    var ddragonVersion = async function() {
        logger('silly', fileName, 'ddragonVersion', 'https://ddragon.leagueoflegends.com/api/versions.json');
        var response = await request.get('https://ddragon.leagueoflegends.com/api/versions.json');
        logger('silly', fileName, 'ddragonVersion', 'Response: ' + response);
        return JSON.parse(response)[0];
    };

    var callDdragon = async function(url) {
        var baseURL = 'http://ddragon.leagueoflegends.com/cdn/';
        var version = await ddragonVersion();
        var requestURL = baseURL + version + url;
        logger('silly', fileName, 'callDdragon', 'Ddragon url: ' + requestURL);
        var response = await request.get(requestURL);
        logger('silly', fileName, 'callDdragon', 'Ddragon response: ' + response);
        return { data: JSON.parse(response) };
    };

    var static = {
        champions: async function() {
            return await callRiotAPI('/lol/static-data/v3/champions');
        },
        items: async function() {
            return await callRiotAPI('/lol/static-data/v3/items');
        },
        masteries: async function() {
            return await callRiotAPI('/lol/static-data/v3/masteries');
        },
        profileIcons: async function() {
            return await callRiotAPI('/lol/static-data/v3/profile-icons');
        },
        runes: async function() {
            return await callRiotAPI('/lol/static-data/v3/reforged-runes');
        },
        summonerSpells: async function() {
            return await callRiotAPI('/lol/static-data/v3/summoner-spells');
        },
        versions: async function() {
            return await callRiotAPI('/lol/static-data/v3/versions');
        }
    };

    var newStatic = {
        champions: async function() {
            return await callDdragon('/data/en_US/champion.json');
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
        match: match,
        newStatic: newStatic
    };
};
