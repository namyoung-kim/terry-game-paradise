// ===== DOM Elements =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const newRecordEl = document.getElementById('newRecord');
const hud = document.getElementById('hud');
const scoreHud = document.getElementById('scoreHud');
const timerFill = document.getElementById('timerFill');

// ===== Game Constants =====
const STAIR_WIDTH = 70;
const STAIR_HEIGHT = 22;
const STAIR_DEPTH = 12;
const CHAR_WIDTH = 24;
const CHAR_HEIGHT = 32;
const MOVE_DURATION = 120; // ms for smooth movement
const BASE_TIME_LIMIT = 3000; // ms base time limit per step
const MIN_TIME_LIMIT = 600; // ms minimum time limit
const TIME_DECAY_RATE = 0.97; // time limit multiplier per step (gets faster)

// ===== Character Definitions =====
const CHARACTERS = [
    {
        name: '공주', emoji: '👸',
        hair: '#FFD700', hairStyle: 'long',
        skin: '#ffdcb5', body: '#FF69B4', bodyDark: '#DB3585',
        legs: '#FF69B4', accessory: 'crown', accColor: '#FFD700',
        eyes: '#8B4513'
    },
    {
        name: '기사', emoji: '⚔️',
        hair: '#708090', hairStyle: 'helmet',
        skin: '#ffdcb5', body: '#708090', bodyDark: '#4a5568',
        legs: '#4a5568', accessory: 'shield', accColor: '#C0C0C0',
        eyes: '#1a1a2e'
    },
    {
        name: '유치원생', emoji: '🎒',
        hair: '#1a1a2e', hairStyle: 'short',
        skin: '#ffe0bd', body: '#FFE066', bodyDark: '#e6c84d',
        legs: '#4169E1', accessory: 'hat', accColor: '#FF6347',
        eyes: '#1a1a2e'
    },
    {
        name: '피카츄', emoji: '⚡',
        hair: '#FFD700', hairStyle: 'ears',
        skin: '#FFD700', body: '#FFD700', bodyDark: '#DAA520',
        legs: '#DAA520', accessory: 'cheeks', accColor: '#FF4500',
        eyes: '#1a1a2e'
    },
    {
        name: '닌자', emoji: '🥷',
        hair: '#1a1a2e', hairStyle: 'mask',
        skin: '#ffdcb5', body: '#1a1a2e', bodyDark: '#0d0d15',
        legs: '#1a1a2e', accessory: 'scarf', accColor: '#DC143C',
        eyes: '#87CEEB'
    },
    {
        name: '마법사', emoji: '🧙',
        hair: '#E8E8E8', hairStyle: 'long',
        skin: '#ffdcb5', body: '#4B0082', bodyDark: '#2E0054',
        legs: '#4B0082', accessory: 'wizard_hat', accColor: '#9370DB',
        eyes: '#00CED1'
    },
    {
        name: '로봇', emoji: '🤖',
        hair: '#B0B0B0', hairStyle: 'antenna',
        skin: '#C0C0C0', body: '#4682B4', bodyDark: '#36648B',
        legs: '#696969', accessory: 'visor', accColor: '#00FF00',
        eyes: '#00FF00'
    },
    {
        name: '좀비', emoji: '🧟',
        hair: '#556B2F', hairStyle: 'messy',
        skin: '#90EE90', body: '#6B8E23', bodyDark: '#4F6B1D',
        legs: '#4F6B1D', accessory: 'none', accColor: '#000',
        eyes: '#FF0000'
    },
    {
        name: '우주인', emoji: '👨‍🚀',
        hair: '#FFFFFF', hairStyle: 'helmet_round',
        skin: '#ffdcb5', body: '#F0F0F0', bodyDark: '#D3D3D3',
        legs: '#A9A9A9', accessory: 'visor_blue', accColor: '#4169E1',
        eyes: '#1a1a2e'
    },
    {
        name: '고양이', emoji: '🐱',
        hair: '#FF8C00', hairStyle: 'cat_ears',
        skin: '#FF8C00', body: '#FF8C00', bodyDark: '#D2691E',
        legs: '#D2691E', accessory: 'whiskers', accColor: '#FFFFFF',
        eyes: '#228B22'
    }
];

let selectedCharIndex = 0;
let selectedChar = CHARACTERS[0];

// ===== Game State =====
let state = 'MENU'; // MENU, SELECT_CHAR, PLAYING, GAME_OVER
let score = 0;
let currentStep = 0; // 현재 계단 인덱스 (score와 분리)
let bestScoreSaved = parseInt(localStorage.getItem('infiniteStairsBest')) || 0;
let stairs = [];
let cameraY = 0;
let targetCameraY = 0;

// Character state
let charX = 0;
let charY = 0;
let charTargetX = 0;
let charTargetY = 0;
let charMoving = false;
let charMoveStart = 0;
let charStartX = 0;
let charStartY = 0;
let charFacing = 'right'; // 'left' or 'right'

// Timer
let stepTimeLimit = BASE_TIME_LIMIT;
let stepTimerStart = 0;
let timerActive = false;

// Falling animation
let falling = false;
let fallStartTime = 0;
let fallStartY = 0;
let fallVelocity = 0;

// Particles
let particles = [];

// Background stars
let stars = [];

// Screen shake
let shakeAmount = 0;
let shakeDecay = 0.92;

// ===== Item System =====
const ITEM_TYPES = [
    { type: 'time', emoji: '⏰', color: '#00FF7F', label: '+1s', chance: 0.12 },
    { type: 'double', emoji: '⭐', color: '#FFD700', label: 'x2', chance: 0.08 },

];

// ===== Combo & Fever =====
let combo = 0;
let maxCombo = 0;
let feverMode = false;
let feverStart = 0;
const FEVER_DURATION = 5000; // 5s 피버
const FEVER_COMBO_THRESHOLD = 10; // 10콤보로 피버 발동
let feverFlash = 0;

// Active effects

let doubleScoreSteps = 0; // 남은 2x 스텝 수
let comboTextEffects = []; // 화면에 떠오르는 텍스트

// ===== Canvas Sizing =====
function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const W = () => window.innerWidth;
const H = () => window.innerHeight;

// ===== Star Field =====
function initStars() {
    stars = [];
    for (let i = 0; i < 120; i++) {
        stars.push({
            x: Math.random() * W(),
            y: Math.random() * H() * 3,
            size: Math.random() * 2 + 0.5,
            brightness: Math.random() * 0.6 + 0.2,
            twinkleSpeed: Math.random() * 0.02 + 0.005,
            twinkleOffset: Math.random() * Math.PI * 2
        });
    }
}
initStars();

// ===== Color Palette (changes with height) =====
function getBackgroundColors(height) {
    const t = Math.min(height / 150, 1); // transition over 150 steps

    // Sky phase (low) -> Sunset (mid) -> Space (high)
    const r1 = Math.round(lerp(25, 8, t));
    const g1 = Math.round(lerp(25, 5, t));
    const b1 = Math.round(lerp(60, 30, t));

    const r2 = Math.round(lerp(15, 3, t));
    const g2 = Math.round(lerp(15, 3, t));
    const b2 = Math.round(lerp(40, 15, t));

    return {
        top: `rgb(${r2},${g2},${b2})`,
        bottom: `rgb(${r1},${g1},${b1})`
    };
}

function getStairColor(index) {
    const hue = (index * 3 + 200) % 360;
    const sat = 55 + Math.sin(index * 0.1) * 15;
    const light = 45 + Math.sin(index * 0.15) * 10;
    return {
        top: `hsl(${hue}, ${sat}%, ${light}%)`,
        front: `hsl(${hue}, ${sat}%, ${light - 15}%)`,
        side: `hsl(${hue}, ${sat}%, ${light - 25}%)`
    };
}

// ===== Utility =====
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function easeOutQuad(t) {
    return t * (2 - t);
}

function easeInQuad(t) {
    return t * t;
}

// ===== Stair Generation =====
function generateInitialStairs() {
    stairs = [];
    // First stair is centered
    const centerX = W() / 2;
    const baseY = H() * 0.7;

    stairs.push({
        x: centerX - STAIR_WIDTH / 2,
        y: baseY,
        direction: null, // starting stair
        index: 0
    });

    // Generate ahead
    for (let i = 1; i < 60; i++) {
        addNextStair();
    }
}

function addNextStair() {
    const prev = stairs[stairs.length - 1];
    const direction = Math.random() < 0.5 ? 'left' : 'right';
    const dx = direction === 'left' ? -STAIR_WIDTH * 0.65 : STAIR_WIDTH * 0.65;
    const dy = -(STAIR_HEIGHT + STAIR_DEPTH);

    // 아이템 배치 (5번째 계단 이후부터)
    let item = null;
    if (stairs.length > 5) {
        const roll = Math.random();
        let acc = 0;
        for (const it of ITEM_TYPES) {
            acc += it.chance;
            if (roll < acc) {
                item = { ...it };
                break;
            }
        }
    }

    stairs.push({
        x: prev.x + dx,
        y: prev.y + dy,
        direction: direction,
        index: stairs.length,
        item: item,
        itemCollected: false
    });
}

// ===== Particles =====
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: -(Math.random() * 3 + 1),
            life: 1.0,
            decay: Math.random() * 0.03 + 0.02,
            size: Math.random() * 4 + 2,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - cameraOffsetX(), p.y - cameraY - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

// ===== Camera =====
function cameraOffsetX() {
    // Center camera on character
    return charX - W() / 2;
}

function updateCamera() {
    const targetY = charY - H() * 0.55;
    cameraY += (targetY - cameraY) * 0.1;
}

// ===== Drawing =====
function drawBackground() {
    const colors = getBackgroundColors(score);
    const gradient = ctx.createLinearGradient(0, 0, 0, H());
    gradient.addColorStop(0, colors.top);
    gradient.addColorStop(1, colors.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W(), H());

    // Stars
    const time = Date.now() * 0.001;
    const starOpacity = Math.min(score / 50, 1); // stars fade in as you go higher
    if (starOpacity > 0) {
        for (const star of stars) {
            const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.twinkleOffset) * 0.3 + 0.7;
            const screenY = ((star.y - cameraY * 0.15) % (H() * 3 + 200)) - 100;
            ctx.globalAlpha = star.brightness * twinkle * starOpacity;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(star.x, screenY, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

function drawStair(stair) {
    const x = stair.x - cameraOffsetX();
    const y = stair.y - cameraY;

    // Check if visible
    if (y < -50 || y > H() + 50) return;

    const colors = getStairColor(stair.index);

    // 피버모드 레인보우 계단
    let topColor = colors.top;
    let frontColor = colors.front;
    if (feverMode) {
        const hue = (Date.now() * 0.2 + stair.index * 25) % 360;
        topColor = `hsl(${hue}, 80%, 55%)`;
        frontColor = `hsl(${hue}, 80%, 40%)`;
    }

    // Stair top
    ctx.fillStyle = topColor;
    ctx.fillRect(x, y, STAIR_WIDTH, STAIR_HEIGHT);

    // Stair front
    ctx.fillStyle = frontColor;
    ctx.fillRect(x, y + STAIR_HEIGHT, STAIR_WIDTH, STAIR_DEPTH);

    // Stair highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x, y, STAIR_WIDTH, 2);

    // Left edge shadow
    ctx.fillStyle = colors.edge;
    ctx.fillRect(x, y, 3, STAIR_HEIGHT + STAIR_DEPTH);

    // Right edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x + STAIR_WIDTH - 2, y, 2, STAIR_HEIGHT + STAIR_DEPTH);

    // 아이템 드로잉
    if (stair.item && !stair.itemCollected) {
        drawItem(x, y, stair);
    }
}

function drawItem(sx, sy, stair) {
    const item = stair.item;
    const t = Date.now() * 0.003;
    const bobY = Math.sin(t + stair.index) * 4;
    const ix = sx + STAIR_WIDTH / 2;
    const iy = sy - 16 + bobY;

    // Glow
    ctx.save();
    ctx.shadowColor = item.color;
    ctx.shadowBlur = 12 + Math.sin(t * 2) * 4;

    // Circle background
    ctx.fillStyle = item.color + '40';
    ctx.beginPath();
    ctx.arc(ix, iy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Emoji
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, ix, iy);

    ctx.restore();
}

function drawCharacterAt(sx, sy, faceRight, c, isMoving, scale) {
    scale = scale || 1;
    const cw = CHAR_WIDTH * scale;
    const ch = CHAR_HEIGHT * scale;

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + cw / 2, sy + ch + 2 * scale, cw / 2 + 2, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = c.legs;
    if (isMoving) {
        const mp = Math.sin(Date.now() * 0.02) * 3 * scale;
        ctx.fillRect(sx + 4 * scale, sy + ch - 10 * scale, 6 * scale, 10 * scale + mp);
        ctx.fillRect(sx + cw - 10 * scale, sy + ch - 10 * scale, 6 * scale, 10 * scale - mp);
    } else {
        ctx.fillRect(sx + 4 * scale, sy + ch - 10 * scale, 6 * scale, 10 * scale);
        ctx.fillRect(sx + cw - 10 * scale, sy + ch - 10 * scale, 6 * scale, 10 * scale);
    }

    // Body
    ctx.fillStyle = c.body;
    ctx.fillRect(sx + 2 * scale, sy + 10 * scale, cw - 4 * scale, ch - 18 * scale);

    // Body side shading
    ctx.fillStyle = c.bodyDark;
    if (faceRight) {
        ctx.fillRect(sx + 2 * scale, sy + 10 * scale, 4 * scale, ch - 18 * scale);
    } else {
        ctx.fillRect(sx + cw - 6 * scale, sy + 10 * scale, 4 * scale, ch - 18 * scale);
    }

    // Head
    ctx.fillStyle = c.skin;
    ctx.fillRect(sx + 4 * scale, sy, cw - 8 * scale, 13 * scale);

    // Hair / Head accessory
    drawHairStyle(sx, sy, cw, ch, scale, c, faceRight);

    // Eyes
    ctx.fillStyle = c.eyes;
    if (faceRight) {
        ctx.fillRect(sx + cw - 10 * scale, sy + 5 * scale, 3 * scale, 3 * scale);
    } else {
        ctx.fillRect(sx + 7 * scale, sy + 5 * scale, 3 * scale, 3 * scale);
    }

    // Accessory
    drawAccessory(sx, sy, cw, ch, scale, c, faceRight);

    // Arms
    ctx.fillStyle = c.body;
    if (isMoving) {
        const armSwing = Math.sin(Date.now() * 0.02) * 4 * scale;
        if (faceRight) {
            ctx.fillRect(sx + cw - 2 * scale, sy + 12 * scale + armSwing, 5 * scale, 3 * scale);
        } else {
            ctx.fillRect(sx - 3 * scale, sy + 12 * scale + armSwing, 5 * scale, 3 * scale);
        }
    }

    ctx.restore();
}

function drawHairStyle(sx, sy, cw, ch, s, c, faceRight) {
    ctx.fillStyle = c.hair;
    switch (c.hairStyle) {
        case 'long':
            ctx.fillRect(sx + 3 * s, sy - 2 * s, cw - 6 * s, 5 * s);
            // Side hair
            if (faceRight) {
                ctx.fillRect(sx + 1 * s, sy - 1 * s, 3 * s, 12 * s);
            } else {
                ctx.fillRect(sx + cw - 4 * s, sy - 1 * s, 3 * s, 12 * s);
            }
            break;
        case 'short':
            ctx.fillRect(sx + 3 * s, sy - 2 * s, cw - 6 * s, 5 * s);
            break;
        case 'helmet':
            ctx.fillRect(sx + 2 * s, sy - 3 * s, cw - 4 * s, 7 * s);
            // Visor slit
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(sx + 5 * s, sy + 3 * s, cw - 10 * s, 2 * s);
            break;
        case 'ears': // Pokemon ears
            ctx.fillRect(sx + 3 * s, sy - 2 * s, cw - 6 * s, 4 * s);
            ctx.fillRect(sx + 2 * s, sy - 8 * s, 4 * s, 7 * s);
            ctx.fillRect(sx + cw - 6 * s, sy - 8 * s, 4 * s, 7 * s);
            // Ear tips black
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(sx + 2 * s, sy - 8 * s, 4 * s, 3 * s);
            ctx.fillRect(sx + cw - 6 * s, sy - 8 * s, 4 * s, 3 * s);
            break;
        case 'mask':
            ctx.fillRect(sx + 3 * s, sy - 2 * s, cw - 6 * s, 15 * s);
            // Eye slit
            ctx.fillStyle = c.skin;
            ctx.fillRect(sx + 5 * s, sy + 4 * s, cw - 10 * s, 4 * s);
            break;
        case 'antenna':
            ctx.fillRect(sx + 3 * s, sy - 2 * s, cw - 6 * s, 4 * s);
            ctx.fillRect(sx + cw / 2 - 1 * s, sy - 8 * s, 2 * s, 7 * s);
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(sx + cw / 2, sy - 8 * s, 3 * s, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'messy':
            ctx.fillRect(sx + 2 * s, sy - 3 * s, cw - 4 * s, 6 * s);
            ctx.fillRect(sx + 0, sy - 4 * s, 3 * s, 3 * s);
            ctx.fillRect(sx + cw - 3 * s, sy - 5 * s, 3 * s, 3 * s);
            ctx.fillRect(sx + cw / 2 - 1 * s, sy - 5 * s, 3 * s, 3 * s);
            break;
        case 'helmet_round':
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(sx + cw / 2, sy + 5 * s, 10 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = c.skin;
            ctx.fillRect(sx + 4 * s, sy + 2 * s, cw - 8 * s, 10 * s);
            break;
        case 'cat_ears':
            ctx.fillRect(sx + 3 * s, sy - 2 * s, cw - 6 * s, 4 * s);
            // Triangular ears
            ctx.beginPath();
            ctx.moveTo(sx + 3 * s, sy);
            ctx.lineTo(sx + 1 * s, sy - 7 * s);
            ctx.lineTo(sx + 7 * s, sy);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(sx + cw - 7 * s, sy);
            ctx.lineTo(sx + cw - 1 * s, sy - 7 * s);
            ctx.lineTo(sx + cw - 3 * s, sy);
            ctx.fill();
            // Inner ear
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.moveTo(sx + 4 * s, sy);
            ctx.lineTo(sx + 3 * s, sy - 4 * s);
            ctx.lineTo(sx + 6 * s, sy);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(sx + cw - 6 * s, sy);
            ctx.lineTo(sx + cw - 3 * s, sy - 4 * s);
            ctx.lineTo(sx + cw - 4 * s, sy);
            ctx.fill();
            break;
    }
}

function drawAccessory(sx, sy, cw, ch, s, c, faceRight) {
    switch (c.accessory) {
        case 'crown':
            ctx.fillStyle = c.accColor;
            ctx.fillRect(sx + 4 * s, sy - 6 * s, cw - 8 * s, 4 * s);
            ctx.fillRect(sx + 4 * s, sy - 9 * s, 2 * s, 3 * s);
            ctx.fillRect(sx + cw / 2 - 1 * s, sy - 10 * s, 2 * s, 4 * s);
            ctx.fillRect(sx + cw - 6 * s, sy - 9 * s, 2 * s, 3 * s);
            // Gem
            ctx.fillStyle = '#FF1493';
            ctx.fillRect(sx + cw / 2 - 1 * s, sy - 5 * s, 2 * s, 2 * s);
            break;
        case 'shield':
            ctx.fillStyle = c.accColor;
            const shieldX = faceRight ? sx - 4 * s : sx + cw - 2 * s;
            ctx.fillRect(shieldX, sy + 12 * s, 6 * s, 8 * s);
            ctx.fillStyle = '#B22222';
            ctx.fillRect(shieldX + 2 * s, sy + 14 * s, 2 * s, 4 * s);
            break;
        case 'hat':
            ctx.fillStyle = c.accColor;
            ctx.fillRect(sx + 2 * s, sy - 4 * s, cw - 4 * s, 4 * s);
            ctx.fillRect(sx + 5 * s, sy - 7 * s, cw - 10 * s, 3 * s);
            break;
        case 'cheeks':
            ctx.fillStyle = c.accColor;
            ctx.beginPath();
            ctx.arc(sx + 3 * s, sy + 8 * s, 2.5 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx + cw - 3 * s, sy + 8 * s, 2.5 * s, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'scarf':
            ctx.fillStyle = c.accColor;
            ctx.fillRect(sx + 2 * s, sy + 10 * s, cw - 4 * s, 3 * s);
            const tailX = faceRight ? sx - 2 * s : sx + cw;
            ctx.fillRect(tailX, sy + 10 * s, 4 * s, 8 * s);
            break;
        case 'wizard_hat':
            ctx.fillStyle = c.accColor;
            ctx.beginPath();
            ctx.moveTo(sx + 2 * s, sy - 2 * s);
            ctx.lineTo(sx + cw / 2, sy - 16 * s);
            ctx.lineTo(sx + cw - 2 * s, sy - 2 * s);
            ctx.fill();
            ctx.fillRect(sx, sy - 3 * s, cw, 3 * s);
            // Star
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(sx + cw / 2 - 1 * s, sy - 10 * s, 3 * s, 3 * s);
            break;
        case 'visor':
            ctx.fillStyle = c.accColor;
            ctx.fillRect(sx + 4 * s, sy + 4 * s, cw - 8 * s, 3 * s);
            break;
        case 'visor_blue':
            ctx.fillStyle = c.accColor;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(sx + 3 * s, sy + 2 * s, cw - 6 * s, 8 * s);
            ctx.globalAlpha = 1;
            break;
        case 'whiskers':
            ctx.strokeStyle = c.accColor;
            ctx.lineWidth = 1;
            // Left whiskers
            ctx.beginPath();
            ctx.moveTo(sx, sy + 7 * s); ctx.lineTo(sx - 5 * s, sy + 5 * s);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sx, sy + 8 * s); ctx.lineTo(sx - 5 * s, sy + 9 * s);
            ctx.stroke();
            // Right whiskers
            ctx.beginPath();
            ctx.moveTo(sx + cw, sy + 7 * s); ctx.lineTo(sx + cw + 5 * s, sy + 5 * s);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sx + cw, sy + 8 * s); ctx.lineTo(sx + cw + 5 * s, sy + 9 * s);
            ctx.stroke();
            // Nose
            ctx.fillStyle = '#FFB6C1';
            ctx.beginPath();
            ctx.arc(sx + cw / 2, sy + 8 * s, 2 * s, 0, Math.PI * 2);
            ctx.fill();
            break;
    }
}

function drawCharacter(x, y) {
    const sx = x - cameraOffsetX();
    const sy = y - cameraY;
    const faceRight = charFacing === 'right';
    drawCharacterAt(sx, sy, faceRight, selectedChar, charMoving, 1);
}

// ===== Character Select Screen =====
function drawCharacterSelect() {
    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, H());
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a4e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W(), H());

    // Title
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.min(24, W() * 0.03)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('캐릭터 선택', W() / 2, H() * 0.12);

    // Grid layout: 5 columns x 2 rows
    const cols = 5;
    const rows = 2;
    const cardW = Math.min(100, (W() - 120) / cols);
    const cardH = cardW * 1.4;
    const gap = 12;
    const totalW = cols * cardW + (cols - 1) * gap;
    const totalH = rows * cardH + (rows - 1) * gap;
    const startX = (W() - totalW) / 2;
    const startY = (H() - totalH) / 2 - 10;

    for (let i = 0; i < CHARACTERS.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = startX + col * (cardW + gap);
        const cy = startY + row * (cardH + gap);
        const isSelected = i === selectedCharIndex;

        // Card background
        if (isSelected) {
            ctx.fillStyle = 'rgba(255, 200, 50, 0.25)';
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            // Glow effect
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
        }

        // Rounded rect
        const r = 8;
        ctx.beginPath();
        ctx.moveTo(cx + r, cy);
        ctx.lineTo(cx + cardW - r, cy);
        ctx.quadraticCurveTo(cx + cardW, cy, cx + cardW, cy + r);
        ctx.lineTo(cx + cardW, cy + cardH - r);
        ctx.quadraticCurveTo(cx + cardW, cy + cardH, cx + cardW - r, cy + cardH);
        ctx.lineTo(cx + r, cy + cardH);
        ctx.quadraticCurveTo(cx, cy + cardH, cx, cy + cardH - r);
        ctx.lineTo(cx, cy + r);
        ctx.quadraticCurveTo(cx, cy, cx + r, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw character preview
        const ch = CHARACTERS[i];
        const previewScale = Math.min(2, cardW / 18);
        const charPreviewX = cx + cardW / 2 - (CHAR_WIDTH * previewScale) / 2;
        const charPreviewY = cy + 10;

        // Gentle breathing animation for selected
        let bobY = 0;
        if (isSelected) {
            bobY = Math.sin(Date.now() * 0.004) * 3;
        }

        drawCharacterAt(charPreviewX, charPreviewY + bobY, true, ch, isSelected, previewScale);

        // Name
        ctx.fillStyle = isSelected ? '#FFD700' : 'rgba(255,255,255,0.7)';
        const fontSize = Math.max(8, Math.min(11, cardW * 0.12));
        ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(ch.emoji + ' ' + ch.name, cx + cardW / 2, cy + cardH - 10);
    }

    // Bottom instruction
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${Math.min(11, W() * 0.014)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('← → 선택  |  ENTER 또는 터치로 확인', W() / 2, H() * 0.92);
}

// ===== Timer =====
function getCurrentTimeLimit() {
    // Time limit decreases as score increases
    // Using exponential decay: each step multiplies by TIME_DECAY_RATE
    let limit = BASE_TIME_LIMIT * Math.pow(TIME_DECAY_RATE, currentStep);
    return Math.max(limit, MIN_TIME_LIMIT);
}

function getTimerProgress() {
    if (!timerActive) return 1;
    const elapsed = Date.now() - stepTimerStart;
    const limit = stepTimeLimit;
    return Math.max(0, 1 - elapsed / limit);
}

function updateTimerUI() {
    const progress = getTimerProgress();
    timerFill.style.width = (progress * 100) + '%';

    // Color shifts from green to red
    if (progress > 0.5) {
        timerFill.style.background = `linear-gradient(90deg, #2ed573, #7bed9f)`;
    } else if (progress > 0.25) {
        timerFill.style.background = `linear-gradient(90deg, #ffb86c, #ffa502)`;
    } else {
        timerFill.style.background = `linear-gradient(90deg, #ff4757, #ff6b81)`;
        // Urgent shake
        if (progress < 0.15) {
            shakeAmount = Math.max(shakeAmount, 1);
        }
    }
}

function checkTimerExpired() {
    if (!timerActive) return false;
    const elapsed = Date.now() - stepTimerStart;
    return elapsed >= stepTimeLimit;
}

function resetStepTimer() {
    stepTimeLimit = getCurrentTimeLimit();
    stepTimerStart = Date.now();
    timerActive = true;
}

// ===== Game Logic =====
function showCharacterSelect() {
    state = 'SELECT_CHAR';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.add('hidden');
    // 캐릭터 선택 중 터치 컨트롤 숨기기 (터치 이벤트 충돌 방지)
    const tc = document.getElementById('touchControls');
    if (tc) tc.style.display = 'none';
}

function startGame() {
    selectedChar = CHARACTERS[selectedCharIndex];
    score = 0;
    currentStep = 0;
    falling = false;
    charMoving = false;
    particles = [];
    shakeAmount = 0;
    stepTimeLimit = BASE_TIME_LIMIT;
    timerActive = false;

    // Reset item/combo/fever state
    combo = 0;
    maxCombo = 0;
    feverMode = false;
    feverStart = 0;
    feverFlash = 0;

    doubleScoreSteps = 0;
    comboTextEffects = [];

    generateInitialStairs();

    // Place character on first stair
    const firstStair = stairs[0];
    charX = firstStair.x + STAIR_WIDTH / 2 - CHAR_WIDTH / 2;
    charY = firstStair.y - CHAR_HEIGHT;
    charTargetX = charX;
    charTargetY = charY;
    charFacing = stairs[1].direction;
    cameraY = charY - H() * 0.55;

    state = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    // 게임 시작 시 터치 컨트롤 표시
    const tc = document.getElementById('touchControls');
    if (tc) tc.style.display = 'flex';

    resetStepTimer();
}

function handleAction(action) {
    // action: 'straight' = 현재 방향으로 직진, 'turn' = 방향 바꾸고 이동
    if (charMoving || falling || state !== 'PLAYING') return;

    let moveDirection;
    const nextStairIndex = currentStep + 1;

    if (nextStairIndex >= stairs.length) {
        for (let i = 0; i < 30; i++) addNextStair();
    }

    const nextStair = stairs[nextStairIndex];

    // 사용자의 의도된 방향 결정 (이것이 charFacing에 반영됨)
    let intendedFacing;
    if (action === 'straight') {
        intendedFacing = charFacing; // 현재 방향 유지
    } else {
        intendedFacing = charFacing === 'right' ? 'left' : 'right'; // 방향 전환
    }

    // 피버 모드에서도 방향은 사용자 입력 그대로 적용 (자동보정 없음)
    moveDirection = intendedFacing;



    // 이동 방향이 다음 계단 방향과 맞는지 확인
    if (moveDirection !== nextStair.direction) {
        combo = 0;
        triggerGameOver(moveDirection);
        return;
    }

    // 정답! 위로 이동
    // charFacing은 항상 사용자의 의도에 따라 업데이트 (쉴드/피버 보정과 무관)
    charFacing = intendedFacing;
    charStartX = charX;
    charStartY = charY;
    charTargetX = nextStair.x + STAIR_WIDTH / 2 - CHAR_WIDTH / 2;
    charTargetY = nextStair.y - CHAR_HEIGHT;
    charMoving = true;
    charMoveStart = Date.now();

    // 콤보 증가
    combo++;
    if (combo > maxCombo) maxCombo = combo;

    // 계단 인덱스 증가
    currentStep++;

    // 점수 계산
    let earnedScore = 1;
    if (feverMode) earnedScore *= 3;
    if (doubleScoreSteps > 0) {
        earnedScore *= 2;
        doubleScoreSteps--;
    }
    score += earnedScore;
    scoreHud.textContent = score;

    // 콤보 텍스트 표시
    if (combo > 0 && combo % 5 === 0) {
        spawnComboText(nextStair.x + STAIR_WIDTH / 2, nextStair.y - 30, `${combo} COMBO!`, '#FF6347');
    }

    // 피버 발동 체크
    if (combo >= FEVER_COMBO_THRESHOLD && !feverMode) {
        activateFever();
    }

    // 아이템 수집
    if (nextStair.item && !nextStair.itemCollected) {
        collectItem(nextStair);
    }

    // 타이머 초기화 (피버 중에는 시간 여유)
    if (feverMode) {
        stepTimerStart = Date.now();
    } else {
        resetStepTimer();
    }

    // 파티클
    const particleCount = feverMode ? 14 : 6;
    const colors = getStairColor(nextStairIndex);
    spawnParticles(
        nextStair.x + STAIR_WIDTH / 2,
        nextStair.y + STAIR_HEIGHT / 2,
        feverMode ? `hsl(${(Date.now() * 0.5) % 360}, 90%, 60%)` : colors.top,
        particleCount
    );

    // 계단 추가 생성
    if (stairs.length - nextStairIndex < 40) {
        for (let i = 0; i < 20; i++) addNextStair();
    }
}

// ===== Item Collection =====
function collectItem(stair) {
    const item = stair.item;
    stair.itemCollected = true;

    switch (item.type) {
        case 'time':
            stepTimerStart += 1000; // 1초 추가
            spawnComboText(stair.x + STAIR_WIDTH / 2, stair.y - 30, '⏰ +1s', item.color);
            break;
        case 'double':
            doubleScoreSteps += 8;
            spawnComboText(stair.x + STAIR_WIDTH / 2, stair.y - 30, '⭐ x2 SCORE!', item.color);
            break;

    }

    spawnParticles(stair.x + STAIR_WIDTH / 2, stair.y, item.color, 10);
    shakeAmount = 3;
}

// ===== Fever Mode =====
function activateFever() {
    feverMode = true;
    feverStart = Date.now();
    feverFlash = 1.0;
    shakeAmount = 15;
    spawnComboText(charX + CHAR_WIDTH / 2, charY - 50, '🔥 FEVER MODE! 🔥', '#FF4500');

    // 대량 파티클
    for (let i = 0; i < 30; i++) {
        const hue = Math.random() * 360;
        spawnParticles(
            charX + (Math.random() - 0.5) * 100,
            charY + (Math.random() - 0.5) * 60,
            `hsl(${hue}, 90%, 60%)`,
            3
        );
    }
}

// ===== Floating Text Effect =====
function spawnComboText(x, y, text, color) {
    comboTextEffects.push({
        x, y, text, color,
        startTime: Date.now(),
        duration: 1200
    });
}

function updateComboTexts() {
    const now = Date.now();
    comboTextEffects = comboTextEffects.filter(t => now - t.startTime < t.duration);
}

function drawComboTexts() {
    const now = Date.now();
    for (const t of comboTextEffects) {
        const elapsed = now - t.startTime;
        const progress = elapsed / t.duration;
        const alpha = 1 - progress;
        const offsetY = -progress * 50;
        const scale = 1 + progress * 0.3;

        const sx = t.x - cameraOffsetX();
        const sy = t.y - cameraY + offsetY;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = t.color;
        ctx.font = `bold ${Math.round(13 * scale)}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 8;
        ctx.fillText(t.text, sx, sy);
        ctx.restore();
    }
}

function triggerGameOver(wrongDirection) {
    state = 'GAME_OVER';
    timerActive = false;
    falling = true;
    fallStartTime = Date.now();
    fallStartY = charY;
    fallVelocity = -3;
    shakeAmount = 8;

    // Move in wrong direction slightly
    charFacing = wrongDirection;
    const fallDx = wrongDirection === 'left' ? -30 : 30;
    charTargetX = charX + fallDx;
    charStartX = charX;

    // Spawn explosion particles
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: charX + CHAR_WIDTH / 2,
            y: charY + CHAR_HEIGHT / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: -(Math.random() * 5 + 2),
            life: 1.0,
            decay: Math.random() * 0.02 + 0.01,
            size: Math.random() * 6 + 2,
            color: `hsl(${Math.random() * 40 + 350}, 80%, 60%)`
        });
    }
}

function timeoutGameOver() {
    state = 'GAME_OVER';
    timerActive = false;
    falling = true;
    fallStartTime = Date.now();
    fallStartY = charY;
    fallVelocity = 0;
    shakeAmount = 6;

    // Character crumbles in place
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: charX + CHAR_WIDTH / 2,
            y: charY + CHAR_HEIGHT / 2,
            vx: (Math.random() - 0.5) * 6,
            vy: -(Math.random() * 4 + 1),
            life: 1.0,
            decay: Math.random() * 0.02 + 0.01,
            size: Math.random() * 5 + 2,
            color: `hsl(${Math.random() * 60 + 20}, 70%, 55%)`
        });
    }
}

function showGameOverScreen() {
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    // 게임 오버 시 터치 컨트롤 숨기기
    const tc = document.getElementById('touchControls');
    if (tc) tc.style.display = 'none';

    finalScoreEl.textContent = score;
    // 최대 콤보 표시
    const comboEl = document.getElementById('maxComboDisplay');
    if (comboEl) comboEl.textContent = `MAX COMBO: ${maxCombo}`;

    const isNewRecord = score > bestScoreSaved;
    if (isNewRecord) {
        bestScoreSaved = score;
        localStorage.setItem('infiniteStairsBest', bestScoreSaved);
        newRecordEl.classList.remove('hidden');
    } else {
        newRecordEl.classList.add('hidden');
    }
    bestScoreEl.textContent = bestScoreSaved;

    // Re-trigger animations
    const content = gameOverScreen.querySelector('.overlay-content');
    content.style.animation = 'none';
    content.offsetHeight; // reflow
    content.style.animation = '';
    for (const child of content.children) {
        child.style.animation = 'none';
        child.offsetHeight;
        child.style.animation = '';
    }
}

// ===== Update Loop =====
function update() {
    const now = Date.now();

    // Character smooth movement
    if (charMoving && !falling) {
        const elapsed = now - charMoveStart;
        const t = Math.min(elapsed / MOVE_DURATION, 1);
        const easedT = easeOutQuad(t);

        charX = lerp(charStartX, charTargetX, easedT);
        charY = lerp(charStartY, charTargetY, easedT);

        if (t >= 1) {
            charMoving = false;
            charX = charTargetX;
            charY = charTargetY;
        }
    }

    // Falling animation
    if (falling) {
        const elapsed = now - fallStartTime;
        fallVelocity += 0.3;
        charY = fallStartY + fallVelocity * elapsed * 0.05;

        // drift horizontally
        const driftT = Math.min(elapsed / 500, 1);
        charX = lerp(charStartX, charTargetX, driftT);

        if (elapsed > 1200) {
            falling = false;
            showGameOverScreen();
        }
    }

    // Timer check
    if (state === 'PLAYING' && timerActive && !charMoving) {
        if (!feverMode && checkTimerExpired()) {
            combo = 0;
            timeoutGameOver();
        }
        updateTimerUI();
    } else if (state === 'PLAYING') {
        updateTimerUI();
    }

    // Fever mode update
    if (feverMode && state === 'PLAYING') {
        const feverElapsed = now - feverStart;
        if (feverElapsed >= FEVER_DURATION) {
            feverMode = false;
            spawnComboText(charX + CHAR_WIDTH / 2, charY - 30, 'FEVER END', '#888');
        }
        feverFlash *= 0.96;
    }

    // Update combo texts
    updateComboTexts();

    // Camera
    updateCamera();

    // Particles
    updateParticles();

    // Screen shake decay
    if (shakeAmount > 0.1) {
        shakeAmount *= shakeDecay;
    } else {
        shakeAmount = 0;
    }
}

// ===== Render Loop =====
function render() {
    ctx.save();

    // Screen shake
    if (shakeAmount > 0) {
        const sx = (Math.random() - 0.5) * shakeAmount * 2;
        const sy = (Math.random() - 0.5) * shakeAmount * 2;
        ctx.translate(sx, sy);
    }

    drawBackground();

    // 피버 플래시 효과
    if (feverFlash > 0.01) {
        ctx.fillStyle = `rgba(255, 100, 0, ${feverFlash * 0.3})`;
        ctx.fillRect(0, 0, W(), H());
    }

    // Draw stairs
    for (const stair of stairs) {
        drawStair(stair);
    }

    // Draw particles
    drawParticles();

    // Draw character
    if (state === 'PLAYING' || falling) {

        drawCharacter(charX, charY);
    }

    // Draw floating texts
    drawComboTexts();

    // Draw HUD overlays
    drawHUDOverlay();

    ctx.restore();
}

// ===== HUD Overlay (combo, fever bar, effects) =====
function drawHUDOverlay() {
    if (state !== 'PLAYING') return;

    // 콤보 카운터 (3 이상일 때)
    if (combo >= 3) {
        const comboSize = Math.min(18 + combo * 0.5, 30);
        ctx.fillStyle = feverMode ? `hsl(${(Date.now() * 0.5) % 360}, 90%, 60%)` : '#FF6347';
        ctx.font = `bold ${comboSize}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'right';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fillText(`${combo}`, W() - 20, 90);
        ctx.font = `10px 'Press Start 2P', monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.shadowBlur = 0;
        ctx.fillText('COMBO', W() - 20, 105);
    }

    // 피버 게이지 바 (피버 진행률)
    if (feverMode) {
        const elapsed = Date.now() - feverStart;
        const progress = 1 - elapsed / FEVER_DURATION;
        const barW = 200;
        const barH = 6;
        const barX = W() / 2 - barW / 2;
        const barY = 70;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(barX, barY, barW, barH);

        const hue = (Date.now() * 0.5) % 360;
        ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
        ctx.fillRect(barX, barY, barW * progress, barH);

        ctx.fillStyle = '#fff';
        ctx.font = `8px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('🔥 FEVER 🔥', W() / 2, barY - 5);
    } else if (combo > 0) {
        // 피버까지 남은 콤보 게이지
        const progress = Math.min(combo / FEVER_COMBO_THRESHOLD, 1);
        if (progress > 0.3) {
            const barW = 100;
            const barH = 4;
            const barX = W() / 2 - barW / 2;
            const barY = 70;

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(barX, barY, barW, barH);

            ctx.fillStyle = `rgba(255, 69, 0, ${0.5 + progress * 0.5})`;
            ctx.fillRect(barX, barY, barW * progress, barH);

            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '6px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`FEVER ${combo}/${FEVER_COMBO_THRESHOLD}`, W() / 2, barY - 3);
        }
    }

    // 2x 스코어 표시
    if (doubleScoreSteps > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = "bold 10px 'Press Start 2P', monospace";
        ctx.textAlign = 'left';
        ctx.fillText(`⭐x2 (${doubleScoreSteps})`, 15, 90);
    }


}

// ===== Main Loop =====
function gameLoop() {
    update();

    // Render based on state
    if (state === 'SELECT_CHAR') {
        drawCharacterSelect();
    } else {
        render();
    }

    requestAnimationFrame(gameLoop);
}

// ===== Input Handling =====
let gameOverShownTime = 0;

document.addEventListener('keydown', (e) => {
    // ESC → 게임 허브로 돌아가기
    if (e.key === 'Escape') {
        e.preventDefault();
        window.location.href = '../../index.html';
        return;
    }

    // === 캐릭터 선택 화면 ===
    if (state === 'SELECT_CHAR') {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            selectedCharIndex = (selectedCharIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            selectedCharIndex = (selectedCharIndex + 1) % CHARACTERS.length;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedCharIndex = (selectedCharIndex - 5 + CHARACTERS.length) % CHARACTERS.length;
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedCharIndex = (selectedCharIndex + 5) % CHARACTERS.length;
        } else if (e.key === 'Enter') {
            e.preventDefault();
            startGame();
        }
        return;
    }

    // === 메뉴 / 게임 오버 ===
    if (e.key === 'Enter') {
        e.preventDefault();
        if (state === 'MENU') {
            showCharacterSelect();
        } else if (state === 'GAME_OVER' && !falling) {
            showCharacterSelect();
        }
        return;
    }

    // === 게임 플레이 ===
    // 스페이스바 = 직진 (현재 방향 유지)
    if (e.key === ' ') {
        e.preventDefault();
        if (state === 'PLAYING') {
            handleAction('straight');
        }
        return;
    }

    // 방향키 = 방향 전환
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        if (state === 'PLAYING') {
            handleAction('turn');
        }
        return;
    }
});

// Prevent default scrolling
window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
    }
});

// ===== 캔버스 클릭/터치 핸들러 (모바일 대응) =====
function getCharCardLayout() {
    const cols = 5;
    const rows = 2;
    const cardW = Math.min(100, (W() - 120) / cols);
    const cardH = cardW * 1.4;
    const gap = 12;
    const totalW = cols * cardW + (cols - 1) * gap;
    const totalH = rows * cardH + (rows - 1) * gap;
    const startX = (W() - totalW) / 2;
    const startY = (H() - totalH) / 2 - 10;
    return { cols, cardW, cardH, gap, startX, startY };
}

// ===== 오버레이 클릭/터치 핸들러 (오버레이가 캔버스 위에 있으므로 별도 처리) =====
startScreen.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state === 'MENU') showCharacterSelect();
});
startScreen.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state === 'MENU') showCharacterSelect();
});

gameOverScreen.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state === 'GAME_OVER' && !falling) showCharacterSelect();
});
gameOverScreen.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state === 'GAME_OVER' && !falling) showCharacterSelect();
});

gameCanvas.addEventListener('click', (e) => {
    const rect = gameCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 메뉴 또는 게임오버: 아무 데나 클릭 → 캐릭터 선택
    if (state === 'MENU') {
        showCharacterSelect();
        return;
    }
    if (state === 'GAME_OVER' && !falling) {
        showCharacterSelect();
        return;
    }

    // 캐릭터 선택: 카드 클릭 → 선택, 이미 선택된 카드 클릭 → 확정
    if (state === 'SELECT_CHAR') {
        const { cols, cardW, cardH, gap, startX, startY } = getCharCardLayout();
        for (let i = 0; i < CHARACTERS.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = startX + col * (cardW + gap);
            const cy = startY + row * (cardH + gap);
            if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
                if (i === selectedCharIndex) {
                    // 이미 선택된 캐릭터 → 게임 시작
                    startGame();
                } else {
                    selectedCharIndex = i;
                }
                return;
            }
        }
        return;
    }
});

// ===== 모바일 터치 버튼 =====
const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

function createTouchControls() {
    const container = document.createElement('div');
    container.id = 'touchControls';
    container.style.display = 'none'; // 초기에는 숨김 (MENU 상태)
    container.innerHTML = `
        <button id="btnStraight" class="touch-btn touch-btn-left">⬆️<br><span class="touch-label">전진</span></button>
        <button id="btnTurn" class="touch-btn touch-btn-right">🔄<br><span class="touch-label">방향전환</span></button>
    `;
    document.body.appendChild(container);

    const btnStraight = document.getElementById('btnStraight');
    const btnTurn = document.getElementById('btnTurn');

    // touchstart 사용 (빠른 반응)
    btnStraight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (state === 'PLAYING') handleAction('straight');
        else if (state === 'MENU') showCharacterSelect();
        else if (state === 'GAME_OVER' && !falling) showCharacterSelect();
        else if (state === 'SELECT_CHAR') startGame();
    });

    btnTurn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (state === 'PLAYING') handleAction('turn');
        else if (state === 'MENU') showCharacterSelect();
        else if (state === 'GAME_OVER' && !falling) showCharacterSelect();
        else if (state === 'SELECT_CHAR') {
            selectedCharIndex = (selectedCharIndex + 1) % CHARACTERS.length;
        }
    });

    // 마우스 fallback
    btnStraight.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (state === 'PLAYING') handleAction('straight');
        else if (state === 'MENU') showCharacterSelect();
        else if (state === 'GAME_OVER' && !falling) showCharacterSelect();
        else if (state === 'SELECT_CHAR') startGame();
    });
    btnTurn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (state === 'PLAYING') handleAction('turn');
        else if (state === 'MENU') showCharacterSelect();
        else if (state === 'GAME_OVER' && !falling) showCharacterSelect();
        else if (state === 'SELECT_CHAR') {
            selectedCharIndex = (selectedCharIndex + 1) % CHARACTERS.length;
        }
    });
}

createTouchControls();

// ===== 홈 버튼 =====
function createHomeButton() {
    const btn = document.createElement('button');
    btn.id = 'homeBtn';
    btn.innerHTML = '🏠';
    btn.title = '홈으로';
    document.body.appendChild(btn);

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '../../index.html';
    });
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        window.location.href = '../../index.html';
    });
}

createHomeButton();

// ===== Init =====
// Draw initial state with stairs visible on menu
generateInitialStairs();
const firstStair = stairs[0];
charX = firstStair.x + STAIR_WIDTH / 2 - CHAR_WIDTH / 2;
charY = firstStair.y - CHAR_HEIGHT;
cameraY = charY - H() * 0.55;

gameLoop();
