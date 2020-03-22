class Effect {
    constructor(){
    }

    apply(){

    }
}

class DamageEffect extends Effect {
    constructor(value){
        super();
        this.value = value;
    }

    apply(player){
        player.takeDamage(this.value);
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