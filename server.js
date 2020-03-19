const http = require('http');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const classes = require('./classesandutils.js');
const serverLayer = require('./serverlayer.js');

app.use(express.static('public'));
app.set('port', port);

//classes
const Game = classes.Game;
const Player = classes.Player;
const PingTool = serverLayer.PingTool;

const server = http.createServer(app);

server.on('listening', function () {
    console.log('Listening on port ' + port);
});

const io = require('socket.io')(server);

io.sockets.on(
    'connection', function (socket) {
        console.log('client connected: ' + socket.id);

        socket.emit('welcome', { 'id': socket.id });

        for (let i = 0; i < game.players.length; i++) {
            socket.emit('newplayer', game.players[i]);
        }

        socket.on('disconnect', function () {
            console.log("client disconnected: " + socket.id);
            for (let i = 0; i < game.players.length; i++) {
                if (game.players[i].id == socket.id) {
                    game.players.splice(i, 1);
                    break;
                }
            }
            pingTool.removeData(socket.id);
            io.emit('removeplayer', { 'id': socket.id });
        });

        socket.on('joinrequest', function (data) {
            let player = game.buildPlayer(data);
            player.id = socket.id;
            game.players.push(player);
            pingTool.newData(socket);
            io.emit('newplayer', player);
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

        socket.on('pingtest', function () {
            let pingResult = pingTool.testResponse(socket.id);
            if (pingResult.done) {
                let data = {'id': socket.id, 'latency': pingResult.ping};
                for (let i = 0; i < game.players.length; i++) {
                    if (game.players[i].id == socket.id) {
                        game.updatePlayer(game.players[i], data);
                    }
                }
                io.emit('update', data);
            }
        });
    }
);

server.listen(port);

setInterval(update, 1);
//setInterval(updateImportant, 1000 / 2);

var deltaTime = 0; //variation in time since last tick
var prevDate = Date.now(); //last date saved, used to calculate deltaTime

var game = new Game();
var pingTool = new PingTool();

function update() {
    calculateDeltaTime();
    game.update(deltaTime);
    pingTool.update(deltaTime);
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

function calculateDeltaTime() {
    let newDate = Date.now();
    deltaTime = (newDate - prevDate) / 1000;
    prevDate = newDate;
}
