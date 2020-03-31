class ClientGame extends Game {
    constructor() {
        super();
        this.camReference;
        this.keyMonitor = new Map();
        this.prevDir = [0, 0];
        this.prevAttacking;
        this.cameraOffset = [0, 0];
        this.mapWidth = MAP_WIDTH;
        this.mapHeight = MAP_HEIGHT;
        this.displayChatTimer = 0;
        this.chatMessages = [];
        this.typing = false;
        this.chatMessage = '';
        this.eraseDelay = 0;
        this.lookDir = [0, 0];
        this.mapStep = 200;
        this.mapColors = [];
        for (let i = 0; i < MAP_HORIZONTAL_SQUARES; i++) {
            this.mapColors[i] = [];
            for (let j = 0; j < MAP_VERTICAL_SQUARES; j++) {
                this.mapColors[i][j] = [noise(i / 8, j / 8) * 50, noise(i / 12, j / 12) * 100 + 50, noise(i / 10, j / 10) * 100 + 25];
            }
        }
        this.skillKeys = ['RMB', 'E', 'SPC']
    }

    update(deltaTime) {
        if (!this.inGame) return;
        super.update(deltaTime);
        this.positionCamera();
        this.drawMap();
        this.drawStars(deltaTime);
        this.drawPlayers();
        this.drawProjectiles();
        this.checkPlayerAim();
        // this.checkForErasing(deltaTime);
    }

    addChatMessage(message) {
        this.chatMessages.push(message);
        if (this.chatMessages.length > 3) this.chatMessages.splice(0, 1);
        this.displayChatTimer = 3;
    }

    displayChat(deltaTime) {
        this.displayChatTimer = max(0, this.displayChatTimer - deltaTime);
        if (this.displayChatTimer > 0 || this.typing) {
            noStroke();

            fill(0, 30);
            rect(CHAT_BG_POS_X, CHAT_BG_POS_Y, CHAT_BG_WIDTH, CHAT_BG_HEIGHT);

            fill(255);

            //let tSize = 24;
            let vOffset = 0;
            textSize(20);

            for (let i = this.chatMessages.length - 1; i >= 0; i--) {
                //textSize(tSize);
                text(this.chatMessages[i], CHAT_MSG_POS_X, CHAT_MSG_POS_Y - vOffset, CHAT_MSG_WIDTH, CHAT_MSG_HEIGHT);
                //tSize -= 1;
                vOffset += CHAT_MSG_OFFSET_STEP;
            }
        }
        if (this.typing) {
            rect(CHAT_TYPINGRECT_POS_X, CHAT_TYPINGRECT_POS_Y, CHAT_TYPINGRECT_WIDTH, CHAT_TYPINGRECT_HEIGHT);
            noStroke();
            fill(0);
            text(this.chatMessage, CHAT_TYPINGMSG_POS_X, CHAT_TYPINGMSG_POS_Y, CHAT_TYPINGMSG_WIDTH, CHAT_TYPINGMSG_HEIGHT);
        }
    }

    drawStars(deltaTime) {
        for (let i = 0; i < this.stars.length; i++) {
            this.stars[i].display(deltaTime);
        }
    }

    drawPlayers() {
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].display(this.players[i].id == clientId);
        }
    }

    positionCamera() {
        this.lookDir = [constrainValue(mousePos[0], 0, VIRTUAL_WIDTH) - VIRTUAL_WIDTH / 2,
        constrainValue(mousePos[1], 0, VIRTUAL_HEIGHT) - VIRTUAL_HEIGHT / 2];
        this.cameraOffset[0] = map(this.lookDir[0], -VIRTUAL_MIDDLE_X, VIRTUAL_MIDDLE_X, -CAMERA_MAX_OFFSET, CAMERA_MAX_OFFSET);
        this.cameraOffset[1] = map(this.lookDir[1], -VIRTUAL_MIDDLE_Y, VIRTUAL_MIDDLE_Y, -CAMERA_MAX_OFFSET, CAMERA_MAX_OFFSET);
        translate(VIRTUAL_MIDDLE_X - this.camReference.pos[0] - this.cameraOffset[0], VIRTUAL_MIDDLE_Y - this.camReference.pos[1] - this.cameraOffset[1]);
    }

    drawMap() {
        noStroke();
        for (let i = 0; i < MAP_HORIZONTAL_SQUARES; i++) {
            for (let j = 0; j < MAP_VERTICAL_SQUARES; j++) {
                fill(this.mapColors[i][j]);
                rect(i * MAP_SQUARE_STEP, j * MAP_SQUARE_STEP, MAP_SQUARE_STEP + 1, MAP_SQUARE_STEP + 1);
            }
        }
    }

    drawUI() {

        for (let i = 0; i < this.camReference.activesInfo.length; i++) {
            let skill = this.camReference.activesInfo[i];
            if (skill.coldown == 0) {
                noTint();
            } else {
                tint(100);
            }

            image(skillsImgs[skill.skill], SKILLS_IMAGENS_POS_X + i * 100, SKILLS_IMAGENS_POS_Y, 80, 80);

            noStroke();
            fill(0);
            rect(SKILLS_IMAGENS_POS_X + i * 100, SKILLS_IMAGENS_POS_Y, 80, map(skill.coldown, 0, skill.maxColdown, 0, 80));

            textSize(26);
            fill(255);

            if (skill.coldown > 0) {
                let cd = round(skill.coldown * 10) / 10;
                text(nf(cd, 0, 1), SKILLS_IMAGENS_POS_X + i * 100 + 4, SKILLS_IMAGENS_POS_Y + 74);
            }

            textSize(14);
            text(this.skillKeys[i], SKILLS_IMAGENS_POS_X + i * 100 + 4, SKILLS_IMAGENS_POS_Y + 15);

            noFill();
            rect(VIRTUAL_WIDTH * 0.15 + i * 100, VIRTUAL_HEIGHT - 90, 80, 80);

            stroke(0);
            strokeWeight(2);
            rect(SKILLS_IMAGENS_POS_X + i * 100, SKILLS_IMAGENS_POS_Y, 80, 80);
        }

        noStroke();

        fill(255);
        let ang = map(this.camReference.prevLife, 0, this.camReference.maxLife, PI, 0);
        arc(LIFE_GLOBE_X, LIFE_GLOBE_Y, 200, 200, -HALF_PI + ang, -HALF_PI - ang, OPEN);

        fill(255, 0, 0);
        ang = map(this.camReference.life, 0, this.camReference.maxLife, PI, 0);
        arc(LIFE_GLOBE_X, LIFE_GLOBE_Y, 200, 200, -HALF_PI + ang, -HALF_PI - ang, OPEN);

        stroke(0);
        noFill();
        ellipse(LIFE_GLOBE_X, LIFE_GLOBE_Y, 200, 200);

        if (!this.camReference.active) {
            noStroke();
            fill(0, 150);
            rect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        }
    }

    drawRanking() {
        this.sortPlayers();
        fill(0, 150);
        noStroke();
        push();
        translate(RANK_POS_X, RANK_POS_Y);
        rect(0, 0, RANK_WIDTH, RANK_HEIGHT);
        fill(255);
        textSize(32);
        for (let i = 0; i < 10; i++) {
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
        if (this.typing) return;
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

    // checkForErasing(deltaTime){
    //     if(this.typing && this.keyMonitor.get('Backspace')){
    //         this.eraseDelay -= deltaTime;
    //         if(this.eraseDelay < 0 && frameCount % 3 == 0)
    //         if (this.chatMessage.length > 0) this.chatMessage = this.chatMessage.substring(0, this.chatMessage.length - 1);
    //     } else {
    //         this.eraseDelay = 0.6;
    //     }
    // }

    checkMousePressed(mouseKey) {
        if (mouseKey == RIGHT) {
            sendMessage('skillused', { 'id': clientId, 'skill': 0 });
        }
    }

    checkKeyPressed(key) {
        if (keyCode == ENTER) {
            if (this.typing) {
                this.typing = false;
                if (this.chatMessage.length > 0)
                    socket.emit('chatmessage', { 'message': this.camReference.nickname + ': ' + this.chatMessage });
                this.chatMessage = '';
            } else {
                this.typing = true;
            }
        } else {

            if (!this.typing) {

                switch (key) {
                    case 'e':
                        sendMessage('skillused', { 'id': clientId, 'skill': 1 });
                        break;
                    case ' ':
                        sendMessage('skillused', { 'id': clientId, 'skill': 2 });
                        break;
                    default:
                        break;
                }

            } else {

                if (keyCode == BACKSPACE) {
                    if (this.chatMessage.length > 0) this.chatMessage = this.chatMessage.substring(0, this.chatMessage.length - 1);
                } else if (keyCode == ESCAPE) {
                    this.typing = false;
                    this.chatMessage = '';
                } else {
                    let keyText = '' + key;
                    if (keyText.length == 1)
                        this.chatMessage += key;
                }

            }
        }
    }

    checkPlayerAim() {
        this.camReference.aimDir = [mousePos[0] - VIRTUAL_MIDDLE_X + this.cameraOffset[0], mousePos[1] - VIRTUAL_MIDDLE_Y + this.cameraOffset[1]];
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

    buildStar(data) {
        let star = new Star();
        this.updateStar(star, data);
        return star;
    }

    addStar(data) {
        this.stars.push(this.buildStar(data));
    }
}

class ClientPlayer extends Player {
    constructor() {
        super();
        this.prevLife = 0;
    }

    display(isReference) {

        if (!this.active) {
            noFill();
            stroke(0);
            strokeWeight(4);
            ellipse(this.pos[0], this.pos[1], this.radius * 2, this.radius * 2);
            return;
        }

        if (!isReference && this.invisible) return;

        if (this.areaHealing > 0) {
            stroke(255, 255, 0);
            strokeWeight(5);
            noFill();
            ellipse(this.pos[0], this.pos[1], SKILL_HEALAREA_DIAMETER, SKILL_HEALAREA_DIAMETER);
        }

        stroke(0);
        strokeWeight(2);

        if (this.imaterial == 0) {
            fill(this.color);
        } else {
            noFill();
        }

        ellipse(this.pos[0], this.pos[1], this.radius * 2, this.radius * 2);

        let attackState = mapValue(this.attackDelay, 0, 1 / this.attackSpeed, this.radius, 0);
        ellipse(this.pos[0] + this.aimDir[0] * attackState, this.pos[1] + this.aimDir[1] * attackState, this.radius * 0.3, this.radius * 0.3);
        ellipse(this.pos[0] + this.aimDir[0] * this.radius, this.pos[1] + this.aimDir[1] * this.radius, this.radius * 0.4, this.radius * 0.4);

        if (!this.invisible) {
            fill(255);
            textAlign(CENTER, CENTER);
            textSize(20);
            text(this.nickname, this.pos[0], this.pos[1]);
        }

        if (this.reflecting > 0) {
            noFill();
            stroke(255, 255, 0);
            ellipse(this.pos[0], this.pos[1], this.radius * 2 + SKILL_ZITOR_SHIELD_EXTRA_DIAMETER, this.radius * 2 + SKILL_ZITOR_SHIELD_EXTRA_DIAMETER);
        }

        noStroke();
        fill(0);
        rect(this.pos[0] - this.radius, this.pos[1] + this.radius * 1.1, this.radius * 2, this.radius * 0.35);
        fill(255, 255, 255);
        rect(this.pos[0] - this.radius, this.pos[1] + this.radius * 1.1, map(this.prevLife, 0, this.maxLife, 0, this.radius * 2), this.radius * 0.35);
        fill(255, 0, 0);
        rect(this.pos[0] - this.radius, this.pos[1] + this.radius * 1.1, map(this.life, 0, this.maxLife, 0, this.radius * 2), this.radius * 0.35);

    }

    attack(deltaTime) {
        super.attack(deltaTime);
        if (this.attackDelay == 1 / this.attackSpeed) this.attackDelay = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (this.prevLife < this.life) {
            this.prevLife = this.life;
        } else {
            this.prevLife -= deltaTime * 100;
        }
    }
}

class ClientProjectile extends Projectile {
    constructor() {
        super();
    }

    display() {
        stroke(0);
        strokeWeight(2);
        fill(this.color);
        let dia = this.radius * 2;
        ellipse(this.pos[0], this.pos[1], dia, dia);
    }
}

class Star extends GameObject {
    constructor() {
        super();
        this.animationBase = Math.random() * TWO_PI;
    }

    display(deltaTime) {
        noStroke();
        fill(255, 255, 0);
        push();
        let p = -0.707 * this.radius;
        let size = 0.707 * this.radius - p;
        translate(this.pos[0], this.pos[1]);
        rotate(this.animationBase);
        rect(p, p, size, size);
        rotate(PI / 4);
        rect(p, p, size, size);
        pop();
        this.animationBase += deltaTime;
    }
}