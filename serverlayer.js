const classes = require('./classesS.js');
const Game = classes.Game;
const Player = classes.Player;

class ServerGame extends Game {
    constructor(io) {
        super();
        this.io = io;
        this.latencyData = [];
        this.pingTestTriggerDelay = 0.2;
        this.pingTestSampleSize = 5;
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

    removeLatencyData(id){
        for(let i = 0; i < this.latencyData.length; i++){
            if(this.latencyData[i].socket.id == id){
                this.latencyData.splice(i, 1);
                break;
            }
        }
    }

    update(deltaTime){
        super.update(deltaTime);
        for(let i = 0; i < this.latencyData.length; i++){
            let data = this.latencyData[i];
            if(data.waiting){
                data.latency += deltaTime;
            } else {
                data.triggerWait -= deltaTime;
                if(data.triggerWait < 0){
                    data.waiting = true;
                    data.triggerWait = this.pingTestTriggerDelay;
                    data.socket.emit('pingtest');
                }
            }
        }
    }

    pingTestResult(id){
        let result = {'done': false, 'ping': 0};
        for(let i = 0; i < this.latencyData.length; i++){
            if(this.latencyData[i].socket.id == id){
                let data = this.latencyData[i];
                data.pingHistory.push(data.latency);
                data.latency = 0;
                data.waiting = false;
                if(data.pingHistory.length == this.pingTestSampleSize){
                    result.done = true;
                    let value = 0;
                    for(let j = 0; j < data.pingHistory.length; j++){
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

    addPlayer(socket, data){
        this.players.push(this.buildPlayer(data));
        this.addLatencyData(socket);
    }

    removePlayer(id){
        super.removePlayer(id);
        this.removeLatencyData(id);
    }
}

class ServerPlayer extends Player{
    constructor(){
        super();
    }
}

module.exports = {
    ServerGame
}