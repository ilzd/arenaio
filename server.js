const http = require('http');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const serverLayer = require('./serverLayer.js');

app.use(express.static('public'));
app.set('port', port);

const ServerGame = serverLayer.ServerGame;

const server = http.createServer(app);

server.on('listening', function () {
    console.log('Listening on port ' + port);
});

const io = require('socket.io')(server);

io.sockets.on(
    'connection', function (socket) {
        console.log('client connected: ' + socket.id);

        socket.emit('welcome', { 'id': socket.id });

        socket.on('disconnect', function () {
            console.log("client disconnected: " + socket.id);

            for(let i = 0; i < game.players.length; i++){
                if(game.players[i].id == socket.id){
                    game.announce(game.players[i].nickname + ' deixou a arena');
                    break;
                }
            }

            game.removePlayer(socket.id);
            io.emit('removeplayer', { 'id': socket.id });
        });

        socket.on('joinrequest', function (data) {
            socket.emit('joinaccept', { 'id': socket.id });
            for (let i = 0; i < game.players.length; i++) {
                socket.emit('newplayer', game.getPlayerData(game.players[i].id));
            }

            for (let i = 0; i < game.projectiles.length; i++) {
                socket.emit('newprojectile', game.getProjectileData(game.projectiles[i].id));
            }

            for (let i = 0; i < game.stars.length; i++) {
                socket.emit('newstar', game.getStarData(game.stars[i].id));
            }

            for (let i = 0; i < game.relics.length; i++) {
                socket.emit('newrelic', game.getRelicData(game.relics[i].id));
            }

            socket.emit('walls', game.walls);

            socket.emit('matchduration', game.matchDuration);

            socket.emit('matchstate', game.inMatch);

            data.id = socket.id;
            let player = game.buildPlayer(data);
            game.addPlayer(socket, player);
            io.emit('newplayer', game.getPlayerData(player.id));

            game.announce(player.nickname + ' entrou na arena');
        });

        socket.on('mousedist', function(data){
            for (let i = 0; i < game.players.length; i++) {
                if (game.players[i].id == data.id) {
                    game.players[i].mouseDist = data.dist;
                    break;
                }
            }
        });

        socket.on('newdir', function (data) {
            for (let i = 0; i < game.players.length; i++) {
                if (game.players[i].id == data.id) {
                    game.updatePlayer(game.players[i], data);
                    data.pos = game.players[i].pos;
                    break;
                }
            }
            io.emit('update', data);
        });

        socket.on('newaimdir', function (data) {
            for (let i = 0; i < game.players.length; i++) {
                if (game.players[i].id == data.id) {
                    game.updatePlayer(game.players[i], data);
                    break;
                }
            }
            socket.broadcast.emit('update', data);
        });

        socket.on('pingtest', function () {
            let pingResult = game.pingTestResult(socket.id);
            if (pingResult.done) {
                let data = { 'id': socket.id, 'latency': pingResult.ping };
                for (let i = 0; i < game.players.length; i++) {
                    if (game.players[i].id == socket.id) {
                        game.updatePlayer(game.players[i], data);
                    }
                }
                io.emit('update', data);
            }
        });

        socket.on('attacking', function (data) {
            for (let i = 0; i < game.players.length; i++) {
                if (game.players[i].id == socket.id) {
                    game.players[i].attackIntent = data.intent;
                }
            }
        });

        socket.on('skillused', function (data) {
            game.executeSkill(data.id, data.skill);
        });

        socket.on('chatmessage', function (data) {
            if(data.message == '/restart'){
                game.restartVote(data.id);
            } else {
                io.emit('chatmessage', {'message': data.nickname + ': ' + data.message});
            }
        });
    }
);

server.listen(port);

setInterval(update, 1);
setInterval(updateImportant, 1000 / 4);
setInterval(updateLessImportant, 3000);

var deltaTime = 0; //variation in time since last tick
var prevDate = Date.now(); //last date saved, used to calculate deltaTime

var game = new ServerGame(io);

function update() {
    calculateDeltaTime();
    game.update(deltaTime);
    //console.log(deltaTime);
}

function updateImportant() {
    for (let i = 0; i < game.players.length; i++) {
        let player = game.players[i];
        io.emit('update', {
            'id': player.id,
            'pos': player.pos
        });
    }
}

function updateLessImportant(){
    io.emit('matchduration', game.matchDuration);

    for(let i = 0; i < game.stars.length; i++){
        io.emit('updatestar', {'id': game.stars[i].id, 'respawn': game.stars[i].respawn});
    }

    for(let i = 0; i < game.relics.length; i++){
        io.emit('updaterelic', {'id': game.relics[i].id, 'respawn': game.relics[i].respawn});
    }
}

function calculateDeltaTime() {
    let newDate = Date.now();
    deltaTime = (newDate - prevDate) / 1000;
    prevDate = newDate;
}
