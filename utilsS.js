function normalizeVector(vet){
    let mag = magVector(vet);
    let result = [vet[0], vet[1]];
    if(mag > 0){
        result[0] /= mag;
        result[1] /= mag;
    }
    return result;
}

function subVector(v1, v2){
    return [v1[0] - v2[0], v1[1] - v2[1]];
}

function addVector(v1, v2){
    return [v1[0] + v2[0], v1[1] + v2[1]];
}

function multVector(vet, scalar){
    return [vet[0] * scalar, vet[1] * scalar];
}

function magVector(vet){
    return Math.sqrt(vet[0] * vet[0] + vet[1] * vet[1]);
}

function distVector(v1, v2){
    return magVector(subVector(v2, v1));
}

module.exports = {
    normalizeVector: normalizeVector,
    subVector: subVector,
    addVector: addVector,
    multVector: multVector,
    magVector: magVector,
    distVector: distVector
}