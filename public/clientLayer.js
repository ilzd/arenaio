class ClientGame extends Game {
    constructor() {
        super();
        this.camReference;
        this.keyMonitor = new Map();
        this.prevDir = [0, 0];
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.positionCamera();
        this.drawMap();
        this.drawPlayers();
        this.drawProjectiles();
        this.checkPlayerAim();
    }

    drawPlayers() {
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].display();
        }
    }

    positionCamera() {
        translate(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);
        translate(-this.camReference.pos[0], -this.camReference.pos[1]);
    }

    drawMap() {
        stroke(0);
        strokeWeight(5);
        fill(127);
        rect(0, 0, this.mapWidth, this.mapHeight);

        stroke(0, 127);
        strokeWeight(1);
        let xStep = this.mapWidth / 20, yStep = this.mapHeight / 20;
        for (let i = 0; i < this.mapWidth; i += xStep) {
            line(i, 0, i, this.mapHeight);
        }
        for (let i = 0; i < this.mapHeight; i += yStep) {
            line(0, i, this.mapWidth, i);
        }
    }

    drawProjectiles() {
        for(let i = 0; i < this.projectiles.length; i++){
            this.projectiles[i].display();
        }
    }

    checkInput() {
        let newDir = [0, 0];
        if (this.keyMonitor.get('a')) newDir[0]--;
        if (this.keyMonitor.get('d')) newDir[0]++;
        if (this.keyMonitor.get('w')) newDir[1]--;
        if (this.keyMonitor.get('s')) newDir[1]++;
        if (newDir[0] != this.prevDir[0] || newDir[1] != this.prevDir[1]) {
            this.prevDir = newDir;
            sendMessage('newdir', {
                'id': clientId,
                'dir': newDir
            })
        }
    }

    checkPlayerAim(){
        this.camReference.aimDir = [mouseX - width / 2, mouseY - height / 2];
        this.camReference.fixAimDir();
        sendMessage('newaimdir', {
            'id': clientId,
            'aimDir': this.camReference.aimDir
        });
    }

    buildPlayer(data) {
        let player = new ClientPlayer();
        this.updatePlayer(player, data);
        return player;
    }

    addPlayer(data) {
        this.players.push(this.buildPlayer(data));
        if (data.id == clientId) {
            this.camReference = this.players[this.players.length - 1];
            this.inGame = true;
        }
    }

    buildProjectile(data) {
        let proj = new ClientProjectile();
        this.updateProjectile(proj, data);
        return proj;
    }

    addProjectile(data) {
        this.projectiles.push(this.buildProjectile(data));
    }
}

class ClientPlayer extends Player {
    constructor() {
        super();
    }

    display() {
        stroke(0);
        strokeWeight(2);
        fill(this.color);
        let dia = this.radius * 2;
        ellipse(this.pos[0], this.pos[1], dia, dia);

        fill(255)
        strokeWeight(1);
        textAlign(CENTER, CENTER);
        textSize(20);
        text(this.nickname, this.pos[0], this.pos[1]);

        ellipse(this.pos[0] + this.aimDir[0] * this.radius, this.pos[1] + this.aimDir[1] * this.radius, this.radius * 0.4, this.radius * 0.4);
    }
}

class ClientProjectile extends Projectile {
    constructor() {
        super();
    }

    display() {
        noStroke();
        fill(this.color);
        let dia = this.radius * 2;
        ellipse(this.pos[0], this.pos[1], dia, dia);
    }
}