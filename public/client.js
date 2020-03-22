const VIRTUAL_WIDTH = 1570, VIRTUAL_HEIGHT = 883; //virtual screen dimentions
var scaleRatio; //relation between window dimentions and virtual screen dimentions
var realW, realH; //real dimentions after adapting to window screen
var realOx, realOy; //real origin coordinates after adapting to window screen
var mousePos = []; //adapted mouse coordinates after adapting window screen

var socket;
var clientId;

var deltaTime = 0; //variation in time from last frame
var prevDate = Date.now(); //last date saved, used to calculate deltatime

var game;
var inGame = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    windowResized();

    socket = io();
    registerEvents();

    frameRate(999);

    //temp code
    socket.emit('joinrequest', {
        'nickname': 'LzD',
        'color': [123, 0, 255],
        'radius': 50,
        'build': {
            'basicAttack': 3
        }
    });

    document.onkeydown = function(event){
        if (event.key == "Tab") {
            event.preventDefault();
        }
    };

}

function registerEvents() {
    socket.on('welcome', function (data) {
        clientId = data.id;
    });

    socket.on('joinaccept', function (data) {
        if (data.id == clientId) {
            game = new ClientGame();
            inGame = true;
        }
    });

    socket.on('newplayer', function (data) {
        if (inGame) game.addPlayer(data);
    });

    socket.on('removeplayer', function (data) {
        if (inGame) game.removePlayer(data.id);
    });

    socket.on('update', function (data) {
        if (inGame) {
            for (let i = 0; i < game.players.length; i++) {
                if (game.players[i].id == data.id) {
                    game.updatePlayer(game.players[i], data);
                    break;
                }
            }
        }
    });

    socket.on('pingtest', function () {
        socket.emit('pingtest');
    });

    socket.on('newprojectile', function (data) {
        if (inGame) game.addProjectile(data);
    });

    socket.on('removeprojectile', function (data) {
        if (inGame) game.removeProjectile(data.id);
    });
}

function sendMessage(type, data) {
    socket.emit(type, data);
}

function draw() {
    background(80);
    calculateDeltaTime();
    adaptMouse();
    push();
    adaptScreen();
    push()
    if (inGame) game.update(deltaTime);
    pop();
    if(inGame) if(game.keyMonitor.get('Tab')) game.drawRanking();
    drawStats();
    pop();
    drawBoundaries();
}

function drawStats() {
    fill(255, 255, 0);
    stroke(0)
    strokeWeight(1);
    textSize(16);
    if (inGame) text((int)(game.camReference.latency * 1000) + ' ms', 90, 20);
    text('FPS: ' + (int)(frameRate()), 5, 20);
}

function calculateDeltaTime() {
    let newDate = Date.now();
    deltaTime = (newDate - prevDate) / 1000;
    prevDate = newDate;
}

function adaptMouse() {
    mousePos = [(mouseX - realOx) / scaleRatio, (mouseY - realOy) / scaleRatio];
}

function keyPressed() {
    if (inGame) {
        game.keyMonitor.set(key, true);
        game.checkInput();
    }
}

function keyReleased() {
    if (inGame) {
        game.keyMonitor.set(key, false);
        game.checkInput();
    }
}

function mousePressed(event) {
    if (inGame) {
        game.keyMonitor.set(event.button, true);
        game.checkInput();
    }
}

function mouseReleased(event) {
    if (inGame) {
        game.keyMonitor.set(event.button, false);
        game.checkInput();
    }
}