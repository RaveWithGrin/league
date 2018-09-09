var currentVersion;
var champions = [];
var currentSort = 'name';
var chestFilter = 'all';
var tagFilter = 'all';

$(function() {
    var username = getURLParamter('user');
    if (username) {
        $('#usernameBox').val(username);
    }
    $.ajax({
        type: 'GET',
        url: 'https://ddragon.leagueoflegends.com/api/versions.json',
        success: function(data) {
            currentVersion = data[0];
        }
    });
});

var getURLParamter = function(param) {
    var url = decodeURIComponent(window.location.search.substring(1));
    var variables = url.split('&');
    var paramName;
    for (var i = 0; i < variables.length; i++) {
        paramName = variables[i].split('=');
        if (paramName[0] === param) {
            return paramName[1] === undefined ? true : paramName[1];
        }
    }
    return false;
};

var searchUser = function() {
    var username = $('#usernameBox').val();
    window.history.replaceState(null, null, '?user=' + username);
    $('#masteriesBox').empty();
    $.ajax({
        type: 'GET',
        url: '/getUserMasteries',
        data: {
            user: username
        },
        success: parseMasteries
    });
};

$('#usernameBox').on('keyup', function(event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        searchUser();
    }
});

var parseMasteries = function(result) {
    var result = JSON.parse(result);
    if (result.data) {
        var summoner = result.data.summoner;
        champions = result.data.champions;
        displayMasteries(champions);
    } else {
        alert(result.error);
    }
};

var displayMasteries = function(champArray) {
    var champs = champArray ? champArray : champions;
    $('#masteriesBox').empty();
    for (var i = 0; i < champs.length; i++) {
        var champion = champs[i];
        var html = '<a class="championBox">';
        html += '<div>';
        html += '<div class="championImage level' + champion.championLevel + '">';
        html += '<img src="http://ddragon.leagueoflegends.com/cdn/' + currentVersion + '/img/champion/' + champion.key + '.png" alt="' + champion.key + '">';
        html += '</div>';
        html += '<div class="championData">';
        html += '<div class="chestBox">';
        html += '<img src="../static/chest' + champion.chestGranted + '.jpg" alt="Chest earned: ' + champion.chestGranted + '">';
        html += '</div>';
        html += '<div class="championName">';
        html += champion.name;
        html += '</div>';
        html += '</div>';
        var progress =
            champion.championLevel < 5
                ? 100 * (champion.championPoints / (champion.championPoints + champion.championPointsUntilNextLevel))
                : champion.championLevel === 5
                    ? 100 * (champion.tokensEarned / 2)
                    : champion.championLevel === 6
                        ? 100 * (champion.tokensEarned / 3)
                        : 100;
        var points =
            champion.championLevel < 5
                ? champion.championPoints + '/' + (champion.championPoints + champion.championPointsUntilNextLevel)
                : champion.championLevel === 5
                    ? champion.tokensEarned + '/2 tokens'
                    : champion.championLevel === 6
                        ? champion.tokensEarned + '/3 tokens'
                        : '';
        html += '<div class="progressBox">';
        html += '<div class="championLevel">';
        html += champion.championLevel;
        html += '</div>';
        html += '<div class="progressBar">';
        html += '<div class="progress" style="width: ' + progress + '%;">';
        html += '</div>';
        html += '</div>';
        html += '<div class="championLevel">';
        html += champion.championLevel + 1;
        html += '</div>';
        html += '</div>';
        html += '<div class="points">';
        html += points;
        html += '</div>';
        html += '</div>';
        html += '</a>';
        $('#masteriesBox').append(html);
    }
};

var championSort = function(property) {
    var sortOrder = 1;
    if (property[0] === '-') {
        sortOrder = -1;
        property = property.substring(1);
    }
    return function(a, b) {
        var result =
            a[property] < b[property]
                ? -1
                : a[property] > b[property]
                    ? 1
                    : a['championPoints'] > b['championPoints']
                        ? -1
                        : a['championPoints'] < b['championPoints']
                            ? 1
                            : 0;
        return result * sortOrder;
    };
};

var sortChampions = function(champs, property) {
    if (champs !== '') {
        champions = champs;
    }
    if (champions.length > 0) {
        for (var i = 0; i < champions.length; i++) {
            var champion = champions[i];
            var progress =
                champion.championLevel < 5
                    ? 100 * (champion.championPoints / (champion.championPoints + champion.championPointsUntilNextLevel))
                    : champion.championLevel === 5
                        ? 100 * (champion.tokensEarned / 2)
                        : champion.championLevel === 6
                            ? 100 * (champion.tokensEarned / 3)
                            : 100;
            champion.progress = progress;
        }
        if (currentSort === property) {
            property = '-' + property;
        }
        currentSort = property;
        champions.sort(championSort(property));
        displayMasteries();
    }
};
