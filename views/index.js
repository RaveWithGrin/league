$('#usernameBox').keypress(function(e){
    if(e.keyCode == 13)
        searchUser();
});

var searchUser = function(){
    document.location.href = '/profile?user=' + $('#usernameBox').val();
}