var currentVersion;
var summoner;
var stats;
var champion;

var websocket = new WebSocket('ws://localhost:8082/champion');

websocket.onmessage = function(event) {
    var message = JSON.parse(event.data);
    console.log(JSON.stringify(message, null, 2));
};

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

var showSplash = function() {
    var randomSkin = skins[Math.floor(Math.random() * skins.length)];
    var html =
        '<img src="http://ddragon.leagueoflegends.com/cdn/img/champion/loading/' +
        champion.key +
        '_' +
        randomSkin.number +
        '.jpg" alt"' +
        champion.key +
        '" style="height: 560px">';
    $('#statsBox').append(html);
};
