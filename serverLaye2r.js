const classes = require('./classesS.js');
const Game = classes.Game;
const Player = classes.Player;
const Projectile = classes.Projectile;
//

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
                    'build': plr.build
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
    }

    checkProjectiles() {
        for (let i = 0; i < this.projectiles.length; i++) {
            //checking colision between projectiles and map extremes
            let proj = this.projectiles[i];
            //checking colision between players and map extremes
            if (proj.pos[0] - proj.radius < 0 ||
                proj.pos[0] + proj.radius > this.mapWidth ||
                proj.pos[1] - proj.radius < 0 ||
                proj.pos[1] + proj.radius > this.mapHeight) {
                this.removeProjectile(proj.id);
            }

            //checking if projectile traveled too far
            if (proj.traveledDistance > proj.range) {
                this.removeProjectile(proj.id);
            }
        }

    }

    executeBasicAttack(player) {
        switch (player.build.basicAttack) {
            case 0:
                let projData = {
                    'id': this.getNewUniqueId(),
                    'color': [255, 0, 0],
                    'speed': 1000,
                    'range': 1000,
                    'damage': 30,
                    'radius': 10,
                    'pos': [player.pos[0], player.pos[1]],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                let proj = this.buildProjectile(player.id, projData);
                this.addProjectile(proj);
                this.io.emit('newprojectile', projData);
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
    }

    attack(deltaTime) {
        if (!this.isAttacking && this.attackIntent) {
            this.isAttacking = true;
            this.socket.emit('update', {
                'id': this.socket.id,
                'isAttacking': true
            });
        }
        if (this.attackDelay == 1 / this.attackSpeed) {
            this.attackDelay = 0;
            this.attacked = true;
            if (!this.attackIntent) {
                this.isAttacking = false;
                this.socket.emit('update', {
                    'id': this.socket.id,
                    'isAttacking': false,
                    'attackDelay': 0,
                });
            }
        }
        super.attack(deltaTime);
    }
}

class ServerProjectile extends Projectile {
    constructor(ownerId) {
        super();
        this.ownerId = ownerId;
    }
}

module.exports = {
    ServerGame,
    ServerPlayer
}