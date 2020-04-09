const classes = require('./classesS.js');
const effects = require('./effects.js');
const utils = require('./utilsS.js');
const consts = require('./constsS.js');

const normalizeVector = utils.normalizeVector;
const distVector = utils.distVector;
const distVectorSqr = utils.distVectorSqr;
const subVector = utils.subVector;
const magVector = utils.magVector;
const multVector = utils.multVector;
const constrainValue = utils.constrainValue;
const maxValue = utils.maxValue;
const minValue = utils.minValue;
const angleFromX = utils.angleFromX;
const angleBetweenVector = utils.angleBetweenVector;
const mapValue = utils.mapValue;

const GameObject = classes.GameObject;
const Game = classes.Game;
const Player = classes.Player;
const Projectile = classes.Projectile;
const Star = classes.Star;
const Relic = classes.Relic;
const LavaPool = classes.LavaPool;

const DamageEffect = effects.DamageEffect;
const ProjDamage = effects.ProjDamage;
const SlowEffect = effects.SlowEffect;
const FastEffect = effects.FastEffect;
const StunEffect = effects.StunEffect;
const WaitEffect = effects.WaitEffect;
const ProjPush = effects.ProjPush;
const ProjPull = effects.ProjPull;
const DistProjDamage = effects.DistProjDamage;


class ServerGame extends Game {
    constructor(io) {
        super();
        this.io = io;
        this.latencyData = [];
        this.pingTestTriggerDelay = 0.2;
        this.pingTestSampleSize = 5;
        this.uniqueId = 0;
        this.mapWidth = consts.MAP_WIDTH;
        this.mapHeight = consts.MAP_HEIGHT;
        this.blockSize = consts.MAP_SQUARE_STEP;
        this.matchMaxDuration = 300;
        this.matchDuration = this.matchMaxDuration;
        this.resetDelay = -5;
        this.restartVotes = [];
        this.restartVoting = false;
        this.restartVoteTimer = 10;

        let starData = {
            'id': this.getNewUniqueId(),
            'pos': [this.mapWidth / 2, this.mapHeight / 2],
            'radius': 40
        };
        let star = this.buildStar(starData);
        this.addStar(star);

        this.generateWalls();
    }

    restartVote(id) {
        for (let i = 0; i < this.restartVotes.length; i++) {
            if (this.restartVotes[i] == id) return;
        }

        if (this.restartVotes.length == 0) {
            this.restartVoting = true;
            this.restartVoteTimer = 15;
            this.io.emit('chatmessage', { 'message': 'Uma votação para reiniciar a partica começou. Digite /restart para votar' })
        }

        for (let i = 0; i < this.players.length; i++) {
            let plr = this.players[i];
            if (plr.id == id) {
                this.restartVotes.push(id);
                let voteRatio = this.restartVotes.length / this.players.length;
                if (voteRatio >= 0.75) {
                    this.matchDuration = 0;
                    this.io.emit('matchduration', this.matchDuration);
                    this.io.emit('chatmessage', { 'message': 'A votação foi um sucesso e a partida reiniciará' })
                } else {
                    this.io.emit('chatmessage', { 'message': Math.round((100 * voteRatio)) + '% votaram para reiniciar a partida (75% necessário)' })
                }
                break;
            }
        }
    }

    generateWalls() {
        // for (let i = 0; i < consts.MAP_HORIZONTAL_SQUARES; i++) {
        //     this.walls[i] = [];
        //     for (let j = 0; j < consts.MAP_VERTICAL_SQUARES; j++) {
        //         let chance = Math.random();
        //         if (chance < 0.15) {
        //             this.walls[i].push(true);
        //         } else {
        //             this.walls[i].push(false);
        //         }
        //     }
        // }

        this.walls = [
            [false, false, false, false, true, false, false, false, false, false, false, false, false, false, true, false, false, false, false],
            [false, true, true, false, false, false, true, true, false, true, false, true, true, false, false, false, true, true, false],
            [false, true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
            [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
            [false, false, false, false, true, true, false, false, false, false, false, false, false, true, true, false, false, false, false],
            [false, false, false, false, true, false, false, false, false, false, false, false, false, false, true, false, false, false, false],
            [false, true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
            [false, true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
            [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
            [true, true, true, false, false, false, true, true, false, false, false, true, true, false, false, false, true, true, true],
            [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
            [false, true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
            [false, true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
            [false, false, false, false, true, false, false, false, false, false, false, false, false, false, true, false, false, false, false],
            [false, false, false, false, true, true, false, false, false, false, false, false, false, true, true, false, false, false, false],
            [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
            [false, true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
            [false, true, true, false, false, false, true, true, false, true, false, true, true, false, false, false, true, true, false],
            [false, false, false, false, true, false, false, false, false, false, false, false, false, false, true, false, false, false, false]
        ];

    }

    getNewRandomPosition() {
        let ang = Math.random() * 2 * Math.PI;
        let dist = Math.random() * this.mapWidth / 4 + this.mapWidth / 4;
        return [this.mapWidth / 2 + Math.cos(ang) * dist, this.mapHeight / 2 + Math.sin(ang) * dist];
    }

    getNewUniqueId() {
        this.uniqueId++;
        return this.uniqueId;
    }

    getPlayerData(id) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id == id) {
                let plr = this.players[i];
                return {
                    'id': plr.id,
                    'active': plr.active,
                    'pos': plr.pos,
                    'radius': plr.radius,
                    'dir': plr.dir,
                    'forcedDir': plr.forcedDir,
                    'forced': plr.forced,
                    'speed': plr.speed,
                    'forcedSpeed': plr.forcedSpeed,
                    'color': plr.color,
                    'nickname': plr.nickname,
                    'latency': plr.latency,
                    'aimDir': plr.aimDir,
                    'attackSpeed': plr.attackSpeed,
                    'isAttacking': plr.isAttacking,
                    'attackDelay': plr.attackDelay,
                    'build': plr.build,
                    'activesInfo': plr.activesInfo,
                    'points': plr.points,
                    'maxLife': plr.maxLife,
                    'life': plr.life,
                    'slow': plr.slow,
                    'fast': plr.fast,
                    'stunned': plr.stunned,
                    'silenced': plr.silenced,
                    'reflecting': plr.reflecting,
                    'invisible': plr.invisible,
                    'imaterial': plr.imaterial,
                    'areaHealing': plr.areaHealing,
                    'lifeRegen': plr.lifeRegen,
                    'repulses': plr.repulses,
                    'areaDamage': plr.areaDamage,
                    'posToValidate': plr.posToValidate
                }
            }
        }
    }

    getProjectileData(id) {
        for (let i = 0; i < this.projectiles.length; i++) {
            if (this.projectiles[i].id == id) {
                let proj = this.projectiles[i];
                return {
                    'id': proj.id,
                    'pos': proj.pos,
                    'radius': proj.radius,
                    'active': proj.active,
                    'dir': proj.dir,
                    'speed': proj.speed,
                    'slow': proj.slow,
                    'fast': proj.fast,
                    'color': proj.color,
                    'maxRange': proj.maxRange,
                    'range': proj.range,
                    'traveledDistance': proj.traveledDistance,
                    'type': proj.type
                }
            }
        }
    }

    getStarData(id) {
        for (let i = 0; i < this.stars.length; i++) {
            if (this.stars[i].id == id) {
                let star = this.stars[i];
                return {
                    'id': star.id,
                    'pos': star.pos,
                    'radius': star.radius,
                    'active': star.active,
                    'respawn': star.respawn
                }
            }
        }
    }

    getRelicData(id) {
        for (let i = 0; i < this.relics.length; i++) {
            if (this.relics[i].id == id) {
                let relic = this.relics[i];
                return {
                    'id': relic.id,
                    'pos': relic.pos,
                    'radius': relic.radius,
                    'active': relic.active,
                    'respawn': relic.respawn,
                    'maxRespawn': relic.maxRespawn,
                    'type': relic.type
                }
            }
        }
    }

    getLavaPoolData(id) {
        for (let i = 0; i < this.lavaPools.length; i++) {
            if (this.lavaPools[i].id == id) {
                let lavaPool = this.lavaPools[i];
                return {
                    'id': lavaPool.id,
                    'pos': lavaPool.pos,
                    'radius': lavaPool.radius,
                    'active': lavaPool.active,
                    'duration': lavaPool.respawn,
                    'activated': lavaPool.activated
                }
            }
        }
    }

    addLatencyData(socket) {
        this.latencyData.push({
            'socket': socket,
            'pingHistory': [],
            'latency': 0,
            'triggerWait': this.pingTestTriggerDelay,
            'waiting': false
        });
    }

    removeLatencyData(id) {
        for (let i = 0; i < this.latencyData.length; i++) {
            if (this.latencyData[i].socket.id == id) {
                this.latencyData.splice(i, 1);
                break;
            }
        }
    }

    update(deltaTime) {
        let updateTimes = Math.round(deltaTime / 0.0005);
        deltaTime /= updateTimes;
        for (let i = 0; i < updateTimes; i++) {
            super.update(deltaTime);
            this.checkDuration();
            if (!this.inMatch) continue;
            for (let i = 0; i < this.latencyData.length; i++) {
                let data = this.latencyData[i];
                if (data.waiting) {
                    data.latency += deltaTime;
                } else {
                    data.triggerWait -= deltaTime;
                    if (data.triggerWait < 0) {
                        data.waiting = true;
                        data.triggerWait = this.pingTestTriggerDelay;
                        data.socket.emit('pingtest');
                    }
                }
            }
            for (let i = 0; i < this.players.length; i++) {
                if (this.players[i].attacked) {
                    this.players[i].attacked = false;
                    this.executeBasicAttack(this.players[i]);
                }
            }

            this.checkProjectiles();

            this.sendMessages();

            this.manageStars();

            this.manageRelics();

            this.manageLavaPools(deltaTime);

            this.cleanInactiveObjects();

            this.checkRestartVotes(deltaTime);
        }
    }

    checkRestartVotes(deltaTime) {
        if (!this.restartVoting) return;
        this.restartVoteTimer -= deltaTime;
        if (this.restartVoteTimer < 0) {
            this.restartVoting = false;
            this.restartVotes = [];
            this.io.emit('chatmessage', { 'message': 'A votação para reiniciar a partida falhou' });
        }
    }

    checkDuration() {
        if (this.matchDuration < 0) {
            if (this.inMatch) {
                this.inMatch = false;
                this.io.emit("matchstate", this.inMatch);
                this.announce('A partida terminou');
            }
            if (this.matchDuration < this.resetDelay) {
                this.resetMatch();
            }
        }
    }

    resetMatch() {
        this.inMatch = true;
        this.io.emit("matchstate", this.inMatch);
        this.matchDuration = this.matchMaxDuration;
        this.announce('A partida começou');
        this.io.emit('matchduration', this.matchDuration);

        for (let i = 0; i < this.projectiles.length; i++) {
            this.projectiles[i].active = false;
        }

        for (let i = 0; i < this.stars.length; i++) {
            this.stars[i].respawn = this.stars[i].maxRespawn;
            this.io.emit('updatestar', this.getStarData(this.stars[i].id));
        }

        for (let i = 0; i < this.relics.length; i++) {
            this.respawnRelic(this.relics[i]);
            this.io.emit('updaterelic', this.getRelicData(this.relics[i].id));
        }

        for (let i = 0; i < this.players.length; i++) {
            this.players[i] = this.buildPlayer(this.players[i].data);
            this.io.emit('update', this.getPlayerData(this.players[i].id));
        }

        this.restartVotes = [];
        this.restartVoting = false;
    }

    manageStars() {
        for (let i = 0; i < this.players.length; i++) {
            let plr = this.players[i];
            if (!plr.active) continue;

            for (let j = 0; j < this.stars.length; j++) {
                let str = this.stars[j];
                if (!str.respawn == 0) continue;

                let minDist = plr.radius + str.radius;
                if (distVectorSqr(plr.pos, str.pos) < minDist * minDist) {
                    plr.points += this.players.length;
                    str.respawn = str.maxRespawn;
                    this.io.emit('update', { 'id': plr.id, 'points': plr.points });
                    this.io.emit('updatestar', { 'id': str.id, 'respawn': str.respawn });
                    this.announce(plr.nickname + ' coletou uma estrela e ganhou ' + this.players.length + ' pontos');
                }
            }
        }
    }

    manageRelics() {
        for (let i = 0; i < this.players.length; i++) {
            let plr = this.players[i];
            if (!plr.active) continue;

            for (let j = 0; j < this.relics.length; j++) {
                let relic = this.relics[j];
                if (!relic.respawn == 0) continue;

                let minDist = plr.radius + relic.radius;
                if (distVectorSqr(plr.pos, relic.pos) < minDist * minDist) {
                    switch (relic.type) {
                        case 0:
                            plr.maxLife += 7.5;
                            plr.life += 7.5;
                            this.io.emit('update', {
                                'id': plr.id,
                                'life': plr.life,
                                'maxLife': plr.maxLife
                            });

                            this.announce(plr.nickname + ' coletou uma relíquia e teve sua vida máxima aumentada');
                            break;
                        case 1:
                            plr.speed += 20;
                            this.io.emit('update', {
                                'id': plr.id,
                                'speed': plr.speed
                            });

                            this.announce(plr.nickname + ' coletou uma relíquia e teve sua velocidade de movimento aumentada');
                            break;
                        case 2:
                            plr.damageMultiplier += 0.05;
                            this.announce(plr.nickname + ' coletou uma relíquia e agora causa mais dano');
                            break;
                        case 3:
                            plr.lifeRegen += 0.4;
                            this.io.emit('update', {
                                'id': plr.id,
                                'lifeRegen': plr.lifeRegen
                            });
                            this.announce(plr.nickname + ' coletou uma relíquia e agora regenera vida mais rapidamente');
                            break;
                        case 4:
                            plr.attackSpeed += 0.1;
                            this.io.emit('update', {
                                'id': plr.id,
                                'attackSpeed': plr.attackSpeed
                            });
                            this.announce(plr.nickname + ' coletou uma relíquia e agora recarrega seu arco mais rapidamente');
                            break;
                        default:
                            break;
                    }

                    this.respawnRelic(relic);
                }
            }
        }
    }

    manageLavaPools(deltaTime) {
        for (let j = 0; j < this.lavaPools.length; j++) {
            let lavaPool = this.lavaPools[j];

            if (!lavaPool.activated) {
                lavaPool.activationTime -= deltaTime;
                if (lavaPool.activationTime < 0) {
                    lavaPool.activated = true;
                    this.io.emit('updatelavapool', {'id': lavaPool.id, 'activated': lavaPool.activated});
                } else {
                    continue;
                }
            } 

            for (let i = 0; i < this.players.length; i++) {
                let plr = this.players[i];
                if (!plr.active) continue;

                let minDist = plr.radius + lavaPool.radius;
                if (distVectorSqr(plr.pos, lavaPool.pos) < minDist * minDist) {
                    plr.takeDamage(lavaPool.owner, lavaPool.damage * deltaTime);
                }
            }
        }
    }

    respawnRelic(relic) {
        if (this.relics.length > this.players.length) {
            this.removeRelic(relic.id);
            return;
        }

        relic.respawn = relic.maxRespawn;
        relic.type = Math.trunc(Math.random() * 5);

        let rX, rY;
        do {
            rX = Math.trunc(Math.random() * consts.MAP_HORIZONTAL_SQUARES);
            rY = Math.trunc(Math.random() * consts.MAP_VERTICAL_SQUARES);
        } while (this.walls[rX][rY]);

        relic.pos = [rX * consts.MAP_SQUARE_STEP + consts.MAP_SQUARE_STEP / 2, rY * consts.MAP_SQUARE_STEP + consts.MAP_SQUARE_STEP / 2];

        this.io.emit('updaterelic', {
            'id': relic.id,
            'type': relic.type,
            'pos': relic.pos,
            'respawn': relic.respawn
        });
    }

    announce(message) {
        this.io.emit('announcement', { 'message': message });
    }

    sendMessages() {
        for (let i = 0; i < this.players.length; i++) {
            let plr = this.players[i];
            for (let j = 0; j < plr.messages.length; j++) {
                let msg = plr.messages[j];
                this.io.emit(msg.type, msg.data);
            }
            plr.messages = [];
        }
    }

    checkProjectiles() {
        for (let i = 0; i < this.projectiles.length; i++) {
            //checking colision between projectiles and map extremes
            let proj = this.projectiles[i];
            if (proj.active) {

                if (proj.pos[0] - proj.radius < 0) {
                    if (proj.collidesWithWall) {
                        if (!proj.bounces) {
                            proj.active = false;
                        } else {
                            proj.pos[0] = proj.radius;
                            proj.bounce(0);
                            this.io.emit('updateprojectile', { 'id': proj.id, 'pos': proj.pos, 'dir': proj.dir });
                        }
                    }
                }

                if (proj.pos[0] + proj.radius > this.mapWidth) {
                    if (proj.collidesWithWall) {
                        if (!proj.bounces) {
                            proj.active = false;
                        } else {
                            proj.pos[0] = this.mapWidth - proj.radius;
                            proj.bounce(0);
                            this.io.emit('updateprojectile', { 'id': proj.id, 'pos': proj.pos, 'dir': proj.dir });
                        }
                    }
                }

                if (proj.pos[1] - proj.radius < 0) {
                    if (proj.collidesWithWall) {
                        if (!proj.bounces) {
                            proj.active = false;
                        } else {
                            proj.pos[1] = proj.radius;
                            proj.bounce(1);
                            this.io.emit('updateprojectile', { 'id': proj.id, 'pos': proj.pos, 'dir': proj.dir });
                        }
                    }
                }

                if (proj.pos[1] + proj.radius > this.mapHeight) {
                    if (proj.collidesWithWall) {
                        if (!proj.bounces) {
                            proj.active = false;
                        } else {
                            proj.pos[1] = this.mapHeight - proj.radius;
                            proj.bounce(1);
                            this.io.emit('updateprojectile', { 'id': proj.id, 'pos': proj.pos, 'dir': proj.dir });
                        }
                    }
                }


                //checking if projectile traveled too far
                if (proj.traveledDistance > proj.range) {
                    if (proj.shootsBack) {
                        proj.shootBack();
                        this.io.emit('updateprojectile', { 'id': proj.id, 'pos': proj.pos, 'dir': proj.dir });
                    } else {
                        proj.active = false;
                    }
                }

                for (let j = 0; j < this.players.length; j++) {
                    let plr = this.players[j];
                    if (plr.active && proj.owner.id != plr.id && plr.imaterial == 0) {
                        if (plr.reflecting > 0) {

                            let minDist = plr.radius + proj.radius + consts.SKILL_ZITOR_SHIELD_EXTRA_RADIUS;

                            if (distVectorSqr(plr.pos, proj.pos) < minDist * minDist) {
                                let colisionDir = subVector(proj.pos, plr.pos);
                                colisionDir = normalizeVector(colisionDir);
                                proj.owner = plr;
                                proj.traveledDistance = 0;
                                proj.dir = [colisionDir[0], colisionDir[1]];
                                proj.speed *= consts.SKILL_ZITOR_SHIELD_SPEED_MULTIPLIER;
                                this.io.emit('updateprojectile', { 'id': proj.id, 'dir': proj.dir, 'speed': proj.speed });
                            }

                        } else {
                            let distSqr = distVectorSqr(proj.pos, plr.pos);
                            let minDist = proj.radius + plr.radius;
                            if (distSqr < minDist * minDist) {
                                proj.hit(plr);
                                if (proj.bounces) {
                                    let colisionDir = subVector(proj.pos, plr.pos);
                                    let colisionMag = magVector(colisionDir) - minDist;
                                    colisionDir = normalizeVector(colisionDir);
                                    proj.pos = subVector(proj.pos, multVector(colisionDir, colisionMag));
                                    proj.dir = [colisionDir[0], colisionDir[1]];
                                    proj.increaseRangeForBouncing();
                                    this.io.emit('updateprojectile', { 'id': proj.id, 'pos': proj.pos, 'dir': proj.dir });
                                }
                            }
                        }
                    }
                }

                if (proj.collidesWithWall) {
                    let x = Math.trunc(proj.pos[0] / this.blockSize), y = Math.trunc(proj.pos[1] / this.blockSize);

                    for (let j = x - 1; j < x + 2; j++) {
                        if (j < 0 || j > this.mapWidth / this.blockSize - 1) continue;
                        for (let k = y - 1; k < y + 2; k++) {
                            if (k < 0 || k > this.mapHeight / this.blockSize - 1) continue;

                            if (this.walls[j][k]) {
                                let wallX = j * this.blockSize, wallY = k * this.blockSize;
                                let cX = proj.pos[0], cY = proj.pos[1];
                                let colisionSide;
                                if (cX < wallX) {
                                    cX = wallX;
                                    colisionSide = 0;
                                } else if (cX > wallX + this.blockSize) {
                                    cX = wallX + this.blockSize;
                                    colisionSide = 1;
                                }
                                if (cY < wallY) {
                                    cY = wallY;
                                    colisionSide = 2;
                                } else if (cY > wallY + this.blockSize) {
                                    cY = wallY + this.blockSize;
                                    colisionSide = 3;
                                }
                                if (distVectorSqr(proj.pos, [cX, cY]) < proj.radius * proj.radius) {
                                    if (!proj.bounces) {
                                        proj.active = false;
                                    } else {
                                        switch (colisionSide) {
                                            case 0:
                                                proj.bounce(0);
                                                proj.pos[0] = cX - proj.radius;
                                                break;
                                            case 1:
                                                proj.pos[0] = cX + proj.radius;
                                                proj.bounce(0);
                                                break;
                                            case 2:
                                                proj.bounce(1);
                                                proj.pos[1] = cY - proj.radius;
                                                break;
                                            case 3:
                                                proj.bounce(1);
                                                proj.pos[1] = cY + proj.radius;
                                                break;
                                            default:
                                                break;
                                        }
                                        this.io.emit('updateprojectile', { 'id': proj.id, 'pos': proj.pos, 'dir': proj.dir });
                                    }
                                }
                            }

                        }
                    }
                }

            }
        }

    }

    cleanInactiveObjects() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (!this.projectiles[i].active) this.removeProjectile(this.projectiles[i].id);
        }

        for (let i = this.stars.length - 1; i >= 0; i--) {
            if (!this.stars[i].active) this.removeStar(this.stars[i].id);
        }

        for (let i = this.relics.length - 1; i >= 0; i--) {
            if (!this.relics[i].active) this.removeRelic(this.relics[i].id);
        }

        for (let i = this.lavaPools.length - 1; i >= 0; i--) {
            if (!this.lavaPools[i].active) this.removeLavaPool(this.lavaPools[i].id);
        }

        for (let i = this.players.length - 1; i >= 0; i--) {
            if (!this.players[i].active && this.players[i].respawn == 0) {
                let plr = this.players[i];
                let data = plr.data;
                data.points = plr.points;
                let newPlr = this.buildPlayer(data);
                this.players[i] = newPlr;
                this.io.emit('update', this.getPlayerData(newPlr.id));
            }
        }
    }

    executeBasicAttack(player) {
        let projData;
        let proj;
        switch (player.build.basicAttack) {
            case 0:
                projData = {
                    'id': this.getNewUniqueId(),
                    'color': [255, 0, 0],
                    'speed': 1500,
                    'maxRange': 600,
                    'radius': 5,
                    'type': 0,
                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                proj = this.buildProjectile(player.id, projData);

                proj.effects.push(new ProjDamage(proj, 20));

                this.addProjectile(proj);
                this.io.emit('newprojectile', projData);

                break;
            case 1:
                for (let i = 0; i < 20; i++) {
                    let aimAngle = angleFromX(player.aimDir);
                    let projAngle = aimAngle - Math.PI * 0.18 + Math.random() * (Math.PI * 0.36);
                    let projDir = [Math.cos(projAngle), -Math.sin(projAngle)];
                    projData = {
                        'id': this.getNewUniqueId(),
                        'color': [255, 255, 0],
                        'speed': 750 + Math.random() * 1000,
                        'maxRange': 425,
                        'radius': 5,
                        'type': 0,
                        'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                        'dir': [projDir[0], projDir[1]],
                    }
                    proj = this.buildProjectile(player.id, projData);

                    proj.effects.push(new ProjDamage(proj, 2.5));

                    this.addProjectile(proj);
                    this.io.emit('newprojectile', projData);
                }

                break;
            case 2:
                projData = {
                    'id': this.getNewUniqueId(),
                    'color': [0, 0, 255],
                    'speed': 2600,
                    'maxRange': 900,
                    'radius': 5,
                    'type': 0,
                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                proj = this.buildProjectile(player.id, projData);

                proj.effects.push(new DistProjDamage(proj, 10, 45));

                this.addProjectile(proj);
                this.io.emit('newprojectile', projData);

                break;
            case 3:
                projData = {
                    'id': this.getNewUniqueId(),
                    'color': [200, 255, 255],
                    'speed': 1500,
                    'maxRange': 600,
                    'radius': 5,
                    'type': 0,
                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                proj = this.buildProjectile(player.id, projData);

                proj.effects.push(new ProjDamage(proj, 12));
                proj.effects.push(new SlowEffect(0.2, 0.55));

                this.addProjectile(proj);
                this.io.emit('newprojectile', projData);

                break;
            case 4:
                projData = {
                    'id': this.getNewUniqueId(),
                    'color': [0, 255, 0],
                    'speed': 1800,
                    'maxRange': 700,
                    'radius': 5,
                    'type': 0,
                    'bounces': true,
                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                proj = this.buildProjectile(player.id, projData);

                proj.effects.push(new ProjDamage(proj, 9));

                this.addProjectile(proj);
                this.io.emit('newprojectile', projData);

                break;
            case 5:
                projData = {
                    'id': this.getNewUniqueId(),
                    'color': [255, 0, 255],
                    'speed': 1500,
                    'maxRange': 650,
                    'radius': 5,
                    'type': 0,
                    'collidesWithWall': false,
                    'pierces': true,
                    'shootsBack': true,
                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                proj = this.buildProjectile(player.id, projData);

                proj.effects.push(new ProjDamage(proj, 15));

                this.addProjectile(proj);
                this.io.emit('newprojectile', projData);

                break;
            default:
                break;
        }
    }

    executeSkill(id, skill) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id == id) {
                let player = this.players[i];
                if (player.silenced > 0 || !player.active || !this.inMatch) return;

                if (player.activesInfo[skill].coldown == 0) {
                    let projData, proj;
                    player.activesInfo[skill].coldown = player.activesInfo[skill].maxColdown;
                    this.io.emit('update', { 'id': player.id, 'activesInfo': player.activesInfo });
                    switch (player.activesInfo[skill].skill) {
                        case 0:
                            let flashDist = minValue(280, player.mouseDist);
                            player.pos = [player.pos[0] + player.aimDir[0] * flashDist, player.pos[1] + player.aimDir[1] * flashDist];
                            player.posToValidate = true;
                            this.io.emit('update', { 'id': player.id, 'pos': player.pos, 'posToValidate': player.posToValidate });
                            break;
                        case 1:
                            player.addSlowEffect(0.2, 0.3);
                            let wait = new WaitEffect(new FastEffect(2, 1.3), 0.3);
                            player.waitEffects.push(wait);
                            break;
                        case 2:
                            projData = {
                                'id': this.getNewUniqueId(),
                                'color': [0, 0, 0],
                                'speed': 500,
                                'maxRange': 750,
                                'radius': 80,
                                'type': 1,
                                'collidesWithWall': false,
                                'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                                'dir': [player.aimDir[0], player.aimDir[1]],
                            }
                            proj = this.buildProjectile(player.id, projData);

                            proj.effects.push(new StunEffect(1.4));

                            this.addProjectile(proj);
                            this.io.emit('newprojectile', projData);
                            break;
                        case 3:
                            player.reflecting += consts.SKILL_ZITORSHIELD_DURATION;
                            this.io.emit('update', { 'id': player.id, 'reflecting': player.reflecting });
                            break;
                        case 4:
                            player.becomeInvisible(2.5);
                            break;
                        case 5:
                            player.imaterial = 1.5;
                            player.wasImaterial = true;

                            this.io.emit('update', { 'id': player.id, 'imaterial': player.imaterial });
                            break;
                        case 6:
                            let amount = 7;
                            for (let i = 0; i < amount; i++) {
                                let aimAngle = angleFromX(player.aimDir);
                                let projAngle = aimAngle + mapValue(i, 0, amount - 1, -Math.PI / 5, Math.PI / 5);
                                let projDir = [Math.cos(projAngle), -Math.sin(projAngle)];
                                projData = {
                                    'id': this.getNewUniqueId(),
                                    'color': [127, 255, 127],
                                    'speed': 800,
                                    'maxRange': 450,
                                    'radius': 8,
                                    'type': 1,
                                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                                    'dir': projDir,
                                }
                                proj = this.buildProjectile(player.id, projData);

                                proj.effects.push(new ProjPush(proj, 2000, 0.2));

                                this.addProjectile(proj);
                                this.io.emit('newprojectile', projData);
                            }
                            break;
                        case 7:
                            projData = {
                                'id': this.getNewUniqueId(),
                                'color': [0, 127, 127],
                                'speed': 1400,
                                'maxRange': 600,
                                'radius': 20,
                                'type': 1,
                                'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                                'dir': [player.aimDir[0], player.aimDir[1]],
                            }
                            proj = this.buildProjectile(player.id, projData);

                            proj.effects.push(new ProjPull(proj, 1500));

                            this.addProjectile(proj);
                            this.io.emit('newprojectile', projData);
                            break;
                        case 8:
                            player.startAreaHealing(consts.SKILL_HEALAREA_DURATION);
                            break;
                        case 9:
                            let dashDistance = minValue(500, player.mouseDist);
                            let dashSpeed = 3000;
                            player.takeForce(player.aimDir, dashSpeed, dashDistance / dashSpeed);
                            break;
                        case 10:
                            for (let i = 0; i < this.projectiles.length; i++) {
                                proj = this.projectiles[i];
                                if (proj.owner.id == player.id) {
                                    proj.active = false;
                                    proj.playersHit = [];

                                    this.io.emit('newexplosion', {
                                        'pos': proj.pos,
                                        'radius': proj.radius + consts.SKILL_EXPLODEARROW_RADIUS,
                                        'color': proj.color
                                    })

                                    for (let j = 0; j < this.players.length; j++) {
                                        let plr = this.players[j];
                                        if (plr.active && plr.id != proj.owner.id) {
                                            let minDist = plr.radius + proj.radius + consts.SKILL_EXPLODEARROW_RADIUS;
                                            if (distVectorSqr(plr.pos, proj.pos) < minDist * minDist) {
                                                proj.hit(plr);
                                            }
                                        }
                                    }
                                }
                            }
                            break;
                        case 11:
                            let lavaDist = minValue(600, player.mouseDist);
                            let lavaData = {
                                'id': this.getNewUniqueId(),
                                'duration': 3,
                                'damage': 50,
                                'radius': 100,
                                'pos': [player.pos[0] + player.aimDir[0] * lavaDist, player.pos[1] + player.aimDir[1] * lavaDist]
                            }
                            let lavaPool = this.buildLavaPool(player, lavaData);
                            this.addLavaPool(lavaPool);
                            break;
                        default:
                            break;
                    }
                }

                break;
            }
        }
    }

    pingTestResult(id) {
        let result = { 'done': false, 'ping': 0 };
        for (let i = 0; i < this.latencyData.length; i++) {
            if (this.latencyData[i].socket.id == id) {
                let data = this.latencyData[i];
                data.pingHistory.push(data.latency);
                data.latency = 0;
                data.waiting = false;
                if (data.pingHistory.length == this.pingTestSampleSize) {
                    result.done = true;
                    let value = 0;
                    for (let j = 0; j < data.pingHistory.length; j++) {
                        value += data.pingHistory[j];
                    }
                    value /= this.pingTestSampleSize;
                    result.ping = value / 2;
                    data.pingHistory = [];
                }
                break;
            }
        }
        return result;
    }

    buildPlayer(data) {
        let player = new ServerPlayer(this);

        let attackSpeed;
        switch (data.build.basicAttack) {
            case 0:
                attackSpeed = 1.5;
                break;
            case 1:
                attackSpeed = 1.5;
                break;
            case 2:
                attackSpeed = 0.7;
                break;
            case 3:
                attackSpeed = 1.75;
                break;
            case 4:
                attackSpeed = 3;
                break;
            case 5:
                attackSpeed = 1.5;
                break;
            default:
                break;
        }

        data.attackSpeed = attackSpeed;

        data.pos = this.getNewRandomPosition();

        this.updatePlayer(player, data);
        player.data = data;

        //if has no slow on recharge passive
        if (this.hasPassive(0, data.build.passives)) {
            player.takesSlowOnRecharge = false;
        }

        //if has life regen passive
        if (this.hasPassive(1, data.build.passives)) {
            player.lifeRegen = player.lifeRegen * 2;
        }

        //if has mobility passive
        if (this.hasPassive(2, data.build.passives)) {
            player.speed = player.speed * 1.2;
        }

        //if has agility passive
        if (this.hasPassive(3, data.build.passives)) {
            player.attackSpeed *= 1.2;
        }

        //if has repulsion passive
        if (this.hasPassive(4, data.build.passives)) {
            player.repulses = true;
        }

        //if has area damage
        if (this.hasPassive(5, data.build.passives)) {
            player.areaDamage = true;
        }

        //if has increased max life
        if (this.hasPassive(6, data.build.passives)) {
            player.maxLife = player.maxLife * 1.3;
            player.life = player.maxLife;
        }

        //if has increased damage
        if (this.hasPassive(7, data.build.passives)) {
            player.damageMultiplier = 1.25;
        }

        //if has reduced coldown
        if (this.hasPassive(8, data.build.passives)) {
            for (let i = 0; i < player.activesInfo.length; i++) {
                player.activesInfo[i].maxColdown *= 0.8;
            }
        }

        return player;
    }

    hasPassive(passive, passives) {
        let result = false;

        for (let i = 0; i < passives.length; i++) {
            if (passives[i] == passive) {
                result = true;
                break;
            }
        }

        return result;
    }

    addPlayer(socket, player) {
        this.players.push(player);
        this.addLatencyData(socket);
        if (this.players.length > this.relics.length) this.addRelic();
    }

    removePlayer(id) {
        super.removePlayer(id);
        this.removeLatencyData(id);
    }

    buildProjectile(ownerId, data) {
        let owner;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].id == ownerId) {
                owner = this.players[i];
                break;
            }
        }

        let proj = new ServerProjectile(owner);
        this.updateProjectile(proj, data);
        proj.range = proj.maxRange;
        return proj;
    }

    addProjectile(proj) {
        this.projectiles.push(proj);
    }

    removeProjectile(id) {
        super.removeProjectile(id);
        this.io.emit('removeprojectile', { 'id': id });
    }

    buildStar(data) {
        let star = new Star();
        this.updateStar(star, data);
        return star;
    }

    buildRelic(data) {
        let relic = new Relic();
        this.updateRelic(relic, data);
        return relic;
    }

    buildLavaPool(owner, data) {
        let lavaPool = new ServerLavaPool(owner);
        this.updateLavaPool(lavaPool, data);
        return lavaPool;
    }

    addStar(star) {
        this.stars.push(star);
        this.io.emit('newstar', this.getStarData(star.id));
    }

    addRelic() {
        let relicData = {
            'id': this.getNewUniqueId(),
            'radius': 30,
        };
        let relic = this.buildRelic(relicData);
        this.respawnRelic(relic);
        this.relics.push(relic);
        this.io.emit('newrelic', this.getRelicData(relic.id));
    }

    addLavaPool(lavaPool) {
        this.lavaPools.push(lavaPool);
        this.io.emit('newlavapool', this.getLavaPoolData(lavaPool.id));
    }

    removeStar(id) {
        super.removeStar(id);
        this.io.emit('removestar', { 'id': id });
    }

    removeRelic(id) {
        super.removeRelic(id);
        this.io.emit('removerelic', { 'id': id });
    }

    removeLavaPool(id) {
        super.removeLavaPool(id);
        this.io.emit('removelavapool', { 'id': id });
    }
}

class ServerPlayer extends Player {
    constructor(game) {
        super();
        this.game = game;
        this.respawn = 0;
        this.attackIntent = false;
        //this.socket;
        this.attacked = false;
        this.messages = [];
        this.slowEffects = [];
        this.fastEffects = [];
        this.waitEffects = [];
        this.invisibleTimer = 0;
        this.wasImaterial = false;
        this.takesSlowOnRecharge = true;
        this.damageMultiplier = 1;
        this.data;
        this.mouseDist = 0;
    }

    attack(deltaTime) {

        if (this.attackIntent) {
            if (this.attackDelay == 0) {
                if (this.takesSlowOnRecharge) this.addSlowEffect(0.35, 1 / this.attackSpeed);
                this.attackDelay = 1 / this.attackSpeed;
                this.attacked = true;
                this.messages.push({
                    'type': 'update',
                    'data': {
                        'id': this.id,
                        'attackDelay': this.attackDelay,
                    }
                });
            }
        }

        super.attack(deltaTime);
    }

    update(deltaTime) {
        super.update(deltaTime);

        if (this.active) {
            this.updateSlowEffects(deltaTime);
            this.updateFastEffects(deltaTime);
            this.updateWaitEffects(deltaTime);
            this.updateInvisibility(deltaTime);

            if (this.areaHealing > 0) {
                this.applyAreaHeal(deltaTime);
            }

            if (this.areaDamage) {
                this.applyAreaDamage(deltaTime);
            }

            if (this.wasImaterial && this.imaterial == 0) {
                this.wasImaterial = false;
                this.game.validatePosition(this);
                this.messages.push({
                    'type': 'update',
                    'data': { 'id': this.id, 'pos': this.pos }
                });
            }
        } else {
            this.respawn = maxValue(0, this.respawn - deltaTime);
        }
    }

    applyAreaHeal(deltaTime) {
        for (let i = 0; i < this.game.players.length; i++) {
            let player = this.game.players[i];
            if (!player.active) continue;

            let minDist = consts.SKILL_HEALAREA_RADIUS + player.radius;
            if (distVectorSqr(this.pos, player.pos) < minDist * minDist) {
                player.heal(consts.SKILL_HEALAREA_HEALPERSECOND * deltaTime);
            }
        }
    }

    applyAreaDamage(deltaTime) {
        for (let i = 0; i < this.game.players.length; i++) {
            let player = this.game.players[i];
            if (!player.active || player.id == this.id) continue;

            let minDist = consts.SKILL_AREADAMAGE_RADIUS + player.radius;
            if (distVectorSqr(this.pos, player.pos) < minDist * minDist) {
                player.takeDamage(this, consts.SKILL_AREADAMAGE_DAMAGEPERSECOND * deltaTime);
            }
        }
    }

    updateWaitEffects(deltaTime) {
        for (let i = this.waitEffects.length - 1; i >= 0; i--) {
            let effect = this.waitEffects[i];
            effect.duration = maxValue(0, effect.duration - deltaTime);
            if (effect.duration == 0) {
                effect.apply(this);
                this.waitEffects.splice(i, 1);
            }
        }
    }

    updateSlowEffects(deltaTime) {
        for (let i = this.slowEffects.length - 1; i >= 0; i--) {
            this.slowEffects[i].duration -= deltaTime;
            if (this.slowEffects[i].duration < 0) {
                this.slowEffects.splice(i, 1);
                this.sortSlowEffects();
            }
        }
    }

    updateFastEffects(deltaTime) {
        for (let i = this.fastEffects.length - 1; i >= 0; i--) {
            this.fastEffects[i].duration -= deltaTime;
            if (this.fastEffects[i].duration < 0) {
                this.fastEffects.splice(i, 1);
                this.sortFastEffects();
            }
        }
    }

    updateInvisibility(deltaTime) {
        if (this.invisibleTimer == 0) return;
        this.invisibleTimer = maxValue(0, this.invisibleTimer - deltaTime);
        if (this.invisibleTimer == 0) {
            this.invisible = false;
            this.messages.push({
                'type': 'update',
                'data': { 'id': this.id, 'invisible': this.invisible }
            });
        }
    }

    addSlowEffect(value, duration) {
        this.slowEffects.push({ 'value': value, 'duration': duration });
        this.sortSlowEffects();
    }

    addFastEffect(value, duration) {
        this.fastEffects.push({ 'value': value, 'duration': duration });
        this.sortFastEffects();
    }

    sortSlowEffects() {
        let value = 9999;
        let index = -1;
        for (let i = 0; i < this.slowEffects.length; i++) {
            if (this.slowEffects[i].value < value) {
                index = i;
                value = this.slowEffects[i].value;
            }
        }
        if (index != -1) {
            this.slow = value;
        } else {
            this.slow = 1;
        }

        this.messages.push({
            'type': 'update',
            'data': {
                'id': this.id,
                'slow': this.slow,
                'pos': this.pos
            }
        });

    }

    sortFastEffects() {
        let value = 0;
        let index = -1;
        for (let i = 0; i < this.fastEffects.length; i++) {
            if (this.fastEffects[i].value > value) {
                index = i;
                value = this.fastEffects[i].value;
            }
        }
        if (index != -1) {
            this.fast = value;
        } else {
            this.fast = 1;
        }

        this.messages.push({
            'type': 'update',
            'data': {
                'id': this.id,
                'fast': this.fast,
                'pos': this.pos
            }
        });

    }

    takeDamage(source, value) {
        this.life = maxValue(0, this.life - (value * source.damageMultiplier));
        this.messages.push({
            'type': 'update',
            'data': { 'id': this.id, 'life': this.life }
        });
        if (this.life == 0) {
            this.points = maxValue(0, this.points - 1);
            this.active = false;
            this.respawn = 3;

            this.messages.push({
                'type': 'update',
                'data': { 'id': this.id, 'points': this.points, 'active': this.active }
            });

            if (this.id == source.id) {
                this.game.announce(this.nickname + ' se suicidou');
            } else {
                source.points += 2;
                this.messages.push({
                    'type': 'update',
                    'data': { 'id': source.id, 'points': source.points }
                });
                this.game.announce(source.nickname + ' eliminou ' + this.nickname);
            }
        }
    }

    heal(amount) {
        this.life = minValue(this.maxLife, this.life + amount);
        this.messages.push({
            'type': 'update',
            'data': { 'id': this.id, 'life': this.life }
        });
    }

    takeStun(duration) {
        this.stunned = maxValue(duration, this.stunned);
        this.messages.push({
            'type': 'update',
            'data': { 'id': this.id, 'stunned': this.stunned, 'pos': this.pos }
        });
    }

    takeSilence(duration) {
        this.silenced = maxValue(duration, this.silenced);
        this.messages.push({
            'type': 'update',
            'data': { 'id': this.id, 'silenced': this.silenced }
        });
    }

    becomeInvisible(duration) {
        if (this.invisibleTimer == 0) {
            this.invisible = true;
            this.messages.push({
                'type': 'update',
                'data': { 'id': this.id, 'invisible': this.invisible }
            });
        }
        this.invisibleTimer = maxValue(duration, this.invisibleTimer);
    }

    takeForce(dir, speed, duration) {
        this.forcedDir = dir;
        this.fixForcedDir();
        this.forcedSpeed = speed;
        this.forced = duration;
        this.messages.push({
            'type': 'update',
            'data': {
                'id': this.id,
                'forcedDir': this.forcedDir,
                'forcedSpeed': this.forcedSpeed,
                'forced': this.forced
            }
        });
    }

    startAreaHealing(duration) {
        this.areaHealing = maxValue(this.areaHealing, duration);
        this.messages.push({
            'type': 'update',
            'data': {
                'id': this.id,
                'areaHealing': this.areaHealing
            }
        });
    }
}

class ServerProjectile extends Projectile {
    constructor(owner) {
        super();
        this.owner = owner;
        this.effects = [];
        this.active = true;
        this.collidesWithWall = true;
        this.pierces = false;
        this.bounces = false;
        this.playersHit = [];
        this.shootsBack = false;
    }

    hit(player) {
        if (!player.active) return;
        if (!this.hitPlayer(player.id)) {
            for (let i = 0; i < this.effects.length; i++) {
                this.effects[i].apply(player);
            }
            this.playersHit.push(player);
        }
        if (!this.pierces && !this.bounces) this.active = false;
    }

    hitPlayer(id) {
        let did = false;
        for (let i = 0; i < this.playersHit.length; i++) {
            if (this.playersHit[i].id == id) {
                did = true;
                break;
            }
        }
        return did;
    }

    move(deltaTime) {
        super.move(deltaTime);
        this.traveledDistance += deltaTime * this.speed;
    }

    shootBack() {
        this.shootsBack = false;
        this.playersHit = [];
        this.traveledDistance = 0;
        this.range = distVector(this.pos, this.owner.pos);
        this.dir = subVector(this.owner.pos, this.pos);
        this.fixDir();
    }

    bounce(axis) {
        if (axis == 0) {
            this.dir[0] *= -1;
        } else {
            this.dir[1] *= -1;
        }
        this.increaseRangeForBouncing();
    }

    increaseRangeForBouncing() {
        this.playersHit = [];
        this.range = maxValue(0, this.range - this.maxRange * 0.03);
        this.traveledDistance = maxValue(0, this.traveledDistance - this.maxRange * 0.3);
    }
}

class ServerLavaPool extends LavaPool {
    constructor(owner) {
        super(owner);
        this.activationTime = 0.75;
    }
}

module.exports = {
    ServerGame,
    ServerPlayer
}
