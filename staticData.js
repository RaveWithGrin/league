var Promise = require('bluebird');

module.exports = function(logger, api, db) {
    var getChampions = async function() {
        logger.debug('Getting champions from API');
        var championsResult = await api.static.champions();
        if (championsResult.error) {
            logger.error('Unable to get champions from API');
            return championsResult;
        } else {
            var rawChampions = championsResult.data.data;
            var champions = [];
            for (var key in rawChampions) {
                var champion = {
                    id: rawChampions[key].key,
                    key: rawChampions[key].id,
                    name: rawChampions[key].name,
                    title: rawChampions[key].title,
                    tag1: rawChampions[key].tags[0],
                    tag2: rawChampions[key].tags[1] ? rawChampions[key].tags[1] : ''
                };
                champions.push(champion);
            }
            logger.debug('Inserting champions into DB');
            var championPromises = [];
            for (var key in champions) {
                championPromises.push(db.insert.champions(champions[key]));
            }
            await Promise.all(championPromises);
            logger.info('Done inserting champions');
        }
    };

    var getItems = async function() {
        logger.debug('Getting items from API');
        var itemsResult = await api.static.items();
        if (itemsResult.error) {
            logger.error('Unable to get items from API');
        } else {
            var items = itemsResult.data.data;
            var itemPromises = [];
            logger.debug('Inserting items into DB');
            for (var key in items) {
                var item = {
                    id: key,
                    name: items[key].name,
                    description: items[key].description,
                    plaintext: items[key].plaintext
                };
                itemPromises.push(db.insert.items(item));
            }
            await Promise.all(itemPromises);
            logger.info('Done inserting items');
        }
    };

    var getMaps = async function() {
        logger.debug('Getting maps from API');
        var mapsResult = await api.static.maps();
        if (mapsResult.error) {
            logger.error('Unable to get maps from API');
        } else {
            var maps = mapsResult.data.data;
            var mapPromises = [];
            logger.debug('Inserting maps into DB');
            for (var key in maps) {
                var map = {
                    id: key,
                    name: maps[key].MapName
                };
                mapPromises.push(db.insert.maps(map));
            }
            await Promise.all(mapPromises);
            logger.info('Done inserting maps');
        }
    };

    var getRunes = async function() {
        logger.debug('Getting runes from DB');
        var runesResult = await api.static.runes();
        if (runesResult.error) {
            logger.error('Unable to get runes from API');
        } else {
            runesResult = runesResult.data;
            var runePromises = [];
            logger.debug('Inserting runes into DB');
            for (var i = 0; i < runesResult.length; i++) {
                var path = runesResult[i];
                for (var j = 0; j < path.slots.length; j++) {
                    var slot = path.slots[j];
                    for (var k = 0; k < slot.runes.length; k++) {
                        var rawRune = slot.runes[k];
                        var rune = {
                            id: rawRune.id,
                            key: rawRune.key,
                            name: rawRune.name,
                            shortDesc: rawRune.shortDesc,
                            longDesc: rawRune.longDesc,
                            icon: rawRune.icon,
                            runePathId: path.id,
                            runePathName: path.name
                        };
                        runePromises.push(db.insert.runes(rune));
                    }
                }
            }
            await Promise.all(runePromises);
            logger.info('Done inserting runes');
        }
    };

    var getSpells = async function() {
        logger.debug('Getting summoner spells from API');
        var spellsResult = await api.static.summonerSpells();
        if (spellsResult.error) {
            logger.error('Unable to get spells from API');
        } else {
            var spells = spellsResult.data.data;
            var spellPromises = [];
            logger.debug('Inserting summoner spells into DB');
            for (var key in spells) {
                var spell = {
                    id: spells[key].key,
                    name: spells[key].name,
                    description: spells[key].description,
                    summonerLevel: spells[key].summonerLevel,
                    key: spells[key].id
                };
                spellPromises.push(db.insert.summonerSpells(spell));
            }
            await Promise.all(spellPromises);
            logger.info('Done inserting spells');
        }
    };

    var getSkins = async function() {
        logger.debug('Getting champion keys from DB');
        var championKeys = await db.select.championKeys();
        var skinsPromises = [];
        logger.debug('Getting skins from API and inserting into DB');
        championKeys = championKeys.data;
        for (var i = 0; i < championKeys.length; i++) {
            var row = championKeys[i];
            var championResult = await api.static.skins(row.key);
            if (championResult.error) {
                logger.error('Unable to get champions from API');
            } else {
                var skins = championResult.data.data[row.key].skins;
                for (var key in skins) {
                    var skin = {
                        id: skins[key].id,
                        championId: championResult.data.data[row.key].key,
                        name: skins[key].name,
                        number: skins[key].num
                    };
                    skinsPromises.push(db.insert.skins(skin));
                }
            }
        }
        await Promise.all(skinsPromises);
        logger.info('Done inserting skins');
    };

    var getVersion = async function() {
        return await api.ddragonVersion();
    };

    var getAll = async function() {
        logger.info('Getting all static data');
        var staticDataPromises = [];
        staticDataPromises.push(getChampions());
        staticDataPromises.push(getItems());
        staticDataPromises.push(getMaps());
        staticDataPromises.push(getRunes());
        staticDataPromises.push(getSpells());
        staticDataPromises.push(getSkins());
        await Promise.all(staticDataPromises);
        logger.info('Done getting static data');
    };

    return {
        getChampions: getChampions,
        getItems: getItems,
        getMaps: getMaps,
        getRunes: getRunes,
        getSpells: getSpells,
        getSkins: getSkins,
        getVersion: getVersion,
        getAll: getAll
    };
};
