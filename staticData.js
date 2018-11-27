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
                    tag2: rawChampions[key].tags[1]
                };
                champions.push(champion);
            }
            return { data: champions };
        }
    };

    var saveChampions = async function(champions) {
        logger.debug('Inserting champions into DB');
        var championPromises = [];
        for (var key in champions) {
            championPromises.push(db.insert.champions(champions[key]));
        }
        await Promise.all(championPromises);
        logger.info('Done inserting champions');
    };

    var getItems = async function() {
        logger.debug('Getting items from API');
        var itemsResult = await api.static.items();
        if (itemsResult.error) {
            logger.error('Unable to get items from API');
        } else {
            var items = itemsResult.data.data;
            return { data: items };
        }
    };

    var saveItems = async function(items) {
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
    };

    var getMasteries = async function() {
        logger.debug('Getting masteries from API');
        var masteriesResult = await api.static.masteries();
        if (masteriesResult.error) {
            logger.error('Unable to get masteries from API');
        } else {
            var masteries = masteriesResult.data.data;
            var masteryPromises = [];
            logger.debug('Inserting masteries into DB');
            for (var key in masteries) {
                var mastery = {
                    id: masteries[key].id,
                    name: masteries[key].name,
                    description: masteries[key].description.join(', ')
                };
                masteryPromises.push(db.insert.masteries(mastery));
            }
            await Promise.all(masteryPromises);
            logger.info('Done inserting masteries');
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
            for (var key in runesResult.data) {
                for (var slot in runesResult[key].slots) {
                    var rune = {
                        id: runesResult[key][slot].id,
                        key: runesResult[key][slot].key,
                        name: runesResult[key][slot].name,
                        shortDesc: runesResult[key][slot].shortDesc,
                        longDesc: runesResult[key][slot].longDesc,
                        icon: runesResult[key][slot].icon,
                        runePathId: runesResult[key].id,
                        runePathName: runesResult[key].name
                    };
                    runePromises.push(db.insert.runes(rune));
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

    var getAll = async function(){
        logger.info('Getting all static data');
        var staticDataPromises = [];
        var champions = await getChampions();
        staticDataPromises.push(saveChampions(champions.data));
        var items = await getItems();
        staticDataPromises.push(saveItems(items.data));
        staticDataPromises.push(getRunes());
        staticDataPromises.push(getSpells());
        staticDataPromises.push(getSkins());
        await Promise.all(staticDataPromises);
        logger.info('Done getting static data');
    };

    return {
        getChampions: getChampions,
        saveChampions: saveChampions,
        getItems: getItems,
        saveItems: saveItems,
        getMasteries: getMasteries,
        getRunes: getRunes,
        getSpells: getSpells,
        getSkins: getSkins,
        getVersion: getVersion,
        getAll: getAll
    };
};
