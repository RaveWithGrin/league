var riotRateLimiter = require('riot-ratelimiter');
var limiter = new riotRateLimiter();
var path = require('path');
var fileName = path.basename(__filename);

module.exports = function (logger) {
    var callAPI = async function (url) {
        var baseURL = 'https://na1.api.riotgames.com'
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

    var static = {
        champions: function () {
            return (callAPI('/lol/static-data/v3/champions'));
        },
        items: function () {
            return (callAPI('/lol/static-data/v3/items'));
        },
        masteries: function () {
            return (callAPI('/lol/static-data/v3/masteries'));
        },
        profileIcons: function () {
            return (callAPI('/lol/static-data/v3/profile-icons'));
        },
        runes: function () {
            return (callAPI('/lol/static-data/v3/reforged-runes'));
        },
        summonerSpells: function () {
            return (callAPI('/lol/static-data/v3/summoner-spells'));
        },
        versions: function () {
            return (callAPI('/lol/static-data/v3/versions'));
        }
    };

    var summoner = {
        byName: function (summonerName) {
            return (callAPI('/lol/summoner/v3/summoners/by-name/' + summonerName));
        },
        byAccountID: function (accountID) {
            return (callAPI('/lol/summoner/v3/summoners/by-account/' + accountID));
        },
        bySummonerID: function (summonerID) {
            return (callAPI('/lol/summoner/v3/summoners/' + summonerID));
        },
        matchList: function (accountID, index) {
            return (callAPI('/lol/match/v3/matchlists/by-account/' + accountID + '?beginIndex=' + index));
        },
        championMasteries: function (summonerID) {
            return (callAPI('/lol/champion-mastery/v3/champion-masteries/by-summoner/' + summonerID));
        },
        leaguePosition: function (summonerID) {
            return (callAPI('/lol/league/v3/positions/by-summoner/' + summonerID));
        }
    };

    var match = {
        get: function (matchID) {
            return (callAPI('/lol/match/v3/matches/' + matchID));
        },
        timeline: function (matchID) {
            return (callAPI('/lol/match/v3/timelines/by-match/' + matchID));
        }
    };

    return {
        static: static,
        summoner: summoner,
        match: match
    };
};