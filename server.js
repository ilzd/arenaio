const http = require('http');
const express = require('express');
const app = express();
const port = 3000;
const classes = require('./classesandutils.js');

app.use(express.static('public'));
app.set('port', port);

//classes
const Game = classes.Game;
const Player = classes.Player;

const server = http.createServer(app);

server.on('listening', function () {
    console.log('Listening on port ' + port);
});

const io = require('socket.io')(server);

io.sockets.on(
    'connection', function (socket) {
        console.log('client connected: ' + socket.id);

        socket.emit('welcome', {'id': socket.id});

        for(let i = 0; i < game.players.length; i++){
            socket.emit('newplayer', game.players[i]);
        }

        socket.on('disconnect', function () {
            console.log("client disconnected: " + socket.id);
            for(let i = 0; i < game.players.length; i++){
                if(game.players[i].id == socket.id){
                    game.players.splice(i, 1);
                    break;
                }
            }
            io.emit('removeplayer', {'id': socket.id});
        });

        socket.on('joinrequest', function(data){
            let player = game.buildPlayer(data);
            player.id = socket.id;
            game.players.push(player);
            io.emit('newplayer', player);
        });

        socket.on('newdir', function(data){
            for(let i = 0; i < game.players.length; i++){
                if(game.players[i].id == data.id){
                    game.players[i].setDir(data.dir);
                    data.pos = game.players[i].pos;
                    break;
                }
            }
            io.emit('newdir', data);
        });
    }
);

server.listen(port);

setInterval(update, 1);

var deltaTime = 0; //variation in time since last tick
var prevDate = Date.now(); //last date saved, used to calculate deltaTime

var game = new Game();

function update() {
    calculateDeltaTime();
    game.update(deltaTime);
}

function calculateDeltaTime(){
    let newDate = Date.now();
    deltaTime = (newDate - prevDate) / 1000;
    prevDate = newDate;
}
