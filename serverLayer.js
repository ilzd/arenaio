const classes = require('./classesS.js');
const effects = require('./effects.js')
const utils = require('./utilsS.js');

const normalizeVector = utils.normalizeVector;
const distVector = utils.distVector;
const subVector = utils.subVector;
const magVector = utils.magVector;
const multVector = utils.multVector;
const constrainValue = utils.constrainValue;
const maxValue = utils.maxValue;
const minValue = utils.minValue;
const angleFromX = utils.angleFromX;

const Game = classes.Game;
const Player = classes.Player;
const Projectile = classes.Projectile;

const DamageEffect = effects.DamageEffect;
const SlowEffect = effects.SlowEffect;

class ServerGame extends Game {
    constructor(io) {
        super();
        this.io = io;
        this.latencyData = [];
        this.pingTestTriggerDelay = 0.2;
        this.pingTestSampleSize = 5;
        this.uniqueId = 0;
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
                    'pos': plr.pos,
                    'radius': plr.radius,
                    'dir': plr.dir,
                    'speed': plr.speed,
                    'color': plr.color,
                    'nickname': plr.nickname,
                    'latency': plr.latencym,
                    'aimDir': plr.aimDir,
                    'attackSpeed': plr.attackSpeed,
                    'isAttacking': plr.isAttacking,
                    'attackDelay': plr.attackDelay,
                    'build': plr.build,
                    'points': plr.points,
                    'maxLife': plr.maxLife,
                    'life': plr.life
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
        super.update(deltaTime);
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

        this.cleanInactiveObjects();

        this.sendMessages();
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
                //checking colision between players and map extremes
                if (proj.pos[0] - proj.radius < 0 ||
                    proj.pos[0] + proj.radius > this.mapWidth ||
                    proj.pos[1] - proj.radius < 0 ||
                    proj.pos[1] + proj.radius > this.mapHeight) {
                    proj.active = false;
                }

                //checking if projectile traveled too far
                if (proj.traveledDistance > proj.range) {
                    proj.active = false;
                }

                for (let j = 0; j < this.players.length; j++) {
                    let plr = this.players[j];
                    if (proj.ownerId != plr.id) {
                        if (distVector(proj.pos, plr.pos) < proj.radius + plr.radius) {
                            proj.hit(plr);
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
                    'range': 600,
                    'radius': 10,
                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                proj = this.buildProjectile(player.id, projData);

                proj.effects.push(new DamageEffect(20));

                this.addProjectile(proj);
                this.io.emit('newprojectile', projData);

                break;
            case 1:
                for (let i = 0; i < 30; i++) {
                    let aimAngle = angleFromX(player.aimDir);
                    let projAngle = aimAngle - Math.PI * 0.2 + Math.random() * (Math.PI * 0.4);
                    let projDir = [Math.cos(projAngle), -Math.sin(projAngle)];
                    projData = {
                        'id': this.getNewUniqueId(),
                        'color': [255, 255, 0],
                        'speed': 750 + Math.random() * 1000,
                        'range': 400,
                        'radius': 5,
                        'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                        'dir': [projDir[0], projDir[1]],
                    }
                    proj = this.buildProjectile(player.id, projData);

                    proj.effects.push(new DamageEffect(2));

                    this.addProjectile(proj);
                    this.io.emit('newprojectile', projData);
                }

                break;
            case 2:
                projData = {
                    'id': this.getNewUniqueId(),
                    'color': [0, 0, 255],
                    'speed': 2000,
                    'range': 900,
                    'radius': 10,
                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                proj = this.buildProjectile(player.id, projData);

                proj.effects.push(new DamageEffect(35));

                this.addProjectile(proj);
                this.io.emit('newprojectile', projData);

                break;
            case 3:
                projData = {
                    'id': this.getNewUniqueId(),
                    'color': [200, 255, 255],
                    'speed': 1500,
                    'range': 600,
                    'radius': 15,
                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                proj = this.buildProjectile(player.id, projData);

                proj.effects.push(new DamageEffect(25));
                proj.effects.push(new SlowEffect(0.5, 0.5));

                this.addProjectile(proj);
                this.io.emit('newprojectile', projData);

                break;
            default:
                break;
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
        let player = new ServerPlayer();
        this.updatePlayer(player, data);
        return player;
    }

    addPlayer(socket, player) {
        player.socket = socket;
        this.players.push(player);
        this.addLatencyData(socket);
    }

    removePlayer(id) {
        super.removePlayer(id);
        this.removeLatencyData(id);
    }

    buildProjectile(ownerId, data) {
        let proj = new ServerProjectile(ownerId);
        this.updateProjectile(proj, data);
        return proj;
    }

    addProjectile(proj) {
        this.projectiles.push(proj);
    }

    removeProjectile(id) {
        super.removeProjectile(id);
        this.io.emit('removeprojectile', { 'id': id });
    }
}

class ServerPlayer extends Player {
    constructor() {
        super();
        this.attackIntent = false;
        this.socket;
        this.attacked = false;
        this.messages = [];
        this.slowEffects = [];
    }

    attack(deltaTime) {
        if (!this.isAttacking && this.attackIntent) {
            this.addSlowEffect(0.2, 1 / this.attackSpeed);
            this.isAttacking = true;
            this.messages.push({
                'type': 'update',
                'data': {
                    'id': this.socket.id,
                    'isAttacking': true
                }
            });
        }
        if (this.attackDelay == 1 / this.attackSpeed) {
            this.attackDelay = 0;
            this.attacked = true;
            if (!this.attackIntent) {
                this.isAttacking = false;
                this.messages.push({
                    'type': 'update',
                    'data': {
                        'id': this.socket.id,
                        'isAttacking': false,
                        'attackDelay': 0,
                    }
                });
            } else {
                this.addSlowEffect(0.2, 1 / this.attackSpeed);
            }
        }
        super.attack(deltaTime);
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.updateSlowEffects(deltaTime);
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

    addSlowEffect(value, duration) {
        this.slowEffects.push({ 'value': value, 'duration': duration });
        this.sortSlowEffects();
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
                'id': this.socket.id,
                'slow': this.slow,
                'pos': this.pos
            }
        });

    }

    takeDamage(value) {
        this.life = maxValue(0, this.life - value);
        this.messages.push({
            'type': 'update',
            'data': { 'id': this.id, 'life': this.life }
        });
    }
}

class ServerProjectile extends Projectile {
    constructor(ownerId) {
        super();
        this.ownerId = ownerId;
        this.effects = [];
        this.active = true;
    }

    hit(player) {
        for (let i = 0; i < this.effects.length; i++) {
            this.effects[i].apply(player);
        }
        this.active = false;
    }

    move(deltaTime) {
        super.move(deltaTime);
        this.traveledDistance += deltaTime * this.speed;
    }
}

module.exports = {
    ServerGame,
    ServerPlayer
}