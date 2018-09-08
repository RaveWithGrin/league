var currentVersion;

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
        var champions = result.data.champions;
        currentVersion = result.data.version;
        displayMasteries(champions);
    } else {
        alert(result.error);
    }
};

var displayMasteries = function(champions) {
    $('#masteriesBox').empty();
    for (var i = 0; i < champions.length; i++) {
        var champion = champions[i];
        var html = '<a class="championBox">';
        html += '<div>';
        html += '<div class="championImage level' + champion.championLevel + '">';
        html += '<img src="http://ddragon.leagueoflegends.com/cdn/' + currentVersion + '/img/champion/' + champion.key + '.png" alt="' + champion.key + '">';
        html += '</div>';
        html += '<div class="championData">';
        html += '<div class="chestBox"><img src="../static/chest' + champion.chestEarned + '.jpg" alt="Chest earned: ' + champion.chestEarned + '"></div>';
        html += '<div class="championName">' + champion.name + '</div>';
        html += '</div>';
        html += '</div>';
        var progress;
        if (champion.championLevel < 5) {
            progress = 100 * (champion.championPoints / (champion.championPoints + champion.championPointsUntilNextLevel));
        } else if (champion.championLevel === 5) {
            progress = 100 * (champion.tokensEarned / 2);
        } else if (champion.championLevel === 6) {
            progress = 100 * (champion.tokensEarned / 3);
        } else {
            progress = 100;
        }
        html += '<div class="progressBox">';
        html += '<div class="championLevel">' + champion.championLevel + '</div>';
        html += '<div class="progressBar">';
        html += '<div class="progress" style="width: ' + progress + '%;"></div>';
        html += '</div>';
        html += '<div class="championLevel">' + (champion.championLevel + 1) + '</div>';
        html += '</div>';
        if (champion.championLevel < 5) {
            html += '<div class="points">' + champion.championPoints + '/' + (champion.championPoints + champion.championPointsUntilNextLevel) + '</div>';
        } else if (champion.championLevel === 5) {
            html += '<div class="points">' + champion.tokensEarned + '/2 tokens</div>';
        } else if (champion.championLevel === 6) {
            html += '<div class="points">' + champion.tokensEarned + '/3 tokens</div>';
        }
        html += '</div>';
        html += '</a>';
        $('#masteriesBox').append(html);
    }
};
