class Effect {
    constructor(){
    }

    apply(){

    }
}

class DamageEffect extends Effect {
    constructor(source, value){
        super();
        this.value = value;
        this.source = source;
    }

    apply(player){
        player.takeDamage(this.source, this.value);
    }
}

class SlowEffect extends Effect {
    constructor(value, duration){
        super();
        this.value = value;
        this.duration = duration
    }

    apply(player){
        player.addSlowEffect(this.value, this.duration);
    }
}

module.exports = {
    DamageEffect,
    SlowEffect
}