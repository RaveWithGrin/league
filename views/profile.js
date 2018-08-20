var versions = '';

$.ajax({
    url: 'https://ddragon.leagueoflegends.com/api/versions.json',
    success: function (data) {
        versions = data;
    }
})

var getQueryString = function (field) {
    var regex = new RegExp('[?&]' + field + '=([^&#]*)', 'i' );
    var string = regex.exec(window.location.href);
    return string ? string[1] : null;
}

var socket = new WebSocket('ws://' + location.host + '/summoner');

socket.onopen = function(event){
    socket.send(JSON.stringify({
        method: 'get',
        user: decodeURI(getQueryString('user'))
    }));
};

socket.onmessage = function(event){
    var message = JSON.parse(event.data);
    if (message.error)
        alert(JSON.stringify(message.error));
    else {
        if (message.summoner) {
            var summoner = message.summoner;
            $('#header').html('<img class="profileIcon" src="http://ddragon.leagueoflegends.com/cdn/' + versions[0] + '/img/profileicon/' + summoner.profileIconId + '.png"> ' + summoner.name);
            $('#id').html(' ' + summoner.id);
            $('#accountId').html(' ' + summoner.accountId);
            $('#summonerLevel').html(' ' + summoner.summonerLevel);
        } else if (message.masteries) {
            var masteries = message.masteries;
            var html = '';
            for (var i = 0; i < 5; i++) {
                html += '<span><img class="championIcon" src="http://ddragon.leagueoflegends.com/cdn/' + versions[0] + '/img/champion/' + masteries[i].name.charAt(0).toUpperCase() + (masteries[i].name).replace(/[^a-zA-Z ]/g, '').toLowerCase().slice(1) + '.png" alt="' + masteries[i].name + '">' + masteries[i].name + ' - Level: ' + masteries[i].championLevel + ' ' + masteries[i].championPoints + '/' + (masteries[i].championPointsUntilNextLevel + masteries[i].championPoints)  + ' Chest: ' + ((masteries[i].chestGranted === 1) ? 'Yes' : 'No') + ' Tokens: ' + masteries[i].tokensEarned + '</span></br>';
            }
            $('#masteriesBox').html(html);
            $('#container').css('background', 'linear-gradient(to left, rgba(255, 255, 255, 0), rgba(0, 0, 0, 1)), url(http://ddragon.leagueoflegends.com/cdn/img/champion/splash/' + masteries[0].name + '_0.jpg) no-repeat')
        } else if (message.leagues) {
            var leagues = message.leagues;
            var html = '';
            for (var i = 0; i < leagues.length; i++) {
                html += '<span>' + leagues[i].leagueName + ' - ' + leagues[i].tier + ' ' + leagues[i].rank + ' ' + leagues[i].leaguePoints + ' LP ' + leagues[i].wins + '/' + leagues[i].losses + '</span></br>';
            }
            $('#leaguesBox').html(html);
        } else if (message.matchlist) {
            var matchlist = message.matchlist;
            var html = '';
            for (var i = 0; i < 10; i++) {
                html += '<span>' + JSON.stringify(matchlist[i]) + '</span></br>';
            }
            $('#matchlistBox').html(html);
        }
    }
};