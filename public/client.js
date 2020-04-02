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

var canvas, form;

var skillsImgs = [];

function preload(){
    for(let i = 0; i < 10; i++){
        skillsImgs.push(loadImage('images/skill' + i + '.png'));
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    windowResized();

    socket = io();
    registerEvents();

    frameRate(999);

    noSmooth();

    document.onkeydown = function (event) {
        if (event.key == "Tab") {
            event.preventDefault();
        }
    };

    form = document.getElementById('form');
    canvas = document.getElementById('defaultCanvas0');
    canvas.style.display = 'none';
}

function sendForm() {
    let color = hexToRgb(document.getElementById('color').value);
    let active0 = (int)(document.getElementById('active0').value);
    let active1 = (int)(document.getElementById('active1').value);
    let active2 = (int)(document.getElementById('active2').value);

    socket.emit('joinrequest', {
        'nickname': document.getElementById('nickname').value,
        'color': [color.r, color.g, color.b],
        'radius': 50,
        'build': {
            'basicAttack': (int)(document.getElementById('basicAttack').value),
            'actives': [active0, active1, active2],
            'passives': [0, 1]
        }
    });

    canvas.style.display = 'block';
    form.style.display = 'none';
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
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

    socket.on('updateprojectile', function(data){
        if (inGame) {
            for (let i = 0; i < game.projectiles.length; i++) {
                if (game.projectiles[i].id == data.id) {
                    game.updateProjectile(game.projectiles[i], data);
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

    socket.on('newstar', function (data) {
        if (inGame) game.addStar(data);
    });

    socket.on('walls', function (data) {
        if (inGame) {
            game.walls = data;
            for (let i = 0; i < game.walls.length; i++) {
                for (let j = 0; j < game.walls[0].length; j++) {
                    if(!game.walls[i][j]) continue;
                    let value = map(dist(i, j, (MAP_HORIZONTAL_SQUARES - 1) / 2, (MAP_VERTICAL_SQUARES - 1) / 2),
                        0, dist(0, 0, (MAP_HORIZONTAL_SQUARES - 1) / 2, (MAP_VERTICAL_SQUARES - 1) / 2),
                        1, 0)
                    game.mapColors[i][j] = [round(100 + value * 60), round(30 + value * 50), round(value * 30)];
                }
            }
        }
    });

    socket.on('updatestar', function(data){
        if (inGame) {
            for (let i = 0; i < game.stars.length; i++) {
                if (game.stars[i].id == data.id) {
                    game.updateStar(game.stars[i], data);
                    break;
                }
            }
        }
    });

    socket.on('removeprojectile', function (data) {
        if (inGame) game.removeProjectile(data.id);
    });

    socket.on('removestar', function (data) {
        if (inGame) game.removeStar(data.id);
    });

    socket.on('chatmessage', function(data){
        if(inGame) game.addChatMessage(data.message);
    });

    socket.on('announcement', function(data){
        if(inGame) game.addAnnouncement(data.message);
    });
}

function sendMessage(type, data) {
    socket.emit(type, data);
}

function draw() {
    background(15);
    calculateDeltaTime();
    adaptMouse();
    push();
    adaptScreen();
    push()
    if(inGame)game.update(deltaTime);
    pop();
    if(inGame) if(game.inGame) game.drawUI();
    if(inGame) game.displayChat(deltaTime);
    if(inGame) game.displayAnnouncements(deltaTime);
    if (inGame) game.drawRanking();
    drawStats();
    pop();
    drawBoundaries();
}

function drawStats() {
    fill(255, 255, 0);
    stroke(0)
    strokeWeight(1);
    textSize(16);
    if (inGame && game.inGame) text((int)(game.camReference.latency * 1000) + ' ms', 90, 20);
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
        game.checkKeyPressed(key);
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
        game.checkMousePressed(mouseButton);
    }
}

function mouseReleased(event) {
    if (inGame) {
        game.keyMonitor.set(event.button, false);
        game.checkInput();
    }
}