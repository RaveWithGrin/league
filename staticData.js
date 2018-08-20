var Promise = require('bluebird');
var path = require('path');

var fileName = path.basename(__filename);

module.exports = function(logger, api, db) {
    var getChampions = async function() {
        var championsResult = await api.newStatic.champions();
        if (championsResult.data) {
            var champions = championsResult.data.data;
            var championPromises = [];
            for (var key in champions) {
                var champion = {
                    id: champions[key].key,
                    key: champions[key].id,
                    name: champions[key].name,
                    title: champions[key].title,
                    tag1: champions[key].tags[0],
                    tag2: champions[key].tags[1]
                };
                championPromises.push(db.insert.champions(champion));
            }
            await Promise.all(championPromises);
            logger('info', fileName, 'getChampions', 'Done inserting champions');
        } else {
            logger('error', fileName, 'getChampions', 'Unable to get champions from API');
        }
    };

    var getItems = async function() {
        var itemsResult = await api.static.items();
        if (itemsResult.data) {
            var items = JSON.parse(itemsResult.data).data;
            var itemPromises = [];
            for (var key in items) {
                itemPromises.push(db.insert.items(items[key]));
            }
            await Promise.all(itemPromises);
            logger('info', fileName, 'getItems', 'Done inserting items');
        } else {
            logger('error', fileName, 'getItems', 'Unable to get items from API');
        }
    };

    var getMasteries = async function() {
        var masteriesResult = await api.static.masteries();
        if (masteriesResult.data) {
            var masteries = JSON.parse(masteriesResult.data).data;
            var masteryPromises = [];
            for (var key in masteries) {
                masteries[key].description = masteries[key].description.join(', ');
                masteryPromises.push(db.insert.masteries(masteries[key]));
            }
            await Promise.all(masteryPromises);
            logger('info', fileName, 'getMasteries', 'Done inserting masteries');
        } else {
            logger('error', fileName, 'getMasteries', 'Unable to get masteries from API');
        }
    };

    var getRunes = async function() {
        var runesResult = await api.static.runes();
        if (runesResult.data) {
            runesResult = JSON.parse(runesResult.data);
            var runePromises = [];
            for (var key in runesResult.data) {
                runePromises.push(db.insert.runes(runesResult[key]));
            }
            await Promise.all(runePromises);
            logger('info', fileName, 'getRunes', 'Done inserting runes');
        } else {
            logger('error', fileName, 'getRunes', 'Unable to get runes from API');
        }
    };

    var getSpells = async function() {
        var spellsResult = await api.static.summonerSpells();
        if (spellsResult.data.data) {
            var spellPromises = [];
            for (var key in spellsResult) {
                spellPromises.push(db.insert.summonerSpells(spellsResult[key]));
            }
            await Promise.all(spellPromises);
            logger('info', fileName, 'getSpells', 'Done inserting spells');
        } else {
            logger('error', fileName, 'getSpells', 'Unable to get spells from API');
        }
    };

    return {
        getChampions: getChampions,
        getItems: getItems,
        getMasteries: getMasteries,
        getRunes: getRunes,
        getSpells: getSpells
    };
};
