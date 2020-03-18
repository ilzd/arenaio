function calculateScreenAdaptation() {
    scaleRatio = min(width / VIRTUAL_WIDTH, height / VIRTUAL_HEIGHT);
    realW = (VIRTUAL_WIDTH * scaleRatio);
    realH = (VIRTUAL_HEIGHT * scaleRatio);
    realOx = (width / 2 - realW / 2);
    realOy = (height / 2 - realH / 2);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    calculateScreenAdaptation();
}

function adaptScreen() {
    translate(realOx, realOy);
    scale(scaleRatio);
}

function drawBoundaries() {
    noStroke();
    fill(0);
    rect(0, 0, realOx, height);
    rect(width - realOx, 0, realOx, height);
    rect(0, 0, width, realOy);
    rect(0, height - realOy, width, realOy);
}