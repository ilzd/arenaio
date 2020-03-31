const utils = require('./utilsS.js');
const normalizeVector = utils.normalizeVector;
const distVector = utils.distVector;
const subVector = utils.subVector;
const magVector = utils.magVector;
const multVector = utils.multVector;
const constrainValue = utils.constrainValue;
const maxValue = utils.maxValue;

class GameObject {
    constructor() {
        this.id = 0; //unique identifier
        this.pos = [0, 0]; //position on map
        this.radius = 40; //player radius
        this.active = true;
    }
}

class Player extends GameObject {
    constructor() {
        super();
        this.dir = [0, 0]; //move direction
        this.forcedDir = [0, 0];
        this.speed = 400; //move speed
        this.forcedSpeed = 0;
        this.slow = 1;
        this.fast = 1;
        this.forced = 0;
        this.color = [255, 0, 0]; //player color
        this.nickname = 'Player'; //player display name
        this.latency = 0; //player latency
        this.aimDir = [1, 0];
        this.attackSpeed = 1.5;
        this.isAttacking = false;
        this.attackDelay = 0;
        this.build = {
            'basicAttack': 0,
            'actives': [0, 1, 2],
            'passives': [0, 1]
        }
        this.activesInfo = [];
        this.points = 0;
        this.maxLife = 150;
        this.life = this.maxLife;
        this.stunned = 0;
        this.silenced = 0;
        this.reflecting = 0;
        this.invisible = false;
        this.imaterial = 0;
        this.areaHealing = 0;
    }

    fixAimDir() {
        this.aimDir = normalizeVector(this.aimDir);
    }

    fixDir() {
        this.dir = normalizeVector(this.dir);
    }

    fixForcedDir(){
        this.forcedDir = normalizeVector(this.forcedDir);
    }

    move(deltaTime) {
        let finalDir;
        let finalSpeed;
        let finalSlow = 1;
        let finalFast = 1;

        if(this.forced > 0){
            finalDir = this.forcedDir;
            finalSpeed = this.forcedSpeed;
        } else if(!this.stunned) {
            finalDir = this.dir;
            finalSpeed = this.speed;
            finalSlow = this.slow;
            finalFast = this.fast;
        } else {
            return;
        }

        this.pos[0] += finalDir[0] * finalSpeed * deltaTime * finalSlow * finalFast;
        this.pos[1] += finalDir[1] * finalSpeed * deltaTime * finalSlow * finalFast;
    }

    attack(deltaTime) {
        if (!this.stunned && this.isAttacking) {
            this.attackDelay = constrainValue(this.attackDelay + deltaTime, 0, 1 / this.attackSpeed);
        }
    }

    update(deltaTime) {
        if (this.active) {
            this.move(deltaTime);
            this.attack(deltaTime);
            this.updateColdowns(deltaTime);
            this.updateEffects(deltaTime);
        }
    }

    updateEffects(deltaTime){
        this.stunned = maxValue(0, this.stunned - deltaTime);
        this.silenced = maxValue(0, this.silenced - deltaTime);
        this.reflecting = maxValue(0, this.reflecting - deltaTime);
        this.imaterial = maxValue(0, this.imaterial - deltaTime);
        this.forced = maxValue(0, this.forced - deltaTime);
        this.areaHealing = maxValue(0, this.areaHealing - deltaTime);
    }

    updateColdowns(deltaTime){
        for(let i = 0; i < this.activesInfo.length; i++){
            this.activesInfo[i].coldown = maxValue(0, this.activesInfo[i].coldown - deltaTime);
        }
    }
}

class Game {
    constructor() {
        this.mapWidth;
        this.mapHeight;
        this.players = [];
        this.projectiles = [];
        this.stars = [];
    }

    checkColisions() {
        //related to players
        for (let i = 0; i < this.players.length; i++) {
            let plr = this.players[i];
            if(!plr.active || plr.imaterial > 0) continue;

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

            //checking colision between players (maybe keep this only in the server)
            for (let j = 0; j < this.players.length; j++) {
                let plr2 = this.players[j];
                if(!plr2.active || plr2.imaterial > 0) continue;

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
            plr.update(deltaTime);
        }
        for (let i = 0; i < this.projectiles.length; i++) {
            let proj = this.projectiles[i];
            proj.move(deltaTime);
        }
        this.checkColisions();
    }

    updatePlayer(player, data) {
        for (let prop in player) {
            if ("undefined" != typeof (data[prop])) {
                player[prop] = data[prop];
                if (prop == 'dir') {
                    player.fixDir();
                } else if (prop == 'aimdir') {
                    player.fixAimDir();
                } else if(prop == 'forcedDir'){
                    player.fixForcedDir();
                } else if(prop == 'build'){
                    let actives = data[prop].actives;
                    for(let i = 0; i < actives.length; i++){
                        let coldown;

                        switch (actives[i]) {
                            case 0: //Flash
                                coldown = 5;
                                break;
                            case 1: //Ímpeto
                                coldown = 5;
                                break;
                            case 2: //Stun projectile
                                coldown = 5;
                                break;
                            case 3: //Reflective Shield
                                coldown = 5;
                                break;
                            case 4: //Invisibility
                                coldown = 8;
                                break;
                            case 5: //Imaterial
                                coldown = 7;
                                break;
                            case 6: //Proj Push
                                coldown = 5;
                                break;
                            case 7: //Proj Pull
                                coldown = 5;
                                break;
                            case 8: //Area Heal
                                coldown = 12;
                                break;
                            case 9: //Dash
                                coldown = 6;
                                break;
                            default:
                                break;
                        }

                        player.activesInfo[i] = {'skill': actives[i], 'maxColdown': coldown, 'coldown': 0}
                    }
                }
            }
        }
    }

    removePlayer(id) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id == id) {
                this.players.splice(i, 1);
                break;
            }
        }
    }

    updateProjectile(proj, data) {
        for (let prop in proj) {
            if ("undefined" != typeof (data[prop])) {
                proj[prop] = data[prop];
                if (prop == 'dir') {
                    proj.fixDir();
                }
            }
        }
    }

    updateStar(star, data) {
        for (let prop in star) {
            if ("undefined" != typeof (data[prop])) {
                star[prop] = data[prop];
            }
        }
    }

    removeProjectile(id) {
        for (let i = 0; i < this.projectiles.length; i++) {
            if (this.projectiles[i].id == id) {
                this.projectiles.splice(i, 1);
                break;
            }
        }
    }

    removeStar(id) {
        for (let i = 0; i < this.stars.length; i++) {
            if (this.stars[i].id == id) {
                this.stars.splice(i, 1);
                break;
            }
        }
    }
}

class Projectile extends GameObject {
    constructor() {
        super();
        this.dir = [0, 0]; //move direction
        this.slow = 1;
        this.fast = 1;
        this.color = [0, 0, 0];
        this.speed = 1200;
        this.range = 1000;
        this.traveledDistance = 0;
    }

    fixDir() {
        this.dir = normalizeVector(this.dir);
    }

    fixForcedDir(){
        this.forcedDir = normalizeVector(this.forcedDir);
    }

    move(deltaTime) {
        this.pos[0] += this.dir[0] * this.speed * deltaTime * this.slow * this.fast;
        this.pos[1] += this.dir[1] * this.speed * deltaTime * this.slow * this.fast;
    }
}

module.exports = {
    GameObject,
    Player,
    Game,
    Projectile
}