//MAP
const MAP_WIDTH = 2250;
const MAP_HEIGHT = 2250;

//AREA HEAL SKILL
const SKILL_HEALAREA_RADIUS = 310;
const SKILL_HEALAREA_DURATION = 5;
const SKILL_HEALAREA_HEALPERSECOND = 13;

//ESCUDO DE ZITOR SKILL
const SKILL_ZITORSHIELD_DURATION = 0.65;
const SKILL_ZITOR_SHIELD_EXTRA_RADIUS = 40;
const SKILL_ZITOR_SHIELD_SPEED_MULTIPLIER = 1.5;

//CLIENT ONLY
///////////////////////////////////////////////////////////////////////////////////////////////////////
const VIRTUAL_WIDTH = 1570; //Virtual width
const VIRTUAL_HEIGHT = 883; //virtual HEIGHT
const VIRTUAL_MIDDLE_X = Math.round(VIRTUAL_WIDTH / 2); //x coordinate of middle of screen
const VIRTUAL_MIDDLE_Y = Math.round(VIRTUAL_HEIGHT / 2); //y coordinate of middle of screen

const CAMERA_MAX_OFFSET = Math.round(VIRTUAL_WIDTH * 0.1); //max cam offset when hovering around

const MAP_SQUARE_STEP = 150;
const MAP_HORIZONTAL_SQUARES = Math.round(MAP_WIDTH / MAP_SQUARE_STEP);
const MAP_VERTICAL_SQUARES = Math.round(MAP_HEIGHT / MAP_SQUARE_STEP);

const SKILLS_IMAGENS_POS_X = Math.round(VIRTUAL_WIDTH * 0.15);
const SKILLS_IMAGENS_POS_Y = Math.round(VIRTUAL_HEIGHT - 90);

const LIFE_GLOBE_X = 120;
const LIFE_GLOBE_Y = VIRTUAL_HEIGHT - 110;

const CHAT_BG_POS_X = Math.round(VIRTUAL_WIDTH * 0.7);
const CHAT_BG_POS_Y = Math.round(VIRTUAL_HEIGHT * 0.63);
const CHAT_BG_WIDTH = Math.round(VIRTUAL_WIDTH * 0.3);
const CHAT_BG_HEIGHT = Math.round(VIRTUAL_HEIGHT * 0.28);

const CHAT_MSG_POS_X = Math.round(VIRTUAL_WIDTH * 0.705);
const CHAT_MSG_POS_Y = Math.round(VIRTUAL_HEIGHT * 0.84);
const CHAT_MSG_WIDTH = Math.round(VIRTUAL_WIDTH * 0.295);
const CHAT_MSG_HEIGHT = Math.round(VIRTUAL_HEIGHT * 0.08);
const CHAT_MSG_OFFSET_STEP = Math.round(VIRTUAL_HEIGHT * 0.1);

const CHAT_TYPINGRECT_POS_X = Math.round(VIRTUAL_WIDTH * 0.7);
const CHAT_TYPINGRECT_POS_Y = Math.round(VIRTUAL_HEIGHT * 0.92);
const CHAT_TYPINGRECT_WIDTH = Math.round(VIRTUAL_WIDTH * 0.3);
const CHAT_TYPINGRECT_HEIGHT = Math.round(VIRTUAL_HEIGHT * 0.075);

const CHAT_TYPINGMSG_POS_X = Math.round(VIRTUAL_WIDTH * 0.705);
const CHAT_TYPINGMSG_POS_Y = Math.round(VIRTUAL_HEIGHT * 0.93);
const CHAT_TYPINGMSG_WIDTH = Math.round(VIRTUAL_WIDTH * 0.296);
const CHAT_TYPINGMSG_HEIGHT = Math.round(VIRTUAL_HEIGHT * 0.065);

const RANK_POS_X = Math.round(VIRTUAL_WIDTH / 4);
const RANK_POS_Y = Math.round(VIRTUAL_HEIGHT * 0.1);
const RANK_WIDTH = Math.round(VIRTUAL_WIDTH / 2);
const RANK_HEIGHT = Math.round(VIRTUAL_HEIGHT * 0.8);

const SKILL_HEALAREA_DIAMETER = SKILL_HEALAREA_RADIUS * 2;

const SKILL_ZITOR_SHIELD_EXTRA_DIAMETER = SKILL_ZITOR_SHIELD_EXTRA_RADIUS * 2;