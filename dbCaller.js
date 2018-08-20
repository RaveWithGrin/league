var database = require('./config/database');
var mysql = require('promise-mysql');
var path = require('path');
var fileName = path.basename(__filename);

module.exports = function(logger) {
    var pool = mysql.createPool(database.connection);

    var runQuery = async function(sql, options) {
        var connection = await pool.getConnection();
        try {
            logger('silly', fileName, 'runQuery', 'DB Query: ' + sql);
            var result = await connection.query(sql, options);
            logger('silly', fileName, 'runQuery', 'DB result: ' + JSON.stringify(result));
            return { data: result };
        } catch (error) {
            logger('error', fileName, 'runQuery', 'DB error: [' + error.code + '] - ' + error.sqlMessage);
            console.log(JSON.stringify(error, null, 2));
            return { error: error };
        } finally {
            connection.release();
        }
    };

    var insert = {
        summoner: async function(summoner) {
            return await runQuery(
                'INSERT INTO summoner SET ? ON DUPLICATE KEY UPDATE name = VALUES(name), profileIconId = VALUES(profileIconId), revisionDate = VALUES(revisionDate), summonerLevel = VALUES(summonerLevel), lastQueried = VALUES(lastQueried)',
                summoner
            );
        },
        champions: async function(champion) {
            return await runQuery(
                'INSERT INTO champions SET ? ON DUPLICATE KEY UPDATE title = VALUES(title), tag1 = VALUES(tag1), tag2 = VALUES(tag2)',
                champion
            );
        },
        items: async function(item) {
            return await runQuery('INSERT INTO items SET ? ON DUPLICATE KEY UPDATE description = VALUES(description), plaintext = VALUES(plaintext)', item);
        },
        masteries: async function(mastery) {
            return await runQuery('INSERT INTO masteries SET ? ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)', mastery);
        },
        runes: async function(rune) {
            return await runQuery(
                'INSERT INTO runes SET ? ON DUPLICATE KEY UPDATE shortDesc = VALUES(shortDesc), longDesc = VALUES(longDesc), `key` = VALUES(`key`), name = VALUES(name), icon = VALUES(icon), runePathId = VALUES(runePathId), runePathName = VALUES(runePathName)',
                rune
            );
        },
        summonerSpells: async function(spell) {
            return await runQuery(
                'INSERT INTO summonerSpells SET ? ON DUPLICATE KEY UPDATE `key` = VALUES(`key`), name = VALUES(name), description = VALUES(description), summonerLevel = VALUES(summonerLevel)',
                spell
            );
        },
        championMasteries: async function(mastery) {
            return await runQuery(
                'INSERT INTO championMasteries SET ? ON DUPLICATE KEY UPDATE championLevel = VALUES(championLevel), championPoints = VALUES(championPoints), lastPlayTime = VALUES(lastPlayTime), championPointsSinceLastLevel = VALUES(championPointsSinceLastLevel), championPointsUntilNextLevel = VALUES(championPointsUntilNextLevel), chestGranted = VALUES(chestGranted), tokensEarned = VALUES(tokensEarned)',
                mastery
            );
        },
        leaguePosition: async function(league) {
            return await runQuery(
                'INSERT INTO leaguePosition SET ? ON DUPLICATE KEY UPDATE leagueId = VALUES(leagueId), leagueName = VALUES(leagueName), tier = VALUES(tier), rank = VALUES(rank), playerOrTeamName = VALUES(playerOrTeamName), leaguePoints = VALUES(leaguePoints), wins = VALUES(wins), losses = VALUES(losses), veteran = VALUES(veteran), inactive = VALUES(inactive), freshBlood = VALUES(freshBlood), hotStreak = VALUES(hotStreak)',
                league
            );
        },
        matchList: async function(match) {
            await runQuery('INSERT INTO matches (id, platformId) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = VALUES(id)', [match.gameId, match.platformId]);
            return await runQuery('INSERT INTO matchList SET ? ON DUPLICATE KEY UPDATE timestamp = VALUES(timestamp)', match);
        },
        teams: async function(team) {
            return await runQuery('INSERT INTO teams SET ?', team);
        },
        bans: async function(bans) {
            return await runQuery('INSERT INTO bans SET ?', bans);
        },
        participantStats: async function(stats) {
            return await runQuery('INSERT INTO participantStats SET ?', stats);
        },
        participantTimeline: async function(timeline) {
            return await runQuery('INSERT INTO participantTimeline SET ?', timeline);
        },
        participant: async function(participant) {
            return await runQuery('INSERT INTO participants SET ?', participant);
        }
    };

    var update = {
        match: async function(match, id) {
            return await runQuery('UPDATE matches SET ? WHERE id = ?', [match, id]);
        },
        summonerQueryTime: async function(summoner) {
            return await runQuery('UPDATE summoner SET lastQueried = ? WHERE id = ?', [summoner.lastQueried, summoner.id]);
        }
    };

    var select = {
        newGames: async function(limit) {
            return await runQuery('SELECT id, platformId FROM matches WHERE gameCreation IS NULL ORDER BY id DESC LIMIT ?', [limit]);
        },
        unQueriedSummoner: async function(limit) {
            var result = await runQuery('SELECT * FROM summoner WHERE lastQueried IS NULL ORDER BY revisionDate DESC LIMIT ?', [limit]);
            if (result.data) {
                summoners = result.data;
                summoners.forEach(function(summoner) {
                    summoner.lastQueried = new Date();
                    update.summonerQueryTime(summoner);
                });
            }
            return result;
        },
        summoner: async function(username) {
            return await runQuery('SELECT * FROM summoner WHERE name = ?', username);
        },
        championMasteries: async function(summonerId) {
            return await runQuery(
                'SELECT ch.name, cm.championLevel, cm.championPoints, cm.lastPlayTime, cm.championPointsSinceLastLevel, cm.championPointsUntilNextLevel, cm.chestGranted, cm.tokensEarned FROM championMasteries cm JOIN champions ch ON ch.id = cm.championId WHERE cm.playerId = ? ORDER BY cm.championPoints DESC',
                summonerId
            );
        },
        summonerLeagues: async function(summonerId) {
            return await runQuery('SELECT * FROM leaguePosition WHERE playerOrTeamId = ?', summonerId);
        },
        matchlist: async function(summonerId) {
            return await runQuery(
                'SELECT ml.gameId, ch.name, qu.map, qu.description, se.name, ml.role, ml.lane, ml.timestamp, ma.gameDuration FROM champions ch JOIN matchList ml ON ml.champion = ch.id JOIN queues qu ON qu.id = ml.queue JOIN seasons se ON se.id = ml.season JOIN matches ma ON ma.id = ml.gameId WHERE ml.playerId = ? ORDER BY ml.timestamp DESC;',
                summonerId
            );
        }
    };
    return {
        insert: insert,
        update: update,
        select: select
    };
};
