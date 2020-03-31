const classes = require('./classesS.js');
const effects = require('./effects.js');
const utils = require('./utilsS.js');
const consts = require('./constsS.js');

const normalizeVector = utils.normalizeVector;
const distVector = utils.distVector;
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

const DamageEffect = effects.DamageEffect;
const ProjDamage = effects.ProjDamage;
const SlowEffect = effects.SlowEffect;
const FastEffect = effects.FastEffect;
const StunEffect = effects.StunEffect;
const WaitEffect = effects.WaitEffect;
const ProjPush = effects.ProjPush;
const ProjPull = effects.ProjPull;


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
        this.starTimer = 0;
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
                    'areaHealing': plr.areaHealing
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
                    'range': proj.range,
                    'traveledDistance': proj.traveledDistance
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
                    'active': star.active
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

        this.sendMessages();

        this.manageStars(deltaTime);

        this.cleanInactiveObjects();

    }

    manageStars(deltaTime){
        if(this.stars.length == 0){
            if(this.starTimer == 0){
                let data = {
                    'id': this.getNewUniqueId(),
                    'pos': [this.mapWidth / 2, this.mapHeight / 2],
                    'radius': 40
                };
                let star = this.buildStar(data);
                this.addStar(star);
                this.starTimer = 15;
            } else {
                this.starTimer = maxValue(0, this.starTimer - deltaTime);
            }
        }

        for(let i = 0; i < this.players.length; i++){
            let plr = this.players[i];
            if(!plr.active) return;

            for(let j = 0; j < this.stars.length; j++){
                let str = this.stars[j];
                if(!str.active) return;

                if(distVector(plr.pos, str.pos) < plr.radius + str.radius){
                    this.removeStar(str.id);
                    plr.points += 3;
                    this.io.emit('update', {'id': plr.id, 'points': plr.points});
                }
            }
        }
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
                    if (plr.active && proj.owner.id != plr.id && plr.imaterial == 0) {
                        if (plr.reflecting > 0) {

                            let minDist = plr.radius + proj.radius + consts.SKILL_ZITOR_SHIELD_EXTRA_RADIUS;

                            if (distVector(plr.pos, proj.pos) < minDist) {
                                let colisionDir = subVector(proj.pos, plr.pos);
                                colisionDir = normalizeVector(colisionDir);
                                proj.owner = plr;
                                proj.traveledDistance = 0;
                                proj.dir = [colisionDir[0], colisionDir[1]];
                                proj.speed *= consts.SKILL_ZITOR_SHIELD_SPEED_MULTIPLIER;
                                this.io.emit('updateprojectile', { 'id': proj.id, 'dir': proj.dir, 'speed': proj.speed });
                            }

                        } else {
                            if (distVector(proj.pos, plr.pos) < proj.radius + plr.radius) {
                                proj.hit(plr);
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

        for (let i = this.players.length - 1; i >= 0; i--) {
            if (!this.players[i].active && this.players[i].respawn == 0) {
                let plr = this.players[i];
                let data = {
                    'id': plr.id,
                    'nickname': plr.nickname,
                    'color': plr.color,
                    'radius': plr.radius,
                    'build': plr.build,
                    'points': plr.points
                }
                let newPlr = this.buildPlayer(data);
                newPlr.socket = plr.socket;
                this.players[i] = newPlr;

                // plr.life = plr.maxLife;
                // plr.isAttacking = false;
                // plr.attackDelay = 0;
                // plr.slowEffects = [];
                // plr.fastEffects = [];
                // plr.slow = 1;
                // plr.fast = 1;
                // plr.stunned = 0;
                // plr.silenced = 0;
                // plr.reflecting = 0;
                // plr.invisible = false;
                // plr.imaterial = 0;
                // plr.areaHealing = 0;
                // plr.pos = [Math.random() * this.mapWidth, Math.random() * this.mapHeight];
                // plr.active = true;
                // for (let i = 0; i < plr.activesInfo.length; i++) {
                //     plr.activesInfo[i].coldown = 0;
                // }
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
                    'range': 600,
                    'radius': 10,
                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                proj = this.buildProjectile(player.id, projData);

                proj.effects.push(new ProjDamage(proj, 20));

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

                    proj.effects.push(new ProjDamage(proj, 2));

                    this.addProjectile(proj);
                    this.io.emit('newprojectile', projData);
                }

                break;
            case 2:
                projData = {
                    'id': this.getNewUniqueId(),
                    'color': [0, 0, 255],
                    'speed': 2600,
                    'range': 900,
                    'radius': 10,
                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                proj = this.buildProjectile(player.id, projData);

                proj.effects.push(new ProjDamage(proj, 35));

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

                proj.effects.push(new ProjDamage(proj, 12));
                proj.effects.push(new SlowEffect(0.4, 0.5));

                this.addProjectile(proj);
                this.io.emit('newprojectile', projData);

                break;
            case 4:
                projData = {
                    'id': this.getNewUniqueId(),
                    'color': [0, 255, 255],
                    'speed': 2500,
                    'range': 700,
                    'radius': 8,
                    'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                    'dir': [player.aimDir[0], player.aimDir[1]],
                }
                proj = this.buildProjectile(player.id, projData);

                proj.effects.push(new ProjDamage(proj, 7));

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
                if (player.silenced > 0) return;

                if (player.activesInfo[skill].coldown == 0) {
                    let projData, proj;
                    player.activesInfo[skill].coldown = player.activesInfo[skill].maxColdown;
                    this.io.emit('update', { 'id': player.id, 'activesInfo': player.activesInfo });
                    switch (player.activesInfo[skill].skill) {
                        case 0:
                            let flashDist = 250;
                            // if (player.dir[0] != 0 || player.dir[1] != 0) {
                            //     player.pos = [player.pos[0] + player.dir[0] * flashDist, player.pos[1] + player.dir[1] * flashDist];
                            // } else {
                                player.pos = [player.pos[0] + player.aimDir[0] * flashDist, player.pos[1] + player.aimDir[1] * flashDist];
                            // }
                            this.io.emit('update', {'id': player.id, 'pos': player.pos});
                            break;
                        case 1:
                            player.addSlowEffect(0.2, 0.5);
                            let wait = new WaitEffect(new FastEffect(2, 1), 0.5);
                            player.waitEffects.push(wait);
                            break;
                        case 2:
                            projData = {
                                'id': this.getNewUniqueId(),
                                'color': [0, 0, 0],
                                'speed': 500,
                                'range': 750,
                                'radius': 60,
                                'pos': [player.pos[0] + player.aimDir[0] * player.radius, player.pos[1] + player.aimDir[1] * player.radius],
                                'dir': [player.aimDir[0], player.aimDir[1]],
                            }
                            proj = this.buildProjectile(player.id, projData);

                            proj.effects.push(new StunEffect(1.3));

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
                            player.imaterial += 1.5;
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
                                    'range': 450,
                                    'radius': 9,
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
                                'range': 600,
                                'radius': 45,
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
                            // let finalDir;
                            // if (player.dir[0] != 0 || player.dir[1] != 0) {
                            //     finalDir = [player.dir[0], player.dir[1]];
                            // } else {
                            //     finalDir = [player.aimDir[0], player.aimDir[1]];
                            // }
                            player.takeForce(player.aimDir, 3000, 0.17);
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
                attackSpeed = 0.85;
                break;
            case 3:
                attackSpeed = 1.75;
                break;
            case 4:
                attackSpeed = 3;
                break;
            default:
                break;
        }

        data.attackSpeed = attackSpeed;

        data.pos = [Math.random() * this.mapWidth, Math.random() * this.mapHeight];

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
        let owner;
        for(let i = 0; i < this.players.length; i++){
            if(this.players[i].id == ownerId){
                owner = this.players[i];
                break;
            }
        }

        let proj = new ServerProjectile(owner);
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

    buildStar(data) {
        let star = new GameObject();
        this.updateStar(star, data);
        return star;
    }

    addStar(star){
        this.stars.push(star);
        this.io.emit('newstar', this.getStarData(star.id));
    }

    removeStar(id){
        super.removeStar(id);
        this.io.emit('removestar', { 'id': id });
    }
}

class ServerPlayer extends Player {
    constructor(game) {
        super();
        this.game = game;
        this.respawn = 0;
        this.attackIntent = false;
        this.socket;
        this.attacked = false;
        this.messages = [];
        this.slowEffects = [];
        this.fastEffects = [];
        this.waitEffects = [];
        this.invisibleTimer = 0;
    }

    attack(deltaTime) {
        if (!this.isAttacking && this.attackIntent) {
            this.addSlowEffect(0.35, 1 / this.attackSpeed);
            //this.takeSilence(1 / this.attackSpeed);
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
                this.addSlowEffect(0.35, 1 / this.attackSpeed);
                //this.takeSilence(1 / this.attackSpeed);
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
        } else {
            this.respawn = maxValue(0, this.respawn - deltaTime);
        }
    }

    applyAreaHeal(deltaTime) {
        for (let i = 0; i < this.game.players.length; i++) {
            let player = this.game.players[i];
            if (!player.active) return;

            if (distVector(this.pos, player.pos) < consts.SKILL_HEALAREA_RADIUS + player.radius) {
                player.heal(consts.SKILL_HEALAREA_HEALPERSECOND * deltaTime);
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
                'id': this.socket.id,
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
                'id': this.socket.id,
                'fast': this.fast,
                'pos': this.pos
            }
        });

    }

    takeDamage(source, value) {
        this.life = maxValue(0, this.life - value);
        this.messages.push({
            'type': 'update',
            'data': { 'id': this.id, 'life': this.life }
        });
        if (this.life == 0) {
            source.points++;
            this.active = false;
            this.points = maxValue(0, this.points - 1);
            this.messages.push({
                'type': 'update',
                'data': { 'id': this.id, 'points': this.points, 'active': this.active }
            });
            this.messages.push({
                'type': 'update',
                'data': { 'id': source.id, 'points': source.points }
            });
            this.respawn = 3;
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
    }

    hit(player) {
        if (!player.active) return;
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