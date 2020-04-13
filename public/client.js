var scaleRatio; //relation between window dimentions and virtual screen dimentions
var realW, realH; //real dimentions after adapting to window screen
var realOx, realOy; //real origin coordinates after adapting to window screen
var mousePos = []; //adapted mouse coordinates after adapting window screen

var socket;
var clientId;

var deltaTime = 0; //variation in time from last frame
var prevDate = Date.now(); //last date saved, used to calculate deltatime

var game;
var inGame = false;

var canvas, form;

var skillsInfo = [];
var passivesInfo = [];
var bowsInfo = [];
var actives = [0, 1, 2];
var passives = [0, 1, 2];
var weapon = 0;
var displayedFps = 0;

function preload() {
    for (let i = 0; i < 13; i++) {
        skillsInfo[i] = {
            'image': loadImage('./images/skill' + i + '.png'),
            'description': getSkillDescription(i)
        };
    }
    for (let i = 0; i < 10; i++) {
        passivesInfo[i] = {
            'image': loadImage('./images/passive' + i + '.png'),
            'description': getPassiveDescription(i)
        };
    }
    for (let i = 0; i < 6; i++) {
        bowsInfo[i] = {
            'image': loadImage('./images/bow' + i + '.png'),
            'description': getBowDescription(i)
        };
    }

}

function setup() {
    createCanvas(windowWidth, windowHeight);
    windowResized();

    socket = io();
    registerEvents();

    frameRate(999);

    noSmooth();

    document.onkeydown = function (event) {
        if (event.key == "Tab") {
            event.preventDefault();
        }
    };

    form = document.getElementById('form');
    canvas = document.getElementById('defaultCanvas0');
    canvas.style.display = 'none';

    buildForm();
}

function getBowDescription(bow) {
    let result = 'This skill does something awesome';
    switch (bow) {
        case 0:
            result = 'Arco simples: Faz de tudo, mas nada com excelência';
            break;
        case 1:
            result = 'Besta pesada: Dispara inúmeras flechas de curto alcance que se espalham em um cone a sua frente';
            break;
        case 2:
            result = 'Arco do caçador: Dispara uma flecha precisa que ganha força enquanto viaja';
            break;
        case 3:
            result = 'Arco gélico: Suas flechas causam lentidão';
            break;
        case 4:
            result = 'Arco pequeno: Dispara com alta frequência flechas que quicam';
            break;
        case 5:
            result = 'Arco magnético: Suas flechas vão e vem enquanto perfuram paredes e inimigos';
            break;
        default:
            break;
    }

    return result;
}

function getSkillDescription(skill) {
    let result = 'This skill does something awesome';
    switch (skill) {
        case 0:
            result = 'Realiza um teletransporte curto na direção do cursor';
            break;
        case 1:
            result = 'Após um breve momento de lentidão, concede ume explosão de velocidade de movimento por um curto período de tempo';
            break;
        case 2:
            result = 'Dispara um projétil que atravessa paredes e atordoa o primeiro alvo que atingir';
            break;
        case 3:
            result = 'Cria um escudo a sua volta que reflete os projéteis com os quais colide';
            break;
        case 4:
            result = 'Te torna invisível por um curto período de tempo';
            break;
        case 5:
            result = 'Te torna imaterial por um curto período de tempo, ignorando todos os tipos de colisão';
            break;
        case 6:
            result = 'Dispara projéteis a sua frente que empurram os inimigos que forem atingidos';
            break;
        case 7:
            result = 'Dispara um projétil que puxa para perto o primeiro inimigo que atingir';
            break;
        case 8:
            result = 'Cria uma área de cura a sua volta que regenera a vida de todos os jogadores próximos';
            break;
        case 9:
            result = 'Desliza rapidamente na direção do cursor';
            break;
        case 10:
            result = 'Explode seus projéteis aplicando seus efeitos em uma curta área no local da explosão';
            break;
        case 11:
            result = 'Cria uma poça de lava na posição do cursor que causa dano em quem está nela';
            break;
        case 12:
            result = 'Lança um projetil que explode na posição do cursor e empurra todos os jogadores próximos para longe do local da explosão';
            break;
        default:
            break;
    }

    return result;
}

function getPassiveDescription(passive) {
    let result = 'This skill does something awesome';
    switch (passive) {
        case 0:
            result = 'Recarregar seu arco não mais te deixa lento';
            break;
        case 1:
            result = 'Sua regeneração de vida é significativamente maior';
            break;
        case 2:
            result = 'Sua velocidade de movimento é significativamente maior';
            break;
        case 3:
            result = 'A velocidade de recarga do seu arco e significativamente maior';
            break;
        case 4:
            result = 'Você empurra para longe os inimigos que estão próximos a você';
            break;
        case 5:
            result = 'Você causa dano aos inimigos que estão muito próximos a você';
            break;
        case 6:
            result = 'Sua vida máxima é significativamente maior';
            break;
        case 7:
            result = 'Todo dano causado por você é aumentado significativamente';
            break;
        case 8:
            result = 'O tempo de recarga de suas habilidades é significativamente menor';
            break;
        case 9:
            result = 'Sempre que eliminar um adversário, suas velocidades de recarga e movimento aumentam';
            break;
        default:
            break;
    }

    return result;
}

function buildForm() {
    let bowDiv = document.getElementById('bowImages');
    let bowInfo = document.getElementById('bowInfo');
    for (let j = 0; j < 6; j++) {
        let bow = new Image();
        bow.src = './images/bow' + j + '.png';
        bow.style.margin = 4;
        bow.width = 50;
        bow.classList.add('bow');
        if (j == 0) {
            bow.classList.add('selected');
            bowInfo.textContent = getBowDescription(j);
        }
        bow.addEventListener('click', function () {
            weapon = j;
            let els = document.getElementsByClassName('bow');
            for (let k = 0; k < els.length; k++) {
                els[k].classList.remove('selected');
            }
            bow.classList.add('selected');
            bowInfo.textContent = getBowDescription(j);
        });
        bowDiv.appendChild(bow);
    }

    for (let i = 0; i < 3; i++) {
        let skillsDiv = document.getElementById('skillImages' + i);
        let skillInfo = document.getElementById('skillInfo' + i);
        for (let j = 0; j < 13; j++) {
            let skill = new Image();
            skill.src = './images/skill' + j + '.png';
            skill.style.margin = 4;
            skill.width = 50;
            skill.classList.add('skill' + i);
            if (j == i) {
                skill.classList.add('selected');
                skillInfo.textContent = getSkillDescription(j);
            }
            skill.addEventListener('click', function () {
                let validated = true;
                for (let k = 0; k < actives.length; k++) {
                    if (actives[k] == j) {
                        validated = false;
                        break;
                    }
                }

                if (validated) {
                    actives[i] = j;
                    let els = document.getElementsByClassName('skill' + i);
                    for (let k = 0; k < els.length; k++) {
                        els[k].classList.remove('selected');
                    }
                    skill.classList.add('selected');
                    skillInfo.textContent = getSkillDescription(j);
                }
            });
            skillsDiv.appendChild(skill);
        }
    }

    for (let i = 0; i < 3; i++) {
        let passiveDiv = document.getElementById('passiveImages' + i);
        let passiveInfo = document.getElementById('passiveInfo' + i);
        for (let j = 0; j < 10; j++) {
            let passive = new Image();
            passive.src = './images/passive' + j + '.png';
            passive.style.margin = 4;
            passive.width = 50;
            passive.classList.add('passive' + i);
            if (j == i) {
                passive.classList.add('selected');
                passiveInfo.textContent = getPassiveDescription(j);
            }
            passive.addEventListener('click', function () {
                let validated = true;
                for (let k = 0; k < passives.length; k++) {
                    if (passives[k] == j) {
                        validated = false;
                        break;
                    }
                }

                if (validated) {
                    passives[i] = j;
                    let els = document.getElementsByClassName('passive' + i);
                    for (let k = 0; k < els.length; k++) {
                        els[k].classList.remove('selected');
                    }
                    passive.classList.add('selected');
                    passiveInfo.textContent = getPassiveDescription(j);
                }
            });
            passiveDiv.appendChild(passive);
        }
    }
}

function sendForm() {
    let color = hexToRgb(document.getElementById('color').value);

    socket.emit('joinrequest', {
        'nickname': document.getElementById('nickname').value,
        'color': [color.r, color.g, color.b],
        'radius': 55,
        'build': {
            'basicAttack': weapon,
            'actives': actives,
            'passives': passives
        }
    });

    canvas.style.display = 'block';
    form.style.display = 'none';
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function registerEvents() {
    socket.on('welcome', function (data) {
        clientId = data.id;
    });

    socket.on('joinaccept', function (data) {
        if (data.id == clientId) {
            game = new ClientGame();
            inGame = true;
        }
    });

    socket.on('matchstate', function (data) {
        if (inGame) game.inMatch = data;
    });

    socket.on('newplayer', function (data) {
        if (inGame) game.addPlayer(data);
    });

    socket.on('newexplosion', function(data){
        if(inGame) game.animations.push(new ExplosionAnimation(data));
    });

    socket.on('newrevexplosion', function(data){
        if(inGame) game.animations.push(new RevExplosionAnimation(data));
    });

    socket.on('removeplayer', function (data) {
        if (inGame) game.removePlayer(data.id);
    });

    socket.on('update', function (data) {
        if (inGame) {
            for (let i = 0; i < game.players.length; i++) {
                if (game.players[i].id == data.id) {
                    game.updatePlayer(game.players[i], data);
                    break;
                }
            }
        }
    });

    socket.on('updateprojectile', function (data) {
        if (inGame) {
            for (let i = 0; i < game.projectiles.length; i++) {
                if (game.projectiles[i].id == data.id) {
                    game.updateProjectile(game.projectiles[i], data);
                    break;
                }
            }
        }
    });

    socket.on('pingtest', function () {
        socket.emit('pingtest');
    });

    socket.on('newprojectile', function (data) {
        if (inGame) game.addProjectile(data);
    });

    socket.on('newstar', function (data) {
        if (inGame) game.addStar(data);
    });

    socket.on('newrelic', function (data) {
        if (inGame) game.addRelic(data);
    });

    socket.on('newlavapool', function (data) {
        if (inGame) game.addLavaPool(data);
    });

    socket.on('walls', function (data) {
        if (inGame) {
            game.walls = data;
            for (let i = 0; i < game.walls.length; i++) {
                for (let j = 0; j < game.walls[0].length; j++) {
                    if (!game.walls[i][j]) continue;
                    let value = map(dist(i, j, (MAP_HORIZONTAL_SQUARES - 1) / 2, (MAP_VERTICAL_SQUARES - 1) / 2),
                        0, dist(0, 0, (MAP_HORIZONTAL_SQUARES - 1) / 2, (MAP_VERTICAL_SQUARES - 1) / 2),
                        1, 0)
                    game.mapColors[i][j] = [round(100 + value * 60), round(30 + value * 50), round(value * 30)];
                }
            }
        }
    });

    socket.on('holes', function (data) {
        if (inGame) {
            game.holes = data;
        }
    });

    socket.on('updatestar', function (data) {
        if (inGame) {
            for (let i = 0; i < game.stars.length; i++) {
                if (game.stars[i].id == data.id) {
                    game.updateStar(game.stars[i], data);
                    break;
                }
            }
        }
    });

    socket.on('updaterelic', function (data) {
        if (inGame) {
            for (let i = 0; i < game.relics.length; i++) {
                if (game.relics[i].id == data.id) {
                    game.updateRelic(game.relics[i], data);
                    break;
                }
            }
        }
    });

    socket.on('updatelavapool', function (data) {
        if (inGame) {
            for (let i = 0; i < game.lavaPools.length; i++) {
                if (game.lavaPools[i].id == data.id) {
                    game.updateLavaPool(game.lavaPools[i], data);
                    break;
                }
            }
        }
    });

    socket.on('removeprojectile', function (data) {
        if (inGame) game.removeProjectile(data.id);
    });

    socket.on('removestar', function (data) {
        if (inGame) game.removeStar(data.id);
    });

    socket.on('removerelic', function (data) {
        if (inGame) game.removeRelic(data.id);
    });

    socket.on('removelavapool', function (data) {
        if (inGame) game.removeLavaPool(data.id);
    });

    socket.on('chatmessage', function (data) {
        if (inGame) game.addChatMessage(data.message);
    });

    socket.on('announcement', function (data) {
        if (inGame) game.addAnnouncement(data.message);
    });

    socket.on('matchduration', function (data) {
        if (inGame) game.matchDuration = data;
    });

    socket.on('timemultiplier', function(data){
        if (inGame) game.timeMultiplier = data;
    });

}

function sendMessage(type, data) {
    socket.emit(type, data);
}

function draw() {
    background(15);
    calculateDeltaTime();
    adaptMouse();
    push();
    adaptScreen();
    push()
    if (inGame) game.update(deltaTime);
    pop();
    if (inGame) if (game.inGame) game.drawUI();
    if (inGame) game.displayChat(deltaTime);
    if (inGame) game.displayAnnouncements(deltaTime);
    if (inGame) game.drawRanking();
    drawStats();
    pop();
    drawBoundaries();
}

function drawStats() {
    fill(255, 255, 0);
    stroke(0)
    strokeWeight(1);
    textSize(16);
    if (inGame && game.inGame) text((int)(game.camReference.latency * 1000) + ' ms', VIRTUAL_WIDTH - 45, VIRTUAL_HEIGHT - 10);
    text('FPS: ' + (int)(displayedFps), VIRTUAL_WIDTH - 120, VIRTUAL_HEIGHT - 10);

    if (frameCount % 20 == 0) displayedFps = frameRate();
}

function calculateDeltaTime() {
    let newDate = Date.now();
    deltaTime = (newDate - prevDate) / 1000;
    prevDate = newDate;
}

function adaptMouse() {
    mousePos = [(mouseX - realOx) / scaleRatio, (mouseY - realOy) / scaleRatio];
}

function keyPressed() {
    if (inGame) {
        game.keyMonitor.set(key, true);
        game.checkInput();
        game.checkKeyPressed(key);
    }
}

function keyReleased() {
    if (inGame) {
        game.keyMonitor.set(key, false);
        game.checkInput();
    }
}

function mousePressed(event) {
    if (inGame) {
        game.keyMonitor.set(event.button, true);
        game.checkInput();
        game.checkMousePressed(mouseButton);
    }
}

function mouseReleased(event) {
    if (inGame) {
        game.keyMonitor.set(event.button, false);
        game.checkInput();
    }
}