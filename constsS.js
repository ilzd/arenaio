//MAP
const MAP_WIDTH = 2280;
const MAP_HEIGHT = 2280;
const MAP_SQUARE_STEP = 120;
const MAP_HORIZONTAL_SQUARES = Math.round(MAP_WIDTH / MAP_SQUARE_STEP);
const MAP_VERTICAL_SQUARES = Math.round(MAP_HEIGHT / MAP_SQUARE_STEP);

//AREA HEAL SKILL
const SKILL_HEALAREA_RADIUS = 310;
const SKILL_HEALAREA_DURATION = 5;
const SKILL_HEALAREA_HEALPERSECOND = 13;

//ESCUDO DE ZITOR SKILL
const SKILL_ZITORSHIELD_DURATION = 1;
const SKILL_ZITOR_SHIELD_EXTRA_RADIUS = 40;
const SKILL_ZITOR_SHIELD_SPEED_MULTIPLIER = 1.5;

//AREA DAMAGE PASSIVE
const SKILL_AREADAMAGE_RADIUS = 150;
const SKILL_AREADAMAGE_DAMAGEPERSECOND = 17;

//Explode arrows skill
const SKILL_EXPLODEARROW_RADIUS = 120;

module.exports = {
    MAP_WIDTH,
    MAP_HEIGHT,
    MAP_SQUARE_STEP,
    MAP_HORIZONTAL_SQUARES,
    MAP_VERTICAL_SQUARES,
    SKILL_HEALAREA_RADIUS,
    SKILL_HEALAREA_DURATION,
    SKILL_HEALAREA_HEALPERSECOND,
    SKILL_ZITORSHIELD_DURATION,
    SKILL_ZITOR_SHIELD_EXTRA_RADIUS,
    SKILL_ZITOR_SHIELD_SPEED_MULTIPLIER,
    SKILL_AREADAMAGE_DAMAGEPERSECOND,
    SKILL_AREADAMAGE_RADIUS,
    SKILL_EXPLODEARROW_RADIUS
}