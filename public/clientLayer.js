var camReference;
var inGame = false;
var playerId;
var keyMonitor = new Map();
var prevDir = [0, 0];

function clientLayer() {
    if (inGame) {
        push();
        adaptScreen();
        push()
        positionCamera();
        drawMap();
        drawPlayers();
        pop();
        drawStats();
        pop();
    }
}

function positionCamera() {
    translate(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);
    translate(-camReference.pos[0], -camReference.pos[1]);
}

function drawMap() {
    stroke(0);
    strokeWeight(5);
    fill(127);
    rect(0, 0, game.mapWidth, game.mapHeight);

    stroke(0, 127);
    strokeWeight(1);
    let xStep = game.mapWidth / 20, yStep = game.mapHeight / 20;
    for (let i = 0; i < game.mapWidth; i += xStep) {
        line(i, 0, i, game.mapHeight);
    }
    for (let i = 0; i < game.mapHeight; i += yStep) {
        line(0, i, game.mapWidth, i);
    }
}

function drawPlayers() {
    stroke(0);
    strokeWeight(2);
    for (let i = 0; i < game.players.length; i++) {
        let plr = game.players[i];
        fill(plr.color);
        let dia = plr.radius * 2;
        ellipse(plr.pos[0], plr.pos[1], dia, dia);
    }
}

function drawStats(){
    fill(255, 255, 0);
    stroke(0)
    strokeWeight(1);
    textSize(18);
    text((int)(camReference.latency * 1000) + ' ms', 5, 20);
}

function keyPressed() {
    keyMonitor.set(key, true);
    checkInput()
}

function keyReleased() {
    keyMonitor.set(key, false);
    checkInput()
}

function mousePressed() {
    keyMonitor.set(mouseButton, true);
    checkInput()
}

function mouseReleased() {
    keyMonitor.set(mouseButton, false);
    checkInput()
}

function checkInput() {
    let newDir = [0, 0];
    if (keyMonitor.get('a')) newDir[0]--;
    if (keyMonitor.get('d')) newDir[0]++;
    if (keyMonitor.get('w')) newDir[1]--;
    if (keyMonitor.get('s')) newDir[1]++;
    if (newDir[0] != prevDir[0] || newDir[1] != prevDir[1]) {
        prevDir = newDir;
        sendMessage('newdir', {
            'id': playerId,
            'dir': newDir
        })
    }
}