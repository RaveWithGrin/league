import riotRateLimiter from 'riot-ratelimiter';
var limiter = new riotRateLimiter();
import { get as _get } from 'request-promise';

export default function(logger) {
    var currentVersion = null;

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
        if (!currentVersion) {
            logger.silly('https://ddragon.leagueoflegends.com/api/versions.json');
            var response = await _get('https://ddragon.leagueoflegends.com/api/versions.json');
            logger.silly(JSON.stringify(response));
            currentVersion = JSON.parse(response)[0];
        }
        return currentVersion;
    };

    var callDdragon = async function(url) {
        var baseURL = 'http://ddragon.leagueoflegends.com/cdn/';
        var version = await ddragonVersion();
        var requestURL = baseURL + version + '/data/en_US/' + url;
        logger.silly(requestURL);
        var response = await _get(requestURL);
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
        maps: async function() {
            return await callDdragon('map.json');
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
            return await callRiotAPI('/lol/summoner/v4/summoners/by-name/' + summonerName);
        },
        byAccountId: async function(accountId) {
            return await callRiotAPI('/lol/summoner/v4/summoners/by-account/' + accountId);
        },
        bySummonerId: async function(summonerId, region) {
            return await callRiotAPI('/lol/summoner/v4/summoners/' + summonerId, region);
        },
        matchList: async function(accountId, index = 0) {
            return await callRiotAPI('/lol/match/v4/matchlists/by-account/' + accountId + '?beginIndex=' + index);
        },
        championMasteries: async function(summonerId) {
            return await callRiotAPI('/lol/champion-mastery/v4/champion-masteries/by-summoner/' + summonerId);
        },
        leaguePosition: async function(summonerId) {
            return await callRiotAPI('/lol/league/v4/positions/by-summoner/' + summonerId);
        }
    };

    var match = {
        get: async function(game) {
            return await callRiotAPI('/lol/match/v4/matches/' + game.id, game.platformId);
        },
        timeline: async function(matchId) {
            return await callRiotAPI('/lol/match/v4/timelines/by-match/' + matchId);
        }
    };

    return {
        static: static,
        summoner: summoner,
        match: match,
        ddragonVersion: ddragonVersion
    };
}
