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
        this.attackDelay = 0;
        this.posToValidate = true;
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
        this.lifeRegen = 3;
        this.repulses = false;
        this.areaDamage = false;
        this.collidedWith = null;
    }

    fixAimDir() {
        this.aimDir = normalizeVector(this.aimDir);
    }

    fixDir() {
        this.dir = normalizeVector(this.dir);
    }

    fixForcedDir() {
        this.forcedDir = normalizeVector(this.forcedDir);
    }

    move(deltaTime) {
        let finalDir;
        let finalSpeed;
        let finalSlow = 1;
        let finalFast = 1;

        if (this.forced > 0) {
            finalDir = this.forcedDir;
            finalSpeed = this.forcedSpeed;
        } else if (!this.stunned) {
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
        if (!this.stunned) {
            this.attackDelay = maxValue(0, this.attackDelay - deltaTime);
        }
    }

    update(deltaTime) {
        if (this.active) {
            this.move(deltaTime);
            this.attack(deltaTime);
            this.updateColdowns(deltaTime);
            this.updateEffects(deltaTime);
            this.regen(deltaTime);
        }
    }

    regen(deltaTime) {
        this.life = minValue(this.maxLife, this.life + this.lifeRegen * deltaTime);
    }

    updateEffects(deltaTime) {
        this.stunned = maxValue(0, this.stunned - deltaTime);
        this.silenced = maxValue(0, this.silenced - deltaTime);
        this.reflecting = maxValue(0, this.reflecting - deltaTime);
        this.imaterial = maxValue(0, this.imaterial - deltaTime);
        this.forced = maxValue(0, this.forced - deltaTime);
        this.areaHealing = maxValue(0, this.areaHealing - deltaTime);
    }

    updateColdowns(deltaTime) {
        for (let i = 0; i < this.activesInfo.length; i++) {
            this.activesInfo[i].coldown = maxValue(0, this.activesInfo[i].coldown - deltaTime);
        }
    }
}

class Game {
    constructor() {
        this.mapWidth;
        this.mapHeight;
        this.blockSize;
        this.players = [];
        this.projectiles = [];
        this.stars = [];
        this.relics = [];
        this.lavaPools = [];
        this.walls = [];
        this.holes = [];
        this.matchDuration = 240;
        this.inMatch = true;
        this.timeMultiplier = 1;
    }

    checkColisions(deltaTime) {
        //related to players
        for (let i = 0; i < this.players.length; i++) {
            let plr = this.players[i];
            if (!plr.active) continue;

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

            if (plr.imaterial > 0) continue;

            //checking colision between players (maybe keep this only in the server)
            for (let j = 0; j < this.players.length; j++) {
                let plr2 = this.players[j];
                if (!plr2.active || plr2.imaterial > 0) continue;

                if (i != j) {
                    let minDist = plr.radius + plr2.radius;
                    let distSqr = distVectorSqr(plr.pos, plr2.pos);
                    if (distSqr < minDist * minDist) {
                        let colisionDir = subVector(plr2.pos, plr.pos);
                        let colisionMag = magVector(colisionDir) - minDist;
                        colisionDir = normalizeVector(colisionDir);
                        plr.pos = subVector(plr.pos, multVector(colisionDir, -colisionMag * (plr2.radius / minDist)));
                        plr2.pos = subVector(plr2.pos, multVector(colisionDir, colisionMag * (plr.radius / minDist)));
                        plr.collidedWith = plr2;
                        plr2.collidedWith = plr;
                    }
                    if (plr.repulses && distSqr < 500 * 500) {
                        let colisionDir = subVector(plr2.pos, plr.pos);
                        colisionDir = normalizeVector(colisionDir);
                        plr2.pos[0] += colisionDir[0] * deltaTime * 125;
                        plr2.pos[1] += colisionDir[1] * deltaTime * 125;
                        plr2.collidedWith = plr;
                    }

                }
            }

            let x = Math.trunc(plr.pos[0] / this.blockSize), y = Math.trunc(plr.pos[1] / this.blockSize);

            if (plr.posToValidate) {
                plr.posToValidate = false;
                if (this.walls[x][y]) {
                    this.validatePosition(plr);
                }
            }

            for (let j = x - 1; j < x + 2; j++) {
                if (j < 0 || j > this.mapWidth / this.blockSize - 1) continue;
                for (let k = y - 1; k < y + 2; k++) {
                    if (k < 0 || k > this.mapHeight / this.blockSize - 1) continue;

                    if (this.walls[j][k]) {
                        let wallX = j * this.blockSize, wallY = k * this.blockSize;
                        let cX = plr.pos[0], cY = plr.pos[1];
                        if (cX < wallX) {
                            cX = wallX;
                        } else if (cX > wallX + this.blockSize) {
                            cX = wallX + this.blockSize;
                        }
                        if (cY < wallY) {
                            cY = wallY;
                        } else if (cY > wallY + this.blockSize) {
                            cY = wallY + this.blockSize;
                        }
                        if (distVectorSqr(plr.pos, [cX, cY]) < plr.radius * plr.radius) {
                            let colisionDir = subVector(plr.pos, [cX, cY]);
                            let colisionMag = magVector(colisionDir) - plr.radius;
                            colisionDir = normalizeVector(colisionDir);
                            plr.pos = subVector(plr.pos, multVector(colisionDir, colisionMag));
                        }
                    }

                }
            }
        }
    }

    checkHoles(deltaTime) {
        for (let i = 0; i < this.holes.length; i++) {
            let hole = this.holes[i];
            for (let j = 0; j < this.players.length; j++) {
                let player = this.players[j];
                if (!player.active) continue;

                let minDistSqr = player.radius + hole.radius;
                minDistSqr *= minDistSqr;
                let distSqr = distVectorSqr(player.pos, hole.pos);
                if (distSqr < minDistSqr) {
                    let pullSpeed = mapValue(distSqr, minDistSqr, 0, 0, 300);
                    let pullDir = subVector(hole.pos, player.pos);
                    pullDir = normalizeVector(pullDir);
                    player.pos[0] += pullDir[0] * deltaTime * pullSpeed;
                    player.pos[1] += pullDir[1] * deltaTime * pullSpeed;
                }
            }
        }
    }

    validatePosition(player) {
        let tX, tY;
        let dist = 0;
        let found = false;
        while (true) {
            dist += 5;
            for (let ang = 0; ang <= 2 * Math.PI; ang += (2 * Math.PI) / 8) {
                let newX = constrainValue(player.pos[0] + Math.cos(ang) * dist, 0, this.mapWidth - 1);
                let newY = constrainValue(player.pos[1] + Math.sin(ang) * dist, 0, this.mapHeight - 1);
                tX = Math.trunc(newX / this.blockSize), tY = Math.trunc(newY / this.blockSize);
                if (!this.walls[tX][tY]) {
                    found = true;
                    player.pos = [newX, newY];
                    break;
                }
            }
            if (found) break;
        }
    }

    update(deltaTime) {
        this.manageDuration(deltaTime);
        if (!this.inMatch) return;

        for (let i = 0; i < this.players.length; i++) {
            let plr = this.players[i];
            plr.update(deltaTime);
        }
        for (let i = 0; i < this.projectiles.length; i++) {
            let proj = this.projectiles[i];
            proj.move(deltaTime);
        }
        for (let i = 0; i < this.stars.length; i++) {
            this.stars[i].update(deltaTime * this.timeMultiplier);
        }
        for (let i = 0; i < this.relics.length; i++) {
            this.relics[i].update(deltaTime * this.timeMultiplier);
        }
        for (let i = 0; i < this.lavaPools.length; i++) {
            this.lavaPools[i].update(deltaTime);
        }
        this.checkColisions(deltaTime);
        this.checkHoles(deltaTime);
    }

    manageDuration(deltaTime) {
        this.matchDuration -= deltaTime;
    }

    updatePlayer(player, data) {
        for (let prop in player) {
            if ("undefined" != typeof (data[prop])) {
                player[prop] = data[prop];
                if (prop == 'dir') {
                    player.fixDir();
                } else if (prop == 'aimdir') {
                    player.fixAimDir();
                } else if (prop == 'forcedDir') {
                    player.fixForcedDir();
                } else if (prop == 'build') {
                    let actives = data[prop].actives;
                    for (let i = 0; i < actives.length; i++) {
                        let coldown;

                        switch (actives[i]) {
                            case 0: //Flash
                                coldown = 6;
                                break;
                            case 1: //Ímpeto
                                coldown = 6;
                                break;
                            case 2: //Stun projectile
                                coldown = 6;
                                break;
                            case 3: //Reflective Shield
                                coldown = 6.5;
                                break;
                            case 4: //Invisibility
                                coldown = 8.5;
                                break;
                            case 5: //Imaterial
                                coldown = 7.5;
                                break;
                            case 6: //Proj Push
                                coldown = 7;
                                break;
                            case 7: //Proj Pull
                                coldown = 6.8;
                                break;
                            case 8: //Area Heal
                                coldown = 13;
                                break;
                            case 9: //Dash
                                coldown = 6;
                                break;
                            case 10: //explode proj
                                coldown = 4;
                                break;
                            case 11: //lava pool
                                coldown = 11;
                                break;
                            case 12: //lava pool
                                coldown = 7.5;
                                break;
                            default:
                                break;
                        }

                        player.activesInfo[i] = { 'skill': actives[i], 'maxColdown': coldown, 'coldown': 0 }
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

    updateRelic(relic, data) {
        for (let prop in relic) {
            if ("undefined" != typeof (data[prop])) {
                relic[prop] = data[prop];
            }
        }
    }

    updateLavaPool(lavaPool, data) {
        for (let prop in lavaPool) {
            if ("undefined" != typeof (data[prop])) {
                lavaPool[prop] = data[prop];
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

    removeRelic(id) {
        for (let i = 0; i < this.relics.length; i++) {
            if (this.relics[i].id == id) {
                this.relics.splice(i, 1);
                break;
            }
        }
    }

    removeLavaPool(id) {
        for (let i = 0; i < this.lavaPools.length; i++) {
            if (this.lavaPools[i].id == id) {
                this.lavaPools.splice(i, 1);
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
        this.maxRange = 1000;
        this.range = 1000;
        this.traveledDistance = 0;
        this.type = 0;
    }

    fixDir() {
        this.dir = normalizeVector(this.dir);
    }

    fixForcedDir() {
        this.forcedDir = normalizeVector(this.forcedDir);
    }

    move(deltaTime) {
        this.pos[0] += this.dir[0] * this.speed * deltaTime * this.slow * this.fast;
        this.pos[1] += this.dir[1] * this.speed * deltaTime * this.slow * this.fast;
    }
}

class Star extends GameObject {
    constructor() {
        super();
        this.maxRespawn = 25;
        this.respawn = this.maxRespawn;

    }

    update(deltaTime) {
        this.respawn = maxValue(0, this.respawn - deltaTime);
    }
}

class Relic extends GameObject {
    constructor() {
        super();
        this.maxRespawn = 10;
        this.respawn = this.maxRespawn;
        this.type = 0;
    }

    update(deltaTime) {
        this.respawn = maxValue(0, this.respawn - deltaTime);
    }
}

class LavaPool extends GameObject {
    constructor(owner) {
        super();
        this.duration = 0;
        this.damage = 0;
        this.owner = owner;
        this.activated = false;
    }

    update(deltaTime) {
        if (!this.activated) return;
        this.duration = maxValue(0, this.duration - deltaTime);
        if (this.duration == 0) this.active = false;
    }
}