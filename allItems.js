import { get } from 'request-promise';
import { all } from 'bluebird';
var logger = require('./logger')('debug');
var db = require('./dbCaller_v4')(logger);

var callDdragon = async function(url, version) {
    var baseURL = 'http://ddragon.leagueoflegends.com/cdn/';
    var requestURL = baseURL + version + '/data/en_US/' + url;
    var response = await get(requestURL);
    return { data: JSON.parse(response) };
};

var getVersions = async function() {
    var response = await get('https://ddragon.leagueoflegends.com/api/versions.json');
    return JSON.parse(response);
};

var main = async function() {
    var versions = await getVersions();
    for (var i = 0; i < versions.length; i++) {
        var version = versions[i];
        if (version.indexOf('lolpatch') === -1) {
            var items = await callDdragon('item.json', version);
            items = items.data.data;
            var itemPromises = [];
            for (var key in items) {
                var item = {
                    id: key,
                    name: items[key].name,
                    description: items[key].description,
                    plaintext: items[key].plaintext ? items[key].plaintext : ''
                };
                itemPromises.push(db.insert.items(item));
            }
            await all(itemPromises);
        }
    }
};

main();

process.on('unhandledRejection', function(error) {
    console.error(error);
    process.exit(1);
});
