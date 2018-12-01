var currentVersion;
var champions = [];
var lastSearch = 'name';

var websocket = new WebSocket('ws://localhost:8082/summoner');

websocket.onmessage = function(event) {
    var message = JSON.parse(event.data);
    if (message.result === 'success' && message.type === 'championMasteries') {
        champions = message.data;
        setProgress();
        fillPage();
    }
};

// On load
$(function() {
    // Get username if it exists and update the text box
    var username = getURLParamter('user');
    if (username) {
        $('#usernameBox').val(username);
        searchUser();
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

// Get summoner and masteries from database
var searchUser = function() {
    var username = $('#usernameBox').val();
    // Add username to URL for refreshes
    window.history.replaceState(null, null, '?user=' + username);
    // Empty the current masteries
    $('#allMasteries').empty();
    $('#roleMasteries div').empty();
    $('#chestMasteries div').empty();
    $('#levelMasteries div').empty();
    if (websocket.readyState === websocket.OPEN) {
        websocket.send(
            JSON.stringify({
                type: 'championMasteries',
                summonerName: username
            })
        );
    } else {
        websocket.onopen = function(username) {
            websocket.send(
                JSON.stringify({
                    type: 'championMasteries',
                    summonerName: username
                })
            );
        };
    }
};

// Check for enter pressed on search box
$('#usernameBox').on('keyup', function(event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        searchUser();
    }
});

var fillPage = function() {
    if (lastSearch[0] === '-') {
        var secondaryKey = lastSearch.substring(1, lastSearch.length) === 'name' ? 'championPoints' : 'name';
        champions = sortByKey(champions, lastSearch.substring(1, lastSearch.length), secondaryKey);
        champions = champions.reverse();
    } else {
        var secondaryKey = lastSearch === 'name' ? 'championPoints' : 'name';
        champions = sortByKey(champions, lastSearch, secondaryKey);
    }
    $('#allMasteries').empty();
    $('#roleMasteries div').empty();
    $('#chestMasteries div').empty();
    $('#levelMasteries div').empty();
    for (var i = 0; i < champions.length; i++) {
        var champion = champions[i];
        var html =
            '<div class="championBox"><div class="championImage level' +
            champion.championLevel +
            '"><a href="/champion?name=' +
            champion.key +
            '&summoner=' +
            getURLParamter('user') +
            '"><img class="championImage" src="http://ddragon.leagueoflegends.com/cdn/' +
            currentVersion +
            '/img/champion/' +
            champion.key +
            '.png" alt="' +
            champion.key +
            '"></a></div><div class="championData"><div class="championName">' +
            champion.name +
            '</div><div class="chestBox"><img style="width: 25px" src="../static/chest' +
            champion.chestGranted +
            '.jpg" alt="Chest earned: ' +
            champion.chestGranted +
            '"> </div></div><div class="progressBox"><div class="championLevel">' +
            champion.championLevel +
            '</div><div class="progressBar"><div class="progress" style="width: ' +
            champion.progress +
            '%;"></div></div><div class="championLevel">' +
            (champion.championLevel + 1) +
            '</div></div><div class="points">' +
            champion.championPoints +
            'pts' +
            '</div></div>';
        $('#allMasteries').append(html);
        if (champion.tag1) {
            $('#' + champion.tag1 + 'SubBox').append(html);
        }
        if (champion.tag2) {
            $('#' + champion.tag2 + 'SubBox').append(html);
        }
        $('#chest' + champion.chestGranted + 'SubBox').append(html);
        $('#level' + champion.championLevel + 'SubBox').append(html);
    }
};

// Function to add progress to champion object
var setProgress = function() {
    for (var i = 0; i < champions.length; i++) {
        var champion = champions[i];
        if (!champion.championLevel) {
            champion.championLevel = 1;
            champion.championPoints = 0;
            champion.championPointsSinceLastLevel = 0;
            champion.championPointsUntilNextLevel = 1800;
            champion.chestGranted = false;
            champion.lastPlayTime = 0;
            champion.progress = 0;
            champion.tokensEarned = 0;
        } else {
            // Progress is either percent of points for next level, or percent of tokens earned
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
    }
};

var switchMasteryTab = function(evt, tabName) {
    var tabs = document.getElementsByClassName('masteryTabContent');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].style.display = 'none';
    }
    var masteryTabLinks = document.getElementsByClassName('masteryTabLinks');
    for (var i = 0; i < masteryTabLinks.length; i++) {
        masteryTabLinks[i].className = masteryTabLinks[i].className.replace(' active', '');
    }
    document.getElementById(tabName).style.display = 'flex';
    evt.currentTarget.className += ' active';
};

var switchSearch = function(evt, search) {
    var searchTabLinks = document.getElementsByClassName('searchTabLinks');
    for (var i = 0; i < searchTabLinks.length; i++) {
        searchTabLinks[i].className = searchTabLinks[i].className.replace('active', '');
    }
    evt.currentTarget.className += ' active';
    if (search === lastSearch) {
        lastSearch = '-' + search;
    } else {
        lastSearch = search;
    }
    fillPage();
};

var sortByKey = function(array, priorityKey, secondaryKey) {
    return array.sort(function(a, b) {
        return a[priorityKey] < b[priorityKey]
            ? -1
            : a[priorityKey] > b[priorityKey]
            ? 1
            : a[secondaryKey] < b[secondaryKey]
            ? -1
            : a[secondaryKey] > b[secondaryKey]
            ? 1
            : 0;
    });
};
