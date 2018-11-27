var database = require('./config/database');
var mysql = require('promise-mysql');

module.exports = function(logger) {
    var pool = mysql.createPool(database.connection);

    var runQuery = async function(sql, options) {
        try {
            var connection = await pool.getConnection();
            try {
                logger.silly(sql);
                logger.silly(options);
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
            if (!result.error) {
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
        },
        skins: async function(championId) {
            return await runQuery('SELECT * FROM skins' + (championId ? ' WHERE championId = ?' : ''), championId);
        },
        stats: async function(summonerName, championId) {
            return await runQuery(
                'SELECT mp.name AS `map`, qu.description AS `queue`, se.name AS `season`, FROM_UNIXTIME(FLOOR(ma.gameCreation/1000)) AS startDate, ma.gameDuration AS duration, ma.gameMode AS gameMode, ma.gameVersion AS `version`, ma.platformId AS `platform`, ps.win, ch.name AS championName, ch.id AS championID, ps.kills, ps.deaths, ps.assists, ps.doubleKills, ps.tripleKills, ps.quadraKills, ps.pentaKills, ps.unrealKills, ps.firstBloodAssist, ps.firstBloodKill, ps.killingSprees, ps.largestKillingSpree, ps.largestMultiKill, ps.firstInhibitorAssist, ps.firstInhibitorKill, ps.inhibitorKills, ps.firstTowerAssist, ps.firstTowerKill, ps.turretKills, ps.champLevel, ps.goldEarned, ps.goldSpent, ps.largestCriticalStrike, ps.longestTimeSpentLiving, ps.sightWardsBoughtInGame, ps.timeCCingOthers, ps.totalHeal, ps.totalTimeCrowdControlDealt, ps.totalUnitsHealed, ps.visionScore, ps.visionWardsBoughtInGame, ps.wardsKilled, ps.wardsPlaced, ps.damageDealtToObjectives, ps.damageDealtToTurrets, ps.damageSelfMitigated, ps.magicDamageDealt, ps.magicDamageDealtToChampions, ps.magicalDamageTaken, ps.physicalDamageDealt, ps.physicalDamageDealtToChampions, ps.physicalDamageTaken, ps.totalDamageDealt, ps.totalDamageDealtToChampions, ps.totalDamageTaken, ps.trueDamageDealt, ps.trueDamageDealtToChampions, ps.trueDamageTaken, ps.neutralMinionsKilled, ps.neutralMinionsKilledEnemyJungle, ps.neutralMinionsKilledTeamJungle, ps.totalMinionsKilled, it1.name as item1Name, it1.id as item1Id, it2.id AS item2Id, it2.name AS item2Name, it3.name as item3Name, it3.id as item3Id, it4.name as item4Name, it4.id as item4Id, it5.name as item5Name, it5.id as item5Id, it6.name as item6Name, it6.id as item6Id, it7.name AS trinketName, it7.id AS trinketId, ru0.name AS perk1, ru1.name AS perk2, ru2.name AS perk3, ru3.name AS perk4, ru4.name AS perk5, ru5.name AS perk6 FROM participantStats ps JOIN participants pa ON pa.statsId = ps.id  JOIN summoner su ON su.id = pa.summonerId  JOIN champions ch ON ch.id = pa.championId JOIN matches ma ON ma.id = pa.gameId JOIN maps mp ON mp.id = ma.mapId  JOIN queues qu ON qu.id = ma.queueId  JOIN seasons se ON se.id = ma.seasonId LEFT JOIN items it1 ON it1.id = ps.item0 LEFT JOIN items it2 ON it2.id = ps.item1 LEFT JOIN items it3 ON it3.id = ps.item2 LEFT JOIN items it4 ON it4.id = ps.item3 LEFT JOIN items it5 ON it5.id = ps.item4 LEFT JOIN items it6 ON it6.id = ps.item5 LEFT JOIN items it7 ON it7.id = ps.item6 LEFT JOIN runes ru0 ON ru0.id = ps.perk0 LEFT JOIN runes ru1 ON ru1.id = ps.perk1 LEFT JOIN runes ru2 ON ru2.id = ps.perk2 LEFT JOIN runes ru3 ON ru3.id = ps.perk3 LEFT JOIN runes ru4 ON ru4.id = ps.perk4 LEFT JOIN runes ru5 ON ru5.id = ps.perk5 WHERE su.name = ? AND ch.id = ?',
                [summonerName, championId]
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
                    logger.debug('Teams and bans inserted for match matchId=[' + gameId + '] into DB');
                    var participantPromises = [];
                    logger.debug('Inserting participants and stats and timelines for match matchId=[' + gameId + '] into DB');
                    for (var i = 0; i < match.participants.length; i++) {
                        var participant = match.participants[i];
                        logger.silly('INSERT INTO participantStats SET ?');
                        logger.silly(JSON.stringify(participant.stats));
                        var statsResult = await connection.query('INSERT INTO participantStats SET ?', participant.stats);
                        var statsId = statsResult.insertId;
                        if (Object.keys(participant.timeline).length !== 0) {
                            logger.silly('INSERT INTO participantTimeline SET ?');
                            logger.silly(JSON.stringify(participant.timeline));
                            var timelineResult = await connection.query('INSERT INTO participantTimeline SET ?', participant.timeline);
                            var timelineId = timelineResult.insertId;
                        }
                        participant.statsId = statsId;
                        participant.timelineId = timelineId;
                        delete participant.stats;
                        delete participant.timeline;
                        logger.silly('INSERT INTO participants SET ?');
                        logger.silly(JSON.stringify(participant));
                        participantPromises.push(await connection.query('INSERT INTO participants SET ?', participant));
                    }
                    await Promise.all(participantPromises);
                    logger.debug('Participants + stats + timeline inserted for match matchId=[' + gameId + '] into DB');
                    logger.debug('Updating match matchId=[' + gameId + '] in DB');
                    await connection.query('UPDATE matches SET ? WHERE id = ?', [match.match, gameId]);
                    logger.debug('Match matchId=[' + gameId + '] updated in DB');
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
