class ClientGame extends Game {
    constructor() {
        super();
        this.camReference;
        this.keyMonitor = new Map();
        this.prevDir = [0, 0];
        this.prevAttacking;
        this.cameraOffset = [0, 0];
    }

    update(deltaTime) {
        if(!this.inGame) return;
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
        let lookDir = [constrainValue(mousePos[0], 0, VIRTUAL_WIDTH) - VIRTUAL_WIDTH / 2,
        mousePos[1] - VIRTUAL_HEIGHT / 2];
        this.cameraOffset[0] = map(lookDir[0], -VIRTUAL_WIDTH / 2, VIRTUAL_WIDTH / 2, -VIRTUAL_WIDTH * 0.1, VIRTUAL_WIDTH * 0.1);
        this.cameraOffset[1] = map(lookDir[1], -VIRTUAL_HEIGHT / 2, VIRTUAL_HEIGHT / 2, -VIRTUAL_WIDTH * 0.1, VIRTUAL_WIDTH * 0.1);
        translate(-this.camReference.pos[0] - this.cameraOffset[0], -this.camReference.pos[1] - this.cameraOffset[1]);
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

    drawRanking() {
        this.sortPlayers();
        fill(0, 150);
        stroke(0);
        strokeWeight(1);
        push();
        translate(VIRTUAL_WIDTH / 4, VIRTUAL_HEIGHT * 0.1);
        rect(0, 0, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.8);
        fill(255);
        textSize(32)
        for (let i = 0; i < 5; i++) {
            if (this.players.length > i)
                text((i + 1) + '. ' + this.players[i].nickname + ' - ' + this.players[i].points + ' points', 10, 42 * (i + 1));
        }
        pop();
    }

    sortPlayers() {
        let count = 1;
        while (count > 0) {
            count = 0;
            for (let i = 0; i < this.players.length - 1; i++) {
                let plr1 = this.players[i], plr2 = this.players[i + 1];
                let aux;
                if (plr1.points < plr2.points) {
                    count++;
                    aux = plr2;
                    this.players[i + 1] = plr1;
                    this.players[i] = aux;
                }
            }
        }
    }

    drawProjectiles() {
        for (let i = 0; i < this.projectiles.length; i++) {
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

        if (this.keyMonitor.get(0) != this.prevAttacking) {
            this.prevAttacking = this.keyMonitor.get(0);
            sendMessage('attacking', {
                'id': clientId,
                'intent': this.prevAttacking
            });
        }
    }

    checkPlayerAim() {
        this.camReference.aimDir = [mousePos[0] - VIRTUAL_WIDTH / 2 + this.cameraOffset[0], mousePos[1] - VIRTUAL_HEIGHT / 2 + this.cameraOffset[1]];
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
        strokeWeight(3);
        textAlign(CENTER, CENTER);
        textSize(20);

        text(this.nickname, this.pos[0], this.pos[1]);

        let attackState = mapValue(this.attackDelay, 0, 1 / this.attackSpeed, this.radius, 0);
        ellipse(this.pos[0] + this.aimDir[0] * attackState, this.pos[1] + this.aimDir[1] * attackState, this.radius * 0.3, this.radius * 0.3);
        ellipse(this.pos[0] + this.aimDir[0] * this.radius, this.pos[1] + this.aimDir[1] * this.radius, this.radius * 0.4, this.radius * 0.4);

        noStroke();
        fill(0);
        rect(this.pos[0] - this.radius, this.pos[1] + this.radius * 1.1, this.radius * 2, this.radius * 0.2);
        fill(255, 0, 0);
        rect(this.pos[0] - this.radius, this.pos[1] + this.radius * 1.1, map(this.life, 0, this.maxLife, 0, this.radius * 2), this.radius * 0.2);
    }

    attack(deltaTime) {
        super.attack(deltaTime);
        if (this.attackDelay == 1 / this.attackSpeed) this.attackDelay = 0;
    }
}

class ClientProjectile extends Projectile {
    constructor() {
        super();
    }

    display() {
        stroke(0);
        strokeWeight(1);
        fill(this.color);
        let dia = this.radius * 2;
        ellipse(this.pos[0], this.pos[1], dia, dia);
    }
}