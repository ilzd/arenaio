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
        this.blockSize = MAP_SQUARE_STEP;
        this.displayChatTimer = 0;
        this.chatMessages = [];
        this.announcements = [];
        this.typing = false;
        this.chatMessage = '';
        this.eraseDelay = 0;
        this.lookDir = [0, 0];
        this.mapStep = 200;
        this.mapColors = [];
        for (let i = 0; i < MAP_HORIZONTAL_SQUARES; i++) {
            this.mapColors[i] = [];
            for (let j = 0; j < MAP_VERTICAL_SQUARES; j++) {
                //this.mapColors[i][j] = [noise(i / 8, j / 8) * 50, noise(i / 12, j / 12) * 100 + 50, noise(i / 10, j / 10) * 100 + 25];
                this.mapColors[i][j] = [25,
                    map(dist(i, j, (MAP_HORIZONTAL_SQUARES - 1) / 2, (MAP_VERTICAL_SQUARES - 1) / 2),
                        0, dist(0, 0, (MAP_HORIZONTAL_SQUARES - 1) / 2, (MAP_VERTICAL_SQUARES - 1) / 2),
                        120, 30),
                    50]
            }
        }
        this.skillKeys = ['RMB', 'E', 'SPC'];
        this.animations = [];
    }

    update(deltaTime) {
        if (!this.inGame) return;
        super.update(deltaTime);
        this.positionCamera();
        this.drawMap();
        this.drawLavaPools();
        this.updateAnimations(deltaTime);
        this.drawStars(deltaTime);
        this.drawRelics(deltaTime);
        this.drawPlayers(deltaTime);
        this.drawProjectiles();
        this.checkPlayerAim();
        // this.checkForErasing(deltaTime);
    }

    updateAnimations(deltaTime) {
        for (let i = this.animations.length - 1; i >= 0; i--) {
            this.animations[i].update(deltaTime);
            this.animations[i].display();
            if (!this.animations[i].active) this.animations.splice(i, 1);
        }
    }

    addAnnouncement(message) {
        this.announcements.push({ 'message': message, 'duration': 3 });
        if (this.announcements.length > 3) this.announcements.splice(0, 1);
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

    displayAnnouncements(deltaTime) {
        push();
        textAlign(CENTER, CENTER);
        let vOffset = 0;
        let tSize = 25;
        stroke(0);
        strokeWeight(1);
        fill(255);

        for (let i = this.announcements.length - 1; i >= 0; i--) {
            let ann = this.announcements[i];
            textSize(tSize);

            text(ann.message, ANNOUNCEMENT_POS_X, ANNOUNCEMENT_POS_Y + vOffset);

            ann.duration = maxValue(0, ann.duration - deltaTime);
            if (ann.duration == 0) {
                this.announcements.splice(i, 1);
            }

            vOffset -= 30;
            tSize -= 3;
        }

        pop();
    }

    drawStars(deltaTime) {
        for (let i = 0; i < this.stars.length; i++) {
            this.stars[i].display(deltaTime);
        }
    }

    drawRelics(deltaTime) {
        for (let i = 0; i < this.relics.length; i++) {
            this.relics[i].display(deltaTime);
        }
    }

    drawLavaPools() {
        for (let i = 0; i < this.lavaPools.length; i++) {
            this.lavaPools[i].display();
        }
    }

    drawPlayers(deltaTime) {
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].display(this.players[i].id == clientId, deltaTime);
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

            image(skillsInfo[skill.skill].image, SKILLS_IMAGENS_POS_X + i * 90, SKILLS_IMAGENS_POS_Y, 70, 70);

            noStroke();
            fill(0);
            rect(SKILLS_IMAGENS_POS_X + i * 90, SKILLS_IMAGENS_POS_Y, 70, map(skill.coldown, 0, skill.maxColdown, 0, 70));

            textSize(26);
            fill(255);

            if (skill.coldown > 0) {
                let cd = round(skill.coldown * 10) / 10;
                text(nf(cd, 0, 1), SKILLS_IMAGENS_POS_X + i * 90 + 4, SKILLS_IMAGENS_POS_Y + 64);
            }

            stroke(0);
            strokeWeight(2);
            textSize(14);
            text(this.skillKeys[i], SKILLS_IMAGENS_POS_X + i * 90 + 4, SKILLS_IMAGENS_POS_Y + 15);

            noFill();
            //rect(VIRTUAL_WIDTH * 0.15 + i * 100, VIRTUAL_HEIGHT - 90, 70, 70);

            rect(SKILLS_IMAGENS_POS_X + i * 90, SKILLS_IMAGENS_POS_Y, 70, 70);

            fill(255);
            textSize(40);
            let min = Math.trunc(this.matchDuration / 60);
            let sec = maxValue(Math.trunc(this.matchDuration % 60), 0);
            text(nf(min, 2, 0) + ':' + nf(sec, 2, 0), MATCH_DURATION_POS_X, MATCH_DURATION_POS_Y);
        }

        noStroke();

        fill(255);
        let ang = map(this.camReference.prevLife, 0, this.camReference.maxLife, PI, 0);
        arc(LIFE_GLOBE_X, LIFE_GLOBE_Y, 190, 190, -HALF_PI + ang, -HALF_PI - ang, OPEN);

        fill(255, 0, 0);
        ang = map(this.camReference.life, 0, this.camReference.maxLife, PI, 0);
        arc(LIFE_GLOBE_X, LIFE_GLOBE_Y, 190, 190, -HALF_PI + ang, -HALF_PI - ang, OPEN);

        stroke(0);
        noFill();

        ellipse(LIFE_GLOBE_X, LIFE_GLOBE_Y, 190, 190);

        fill(255);
        textSize(24);
        push();
        textAlign(CENTER, CENTER);
        text(Math.round(this.camReference.life) + ' / ' + Math.round(this.camReference.maxLife), LIFE_GLOBE_X, LIFE_GLOBE_Y);
        pop();

        if (!this.camReference.active) {
            noStroke();
            fill(0, 150);
            rect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        }
    }

    drawRanking() {
        this.sortPlayers();

        if (!this.inMatch) {
            push();
            translate(RANK_POS_X, RANK_POS_Y);
            fill(0, 127);
            stroke(0);
            strokeWeight(4);
            rect(0, 0, RANK_WIDTH, RANK_HEIGHT);
            noStroke();
            textSize(28);
            for (let i = 0; i < 10; i++) {
                if (i == 0) {
                    fill(218, 165, 32);
                } else if (i == 1) {
                    fill(192, 192, 192);
                } else if (i == 2) {
                    fill(191, 137, 112);
                } else {
                    fill(255);
                }
                if (this.players.length > i)
                    text((i + 1) + 'º ' + this.players[i].nickname + ' - ' + this.players[i].points + ' points', 10, 42 * (i + 1));
            }
            pop();
        } else {
            noStroke();
            let foundMe = false;
            let tSize = 28;
            for (let i = 0; i < 3; i++) {
                if (this.players.length > i) {
                    textSize(tSize);

                    if (this.players[i].id == clientId) {
                        foundMe = true;
                        fill(255, 150, 150);
                    } else {
                        fill(255 - (i * 20));
                    }
                    let txt = (i + 1) + 'º ' + this.players[i].nickname + ' - ' + this.players[i].points + ' pontos';
                    text(txt, VIRTUAL_WIDTH - textWidth(txt) - 20, 42 * (i + 1));
                    tSize -= 3;
                }
            }
            if (!foundMe) {
                for (let j = 3; j < this.players.length; j++) {
                    if (this.players[j].id == clientId) {
                        textSize(25);
                        fill(255, 150, 150);
                        let txt = (j + 1) + 'º ' + this.players[j].nickname + ' - ' + this.players[j].points + ' pontos';
                        text(txt, VIRTUAL_WIDTH - textWidth(txt) - 20, 180);
                        break;
                    }
                }
            }
        }
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
            sendMessage('mousedist', { 'id': this.camReference.id, 'dist': distVector(addVector(mousePos, this.cameraOffset), [VIRTUAL_MIDDLE_X, VIRTUAL_MIDDLE_Y]) });
            sendMessage('skillused', { 'id': clientId, 'skill': 0 });
        }
    }

    checkKeyPressed(key) {
        if (keyCode == ENTER) {
            if (this.typing) {
                this.typing = false;
                if (this.chatMessage.length > 0)
                    socket.emit('chatmessage', { 'id': this.camReference.id, 'nickname': this.camReference.nickname, 'message': this.chatMessage });
                this.chatMessage = '';
            } else {
                this.typing = true;
            }
        } else {

            if (!this.typing) {

                switch (key) {
                    case 'e':
                        sendMessage('mousedist', { 'id': this.camReference.id, 'dist': distVector(addVector(mousePos, this.cameraOffset), [VIRTUAL_MIDDLE_X, VIRTUAL_MIDDLE_Y]) });
                        sendMessage('skillused', { 'id': clientId, 'skill': 1 });
                        break;
                    case ' ':
                        sendMessage('mousedist', { 'id': this.camReference.id, 'dist': distVector(addVector(mousePos, this.cameraOffset), [VIRTUAL_MIDDLE_X, VIRTUAL_MIDDLE_Y]) });
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

        switch (player.build.basicAttack) {
            case 0:
                player.bow = { 'color': [200, 0, 0], 'width': 1.2, 'height': 3 }
                break;
            case 1:
                player.bow = { 'color': [255, 255, 0], 'width': 1.2, 'height': 3 }
                break;
            case 2:
                player.bow = { 'color': [0, 0, 255], 'width': 1.5, 'height': 4 }
                break;
            case 3:
                player.bow = { 'color': [100, 200, 255], 'width': 1.2, 'height': 3 }
                break;
            case 4:
                player.bow = { 'color': [0, 255, 0], 'width': 0.5, 'height': 2.2 }
                break;
            case 5:
                player.bow = { 'color': [255, 0, 255], 'width': 0.75, 'height': 2.5 }
                break;
            default:
                break;
        }

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
        let star = new ClientStar();
        this.updateStar(star, data);
        return star;
    }

    buildRelic(data) {
        let relic = new ClientRelic();
        this.updateRelic(relic, data);
        return relic;
    }

    buildLavaPool(data) {
        let lavaPool = new ClientLavaPool();
        this.updateLavaPool(lavaPool, data);
        return lavaPool;
    }

    addStar(data) {
        this.stars.push(this.buildStar(data));
    }

    addRelic(data) {
        this.relics.push(this.buildRelic(data));
    }

    addLavaPool(data) {
        this.lavaPools.push(this.buildLavaPool(data));
    }
}

class ClientPlayer extends Player {
    constructor() {
        super();
        this.prevLife = 0;
        this.animationBase = Math.random() * TWO_PI;
        this.bow;
    }

    display(isReference, deltaTime) {

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

        if (this.areaDamage) {
            stroke(255, 0, 0);
            strokeWeight(3);
            noFill();
            ellipse(this.pos[0], this.pos[1], SKILL_AREADAMAGE_DIAMETER, SKILL_AREADAMAGE_DIAMETER);
        }


        if (this.imaterial == 0) {
            fill(this.color);
            noStroke();
        } else {
            noFill();
            stroke(0);
            strokeWeight(2);
        }

        push();
        translate(this.pos[0], this.pos[1]);
        rotate(this.animationBase);
        let p = -0.707 * this.radius * 1.15;
        let size = 0.707 * this.radius * 1.15 - p;
        if (!this.imaterial) {
            fill(0);
            rect(p, p, size, size);
        }
        pop();
        this.animationBase -= deltaTime * 2;

        ellipse(this.pos[0], this.pos[1], this.radius * 2, this.radius * 2);

        stroke(0);
        strokeWeight(1);
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

        noFill();
        strokeWeight(5);
        stroke(this.bow.color);
        let bowW = this.radius * mapValue(this.attackDelay, 0, 1 / this.attackSpeed, this.bow.width, this.bow.width * 0.75);
        let bowH = this.radius * mapValue(this.attackDelay, 0, 1 / this.attackSpeed, this.bow.height * 0.85, this.bow.height);
        let lineX = mapValue(this.attackDelay, 0, 1 / this.attackSpeed, 0, this.radius);

        push();
        translate(this.pos[0], this.pos[1]);
        rotate(-angleFromX(this.aimDir));
        arc(this.radius, 0, bowW, bowH, -PI / 2, PI / 2, OPEN);
        strokeWeight(1);
        stroke(255);
        line(this.radius, -bowH / 2, lineX, 0);
        line(this.radius, bowH / 2, lineX, 0);
        pop();
    }

    attack(deltaTime) {
        super.attack(deltaTime);
        //if (this.attackDelay == 1 / this.attackSpeed) this.attackDelay = 0;
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
        switch (this.type) {
            case 0:
                stroke(0);
                strokeWeight(2);
                push();
                translate(this.pos[0], this.pos[1]);
                rotate(-angleFromX(this.dir));
                line(0, 0, -55, 0);
                stroke(this.color);
                line(-60, 3, -55, 0);
                line(-60, -3, -55, 0);
                line(-50, 3, -45, 0);
                line(-50, -3, -45, 0);
                fill(this.color);
                noStroke();
                triangle(0, -2, 15, 0, 0, 2);
                pop();
                break;
            case 1:
                stroke(0);
                strokeWeight(2);
                fill(this.color);
                let dia = this.radius * 2;
                ellipse(this.pos[0], this.pos[1], dia, dia);
                break;
            default:
                break;
        }

    }
}

class ClientStar extends Star {
    constructor() {
        super();
        this.animationBase = Math.random() * TWO_PI;
    }

    display(deltaTime) {
        push();
        let p = -0.707 * this.radius;
        let size = 0.707 * this.radius - p;
        translate(this.pos[0], this.pos[1]);
        if (this.respawn == 0) {
            noStroke();
            fill(255, 255, 0);
        } else {
            noFill();
            strokeWeight(5);
            stroke(255, 255, 0);
            arc(0, 0, this.radius * 2.4, this.radius * 2.4, 0, mapValue(this.respawn, 0, this.maxRespawn, TWO_PI, 0));

            stroke(0);
            strokeWeight(1);
        }
        rotate(this.animationBase);
        rect(p, p, size, size);
        rotate(PI / 4);
        rect(p, p, size, size);
        pop();





        this.animationBase += deltaTime;
    }
}

class ClientRelic extends Relic {
    constructor() {
        super();
        this.animationBase = Math.random() * TWO_PI;
    }

    display(deltaTime) {
        push();
        translate(this.pos[0], this.pos[1]);

        let relicColor = [0, 0, 0];
        switch (this.type) {
            case 0:
                relicColor = [255, 0, 0];
                break;
            case 1:
                relicColor = [0, 255, 0];
                break;
            case 2:
                relicColor = [0, 0, 255];
                break;
            case 3:
                relicColor = [255, 255, 0];
                break;
            case 4:
                relicColor = [255, 0, 255];
                break;
            default:
                break;
        }

        if (this.respawn == 0) {
            stroke(0);
            strokeWeight(2);
            fill(relicColor);
        } else {
            noFill();
            strokeWeight(4);
            stroke(relicColor);
            arc(0, 0, this.radius * 2.5, this.radius * 2.5, 0, mapValue(this.respawn, 0, this.maxRespawn, TWO_PI, 0));

            stroke(0);
            strokeWeight(1);
        }

        let p = -0.707 * this.radius;
        let size = 0.707 * this.radius - p;
        rotate(this.animationBase);
        rect(p, p, size, size);
        p = -0.707 * this.radius / 1.6;
        size = 0.707 * this.radius / 1.6 - p;
        rotate(-this.animationBase * 6);
        rect(p, p, size, size);
        p = -0.707 * this.radius / 2.8;
        size = 0.707 * this.radius / 2.8 - p;
        rotate(this.animationBase * 12);
        rect(p, p, size, size);

        pop();

        this.animationBase += deltaTime;
    }
}

class ClientLavaPool extends LavaPool {
    constructor(owner) {
        super(owner);
        this.animationBase = Math.random() * TWO_PI;
    }

    display() {
        stroke(255, 0, 0);
        strokeWeight(4);
        if (this.activated) {
            fill(200, 0, 0);
        } else {
            noFill();
        }
        ellipse(this.pos[0], this.pos[1], this.radius * 2, this.radius * 2);
    }
}

class Animation {
    constructor() {
        this.active = true;
        this.maxDuration = 0;
        this.duration = 0;
        this.pos = [0, 0];
    }

    update(deltaTime) {
        this.duration -= deltaTime;
        if (this.duration < 0) this.active = false;
    }

    display() {

    }
}

class ExplosionAnimation extends Animation {
    constructor(data) {
        super();
        this.maxDuration = 0.3;
        this.duration = this.maxDuration;
        this.radius = data.radius;
        this.pos = data.pos;
        this.color = data.color;
    }

    display() {
        noFill();
        stroke(this.color);
        strokeWeight(2);
        let dia = map(this.duration, 0, this.maxDuration, 0, this.radius * 2);
        ellipse(this.pos[0], this.pos[1], dia, dia);
    }
}