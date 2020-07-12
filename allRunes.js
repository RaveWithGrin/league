var request = require('request-promise');
var Promise = require('bluebird');
var logger = require('./logger')('debug');
var db = require('./dbCaller_v4')(logger);

var callDdragon = async function(url, version) {
    var baseURL = 'http://ddragon.leagueoflegends.com/cdn/';
    var requestURL = baseURL + version + '/data/en_US/' + url;
    var response = await request.get(requestURL);
    return { data: JSON.parse(response) };
};

var getVersions = async function(){
    var response = await request.get('https://ddragon.leagueoflegends.com/api/versions.json');
    return JSON.parse(response);
};

var main = async function(){
    var versions = await getVersions();
    for (var m = 0; m < versions.length; m++){
        var version = versions[m];
        if (version.indexOf('lolpatch') === -1){
            var runes = await callDdragon('runesReforged.json', version);
            runes = runes.data;
			console.log(runes);
			console.log(version);
            var runePromises = [];
			for (var i = 0; i < runes.length; i++) {
				var path = runes[i];
				for (var j = 0; j < path.slots.length; j++){
					var slot = path.slots[j];
					for (var k = 0; k < slot.runes.length; k++){
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
        }
    }
};

main();

process.on('unhandledRejection', function(error){
    console.error(error);
    process.exit(1);
});
