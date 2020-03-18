function normalizeVector(vet){
    let mag = magVector(vet);
    let result = [vet[0], vet[1]];
    if(mag > 0){
        result[0] /= mag;
        result[1] /= mag;
    }
    return result;
}

function subVector(v1, v2){
    return [v1[0] - v2[0], v1[1] - v2[1]];
}

function addVector(v1, v2){
    return [v1[0] + v2[0], v1[1] + v2[1]];
}

function multVector(vet, scalar){
    return [vet[0] * scalar, vet[1] * scalar];
}

function magVector(vet){
    return Math.sqrt(vet[0] * vet[0] + vet[1] * vet[1]);
}

function distVector(v1, v2){
    return magVector(subVector(v2, v1));
}

class Player {
    constructor() {
        this.id = 0;
        this.pos = [0, 0]; //position on map
        this.dir = [0, 0]; //move direction
        this.speed = 400; //move speed
        this.color = [255, 0, 0]; //player color
        this.radius = 40; //player radius
        this.nickname = 'Player'; //player display name
    }

    move(deltaTime) {
        this.pos[0] += this.dir[0] * this.speed * deltaTime;
        this.pos[1] += this.dir[1] * this.speed * deltaTime;
    }
}

class Game {
    constructor() {
        this.mapWidth = 1500;
        this.mapHeight = 1500;
        this.players = [];
    }

    checkColisions() {
        //related to players
        for (let i = 0; i < this.players.length; i++) {
            let plr = this.players[i];

            //checking colision between players and map extremes
            if (plr.pos[0] - plr.radius < 0) {
                plr.pos[0] = plr.radius;
            } else if (plr.pos[0] + plr.radius > this.mapWidth) {
                plr.pos[0] = this.mapWidth - plr.radius;
            }
            if (plr.pos[1] - plr.radius < 0) {
                plr.pos[1] = plr.radius;
            } else if (plr.pos[1] + plr.radius > this.mapHeight) {
                plr.pos[1] = this.mapHeight - plr.radius;
            }

            //checking colision between players
            for (let j = 0; j < this.players.length; j++) {
                let plr2 = this.players[j];
                if (i != j) {
                    let minDist = plr.radius + plr2.radius;
                    if (distVector(plr.pos, plr2.pos) < minDist) {
                        let colisionDir = subVector(plr2.pos, plr.pos);
                        let colisionMag = magVector(colisionDir) - minDist;
                        colisionDir = normalizeVector(colisionDir);
                        plr.pos = subVector(plr.pos, multVector(colisionDir, -colisionMag * (plr2.radius / minDist)));
                        plr2.pos = subVector(plr2.pos, multVector(colisionDir, colisionMag * (plr.radius / minDist)));
                    }
                }
            }
        }
    }

    update(deltaTime) {
        for (let i = 0; i < this.players.length; i++) {
            let plr = this.players[i];
            plr.move(deltaTime);
        }
        this.checkColisions();
    }

    buildPlayer(data) {
        let player = new Player();
        for (let prop in player) {
            if ("undefined" != typeof (data[prop])) {
                player[prop] = data[prop];
            }
        }
        return player;
    }
}

module.exports = {
    Player,
    Game
}