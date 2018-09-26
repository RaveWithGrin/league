var currentVersion;
var summoner;
var stats;
var champion;

// On load
$(function() {
    // Get username if it exists and update the text box
    var username = getURLParamter('user');
    if (username) {
        $('#usernameBox').val(username);
    }
    // Get the current ddragon version
    $.ajax({
        type: 'GET',
        url: 'https://ddragon.leagueoflegends.com/api/versions.json',
        success: function(data) {
            currentVersion = data[0];
        }
    });
});

var setVariables = function(data) {
    if (data) {
        currentVersion = data.version;
        summoner = data.summoner;
        stats = data.stats;
        champion = data.champion;
        displayGames();
    }
};

// Return paramter value from URL if it exists, true if no value, false if parameter is missing
var getURLParamter = function(param) {
    // Remove leading '?'
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

var displayGames = function() {
    $('#gamesBox').empty();
    for (var i = 0; i < stats.length; i++) {
        var game = stats[i];
        console.log(game);
        var html = '<div class="game">';
        html += '<div class="level">Level ' + game.champLevel + '</div>';
        html += '<div class="kda">';
        var kda = ((game.kills + game.assists) / (game.deaths > 0 ? game.deaths : 1)).toFixed(2);
        html += game.kills + ' / ' + game.deaths + ' / ' + game.assists + ' - ' + kda;
        html += '</div>';
        html += '<div class="itemsBox">';
        for (var j = 1; j < 7; j++) {
            if (game['item' + j + 'Id'] !== null) {
                html +=
                    '<div class="item"><img src="http://ddragon.leagueoflegends.com/cdn/' +
                    currentVersion +
                    '/img/item/' +
                    game['item' + j + 'Id'] +
                    '.png" alt="' +
                    game['item' + j + 'Name'] +
                    '" style="width: 30px"></div>';
            }
        }
        html += '</div>';
        if (game.trinketId !== null) {
            html +=
                '<div class="item"><img src="http://ddragon.leagueoflegends.com/cdn/' +
                currentVersion +
                '/img/item/' +
                game.trinketId +
                '.png" alt="' +
                game.trinketName +
                '" style="width: 30px"></div>';
        }
        html += '</div>';
        $('#gamesBox').append(html);
    }
};
