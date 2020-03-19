function registerEvents() {
    socket.on('welcome', function (data) {
        playerId = data.id;
    });

    socket.on('newplayer', function (data) {
        let player = game.buildPlayer(data);
        game.players.push(player);
        if (player.id == playerId) {
            camReference = player;
            inGame = true;
        }
    });

    socket.on('removeplayer', function (data) {
        for (let i = 0; i < game.players.length; i++) {
            if (game.players[i].id == data.id) {
                game.players.splice(i, 1);
                break;
            }
        }
    });

    socket.on('update', function(data){
        for(let i = 0; i < game.players.length; i++){
            if(game.players[i].id == data.id){
                game.updatePlayer(game.players[i], data);
                break;
            }
        }
    });

    socket.on('pingtest', function(){
        socket.emit('pingtest');
    });
}

function sendMessage(type, data) {
    socket.emit(type, data);
}