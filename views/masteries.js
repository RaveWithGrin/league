var currentVersion;
var champions = [];
var currentSort = 'name';
var currentChestFilter = 'all';
var currentTagFilter = 'all';
var summoner;

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
        champions = data.champions;
        summoner = data.summoner;
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

// Get summoner and masteries from database
var searchUser = function() {
    var username = $('#usernameBox').val();
    // Add username to URL for refreshes
    window.history.replaceState(null, null, '?user=' + username);
    // Empty the current masteries
    $('#masteriesBox').empty();
    // #TODO add loading graphic
    // Get masteries from server
    $.ajax({
        type: 'GET',
        url: '/getUserMasteries',
        data: {
            user: username
        },
        success: parseMasteries
    });
};

// Check for enter pressed on search box
$('#usernameBox').on('keyup', function(event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        searchUser();
    }
});

// Retrieve masteries from server, alert if there was an error
var parseMasteries = function(result) {
    var result = JSON.parse(result);
    if (result.error) {
        alert(result.error);
    } else {
        var summoner = result.data.summoner;
        champions = result.data.champions;
        setProgress();
        updateList();
    }
};

// Add champion masteries to page
var displayMasteries = function(champArray) {
    // If we pass in a list of champions, use that, else use the global / original list
    var champs = champArray ? champArray : champions;
    // Clear the list of champions
    $('#masteriesBox').empty();
    for (var i = 0; i < champs.length; i++) {
        var champion = champs[i];
        var html = '<div class="championBox">';
        html += '<div class="championImage level' + champion.championLevel + '">';
        html += '<a href="/champion?name=' + champion.key + '&summoner=' + getURLParamter('user') + '">';
        html += '<img src="http://ddragon.leagueoflegends.com/cdn/' + currentVersion + '/img/champion/' + champion.key + '.png" alt="' + champion.key + '">';
        html += '</a>';
        html += '</div>';
        html += '<div class="championData">';
        html += '<div class="championName">';
        html += champion.name;
        html += '</div>';
        html += '<div class="chestBox">';
        html += '<img style="width: 50px" src="../static/chest' + champion.chestGranted + '.jpg" alt="Chest earned: ' + champion.chestGranted + '">';
        html += '</div>';
        html += '</div>';
        var points =
            champion.championLevel < 5
                ? champion.championPoints + '/' + (champion.championPoints + champion.championPointsUntilNextLevel)
                : champion.championLevel === 5
                    ? champion.tokensEarned + '/2 tokens - ' + champion.championPoints
                    : champion.championLevel === 6
                        ? champion.tokensEarned + '/3 tokens - ' + champion.championPoints
                        : champion.championPoints;
        html += '<div class="progressBox">';
        html += '<div class="championLevel">';
        html += champion.championLevel;
        html += '</div>';
        html += '<div class="progressBar">';
        html += '<div class="progress" style="width: ' + champion.progress + '%;">';
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
        $('#masteriesBox').append(html);
    }
};

// Function to sort champions by property. When values are equal, higher champion points go first
var championSort = function(property) {
    var sortOrder = 1;
    // Reverse sort order if needed
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

// Function called when one of the sort buttons are clicked
var updateSort = function(property) {
    // Only attempt to do anything if we actually have retrieved masteries
    if (champions.length > 0) {
        setProgress();
        // We want to reverse the current sort order
        if (currentSort === property) {
            property = '-' + property;
        }
        currentSort = property;
        updateList();
    }
};

// Function called when one of the chest filters is changed
var updateChestFilter = function(chestButton) {
    // Only attempt to do anything if we actually have retrieved masteries
    if (champions.length > 0) {
        setProgress();
        // Only do something if we're changing the filter
        if (chestButton.value !== currentChestFilter) {
            currentChestFilter = chestButton.value;
            currentChestFilter = currentChestFilter === 'true' ? true : currentChestFilter === 'false' ? false : currentChestFilter;
            updateList();
        }
    }
};

var updateTagFilter = function(tagButton) {
    ``;
    // Only attempt to do anything if we actually have retrieved masteries
    if (champions.length > 0) {
        setProgress();
        // Only do something if we're changing the filter
        if (tagButton.value !== currentTagFilter) {
            currentTagFilter = tagButton.value;
            updateList();
        }
    }
};

// Function to add progress to champion object
var setProgress = function() {
    for (var i = 0; i < champions.length; i++) {
        var champion = champions[i];
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
};

// Apply sort and filter to champion list
var updateList = function() {
    var filteredChampions = [];
    for (var i = 0; i < champions.length; i++) {
        var champion = champions[i];
        if (currentChestFilter === 'all') {
            if (currentTagFilter === 'all') {
                // All champions
                filteredChampions.push(JSON.parse(JSON.stringify(champion)));
            } else {
                // Only tag filter
                if (champion.tag1 === currentTagFilter || champion.tag2 === currentTagFilter) {
                    filteredChampions.push(JSON.parse(JSON.stringify(champion)));
                }
            }
        } else {
            if (currentTagFilter === 'all') {
                // Only chest filter
                if (champion.chestGranted === currentChestFilter) {
                    filteredChampions.push(JSON.parse(JSON.stringify(champion)));
                }
            } else {
                // Both filters
                if (champion.chestGranted === currentChestFilter && (champion.tag1 === currentTagFilter || champion.tag2 === currentTagFilter)) {
                    filteredChampions.push(JSON.parse(JSON.stringify(champion)));
                }
            }
        }
    }
    filteredChampions.sort(championSort(currentSort));
    displayMasteries(filteredChampions);
};
