const VIRTUAL_WIDTH = 1366, VIRTUAL_HEIGHT = 768; //virtual screen dimentions
var scaleRatio; //relation between window dimentions and virtual screen dimentions
var realW, realH; //real dimentions after adapting to window screen
var realOx, realOy; //real origin coordinates after adapting to window screen
var mousePos = []; //adapted mouse coordinates after adapting window screen

var socket;

var deltaTime = 0; //variation in time from last frame
var prevDate = Date.now(); //last date saved, used to calculate deltatime

var game = new Game();

function setup() {
    createCanvas(windowWidth, windowHeight);
    windowResized();
    socket = io();
    registerEvents();

    frameRate(999);

    socket.emit('joinrequest', {
        'color': [123, 321, 333],
        'radius': 80
    });
}

function draw() {
    background(80);
    calculateDeltaTime();
    adaptMouse();
    game.update(deltaTime);

    clientLayer();

    drawBoundaries();
}

function calculateDeltaTime() {
    let newDate = Date.now();
    deltaTime = (newDate - prevDate) / 1000;
    prevDate = newDate;
}

function adaptMouse() {
    mousePos = [(mouseX - realOx) / scaleRatio, (mouseY - realOy) / scaleRatio];
}