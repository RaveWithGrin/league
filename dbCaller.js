var database = require('./config/database');
var mysql = require('promise-mysql');

module.exports = function(logger) {
    var pool = mysql.createPool(database.connection);

    var runQuery = async function(sql, options) {
        try {
            var connection = await pool.getConnection();
            try {
                logger.silly(sql);
                var result = await connection.query(sql, options);
                logger.silly(JSON.stringify(result));
                return { data: result };
            } catch (error) {
                logger.error(JSON.stringify(error));
                return { error: error };
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error(JSON.stringify(error));
            return { error: error };
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
        skins: async function(skin) {
            return await runQuery('INSERT INTO skins SET ? ON DUPLICATE KEY UPDATE name = VALUES(name)', skin);
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
                for (var i = 0; i < summoners.length; i++) {
                    var summoner = summoners[i];
                    summoner.lastQueried = new Date();
                    update.summonerQueryTime(summoner);
                }
            }
            return result;
        },
        summonerByName: async function(usernames) {
            return await runQuery('SELECT * FROM summoner WHERE name IN [?]', usernames);
        },
        summonerByIds: async function(ids) {
            return await runQuery('SELECT * FROM summoner WHERE id IN (?) ORDER BY id ASC', [ids]);
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
        },
        championKeys: async function() {
            return await runQuery('SELECT `key` FROM champions WHERE id > 0;');
        },
        recentSummonerMatchIds: async function(summonerName, limit = 1) {
            return await runQuery(
                'SELECT ml.gameId FROM matchList ml JOIN summoner su ON su.id = ml.playerId WHERE su.name = ? order by ml.gameId DESC LIMIT ?',
                [summonerName, limit]
            );
        }
    };

    var transaction = {
        match: async function(match, gameId) {
            try {
                var connection = await pool.getConnection();
                await connection.beginTransaction();
                try {
                    var banPromises = [];
                    logger.debug('Inserting teams and bans for match matchId=[' + gameId + '] into DB');
                    for (var i = 0; i < match.teams.length; i++) {
                        var team = match.teams[i];
                        var teamResult = await connection.query('INSERT INTO teams SET ?', team);
                        var teamId = teamResult.insertId;
                        for (var j = 0; j < match.bans.length; j++) {
                            var ban = match.bans[j];
                            if (ban.teamId === team.teamId) {
                                ban.teamId = teamId;
                                banPromises.push(await connection.query('INSERT INTO bans SET ?', ban));
                            }
                        }
                    }
                    await Promise.all(banPromises);
                    logger.info('Teams and bans inserted for match matchId=[' + gameId + '] into DB');
                    var participantPromises = [];
                    logger.debug('Inserting participants and stats and timelines for match matchId=[' + gameId + '] into DB');
                    for (var i = 0; i < match.participants.length; i++) {
                        var participant = match.participants[i];
                        var statsResult = await connection.query('INSERT INTO participantStats SET ?', participant.stats);
                        var statsId = statsResult.insertId;
                        var timelineResult = await connection.query('INSERT INTO participantTimeline SET ?', participant.timeline);
                        var timelineId = timelineResult.insertId;
                        participant.statsId = statsId;
                        participant.timelineId = timelineId;
                        delete participant.stats;
                        delete participant.timeline;
                        participantPromises.push(await connection.query('INSERT INTO participants SET ?', participant));
                    }
                    await Promise.all(participantPromises);
                    logger.info('Participants + stats + timeline inserted for match matchId=[' + gameId + '] into DB');
                    logger.debug('Updating match matchId=[' + gameId + '] in DB');
                    await connection.query('UPDATE matches SET ? WHERE id = ?', [match.match, gameId]);
                    logger.info('Match matchId=[' + gameId + '] updated in DB');
                    connection.commit();
                    return { data: 'Done' };
                } catch (error) {
                    logger.error(error);
                    await connection.rollback();
                    return { error: error };
                } finally {
                    connection.release();
                }
            } catch (error) {
                logger.error(error);
                return { error: error };
            }
        }
    };

    return {
        insert: insert,
        update: update,
        select: select,
        transaction: transaction
    };
};
