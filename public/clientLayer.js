var camReference;
var inGame = false;
var playerId;

function clientLayer() {
    if (inGame) {
        positionCamera();
        drawMap();
        drawPlayers();
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