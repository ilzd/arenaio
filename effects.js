const utils = require('./utilsS.js');
const mapValue = utils.mapValue;
const distVector = utils.distVector;
const distVectorSqr = utils.distVectorSqr;
const subVector = utils.subVector;
const normalizeVector = utils.normalizeVector;

class Effect {
    constructor() {
    }

    apply() {

    }
}

class DamageEffect extends Effect {
    constructor(source, value) {
        super();
        this.value = value;
        this.source = source;
    }

    apply(player) {
        player.takeDamage(this.source, this.value);
    }
}

class ProjDamage extends Effect {
    constructor(proj, damage) {
        super();
        this.proj = proj;
        this.damage = damage;
    }

    apply(player) {
        player.takeDamage(this.proj.owner, this.damage);
    }
}

class DistProjDamage extends Effect {
    constructor(proj, minDamage, maxDamage) {
        super();
        this.proj = proj;
        this.minDamage = minDamage;
        this.maxDamage = maxDamage;
    }

    apply(player) {
        player.takeDamage(this.proj.owner,
            mapValue(this.proj.traveledDistance, 0, this.proj.range, this.minDamage, this.maxDamage));
    }
}

class SlowEffect extends Effect {
    constructor(value, duration) {
        super();
        this.value = value;
        this.duration = duration;
    }

    apply(player) {
        player.addSlowEffect(this.value, this.duration);
    }
}

class FastEffect extends Effect {
    constructor(value, duration) {
        super();
        this.value = value;
        this.duration = duration
    }

    apply(player) {
        player.addFastEffect(this.value, this.duration);
    }
}

class StunEffect extends Effect {
    constructor(duration) {
        super();
        this.duration = duration;
    }

    apply(player) {
        player.takeStun(this.duration);
    }
}

class WaitEffect extends Effect {
    constructor(effect, duration) {
        super();
        this.duration = duration;
        this.effect = effect;
    }

    apply(player) {
        this.effect.apply(player);
    }
}

class ProjPush extends Effect {
    constructor(proj, speed, duration) {
        super();
        this.proj = proj;
        this.speed = speed;
        this.duration = duration;
    }

    apply(player) {
        player.takeSilence(this.duration);
        player.takeForce([this.proj.dir[0], this.proj.dir[1]], this.speed, this.duration);
    }
}

class ProjPull extends Effect {
    constructor(proj, speed) {
        super();
        this.proj = proj;
        this.speed = speed;
    }

    apply(player) {
        let duration = (this.proj.traveledDistance + 10) / this.speed;
        player.takeSilence(duration);
        player.takeForce([this.proj.dir[0] * -1, this.proj.dir[1] * -1], this.speed, duration);
    }
}

class AreaPush extends Effect {
    constructor(proj, players, radius, speed, io) {
        super();
        this.proj = proj;
        this.players = players;
        this.radius = radius;
        this.speed = speed;
        this.io = io;
    }

    apply() {
        this.io.emit('newrevexplosion', {
            'pos': this.proj.pos,
            'radius': this.radius,
            'color': this.proj.color
        });
        for (let i = 0; i < this.players.length; i++) {
            let plr = this.players[i];
            if (!plr.active) continue;

            let minDist = this.radius + plr.radius;
            let dist = distVector(plr.pos, this.proj.pos);
            if (dist < minDist) {
                let pushDir = subVector(plr.pos, this.proj.pos);
                pushDir = normalizeVector(pushDir);
                let duration = (this.radius - dist + plr.radius) / this.speed;
                plr.takeSilence(duration);
                plr.takeForce([pushDir[0], pushDir[1]], this.speed, duration);
            }
        }
    }
}

module.exports = {
    DamageEffect,
    ProjDamage,
    SlowEffect,
    FastEffect,
    StunEffect,
    WaitEffect,
    ProjPush,
    ProjPull,
    DistProjDamage,
    AreaPush,
}