class PingTool {
    constructor(io) {
        this.io = io;
        this.playerData = [];
        this.triggerWait = 0.4;
        this.sampleSize = 5;
    }

    newData(socket) {
        this.playerData.push({
            'socket': socket,
            'pingHistory': [],
            'latency': 0,
            'triggerWait': this.triggerWait,
            'waiting': false
        });
    }

    removeData(id){
        for(let i = 0; i < this.playerData.length; i++){
            if(this.playerData[i].socket.id == id){
                this.playerData.splice(i, 1);
                break;
            }
        }
    }

    update(deltaTime){
        for(let i = 0; i < this.playerData.length; i++){
            let data = this.playerData[i];
            if(data.waiting){
                data.latency += deltaTime;
            } else {
                data.triggerWait -= deltaTime;
                if(data.triggerWait < 0){
                    data.waiting = true;
                    data.triggerWait = this.triggerWait;
                    data.socket.emit('pingtest');
                }
            }
        }
    }

    testResponse(id){
        let result = {'done': false, 'ping': 0};
        for(let i = 0; i < this.playerData.length; i++){
            if(this.playerData[i].socket.id == id){
                let data = this.playerData[i];
                data.pingHistory.push(data.latency);
                data.latency = 0;
                data.waiting = false;
                if(data.pingHistory.length == this.sampleSize){
                    result.done = true;
                    let value = 0;
                    for(let j = 0; j < data.pingHistory.length; j++){
                        value += data.pingHistory[j];
                    }
                    value /= this.sampleSize;
                    result.ping = value / 2; 
                    data.pingHistory = [];
                }
                break;
            }
        }
        return result;
    }
}

module.exports = {
    PingTool
}