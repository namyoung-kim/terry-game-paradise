// ===== 인형뽑기 게임 =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===== Canvas 리사이즈 =====
function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const W = () => window.innerWidth;
const H = () => window.innerHeight;

// ===== 게임 상태 =====
const STATE = {
    READY: 'READY',
    PLAYING: 'PLAYING',
    DROPPING: 'DROPPING',
    GRABBING: 'GRABBING',
    RISING: 'RISING',
    DELIVERING: 'DELIVERING',
    RESULT: 'RESULT',
    STAGE_CLEAR: 'STAGE_CLEAR',
    GAME_OVER: 'GAME_OVER'
};

let gameState = STATE.READY;
let score = 0;
let totalScore = 0;
let currentStage = 1;
let attemptsLeft = 5;
let grabbedDoll = null;
let dolls = [];
let particles = [];
let orbs = [];
let shakeTimer = 0;
let shakeIntensity = 0;
let resultDolls = []; // 뽑은 인형들

// ===== 스테이지 설정 =====
const STAGES = [
    { stage: 1, attempts: 5, craneSpeed: 2.5, targetScore: 30, dollCount: 10, normalRatio: 0.7, rareRatio: 0.25, legendRatio: 0.05 },
    { stage: 2, attempts: 5, craneSpeed: 3.0, targetScore: 50, dollCount: 11, normalRatio: 0.6, rareRatio: 0.3, legendRatio: 0.1 },
    { stage: 3, attempts: 4, craneSpeed: 3.5, targetScore: 70, dollCount: 12, normalRatio: 0.55, rareRatio: 0.3, legendRatio: 0.15 },
    { stage: 4, attempts: 4, craneSpeed: 4.0, targetScore: 100, dollCount: 12, normalRatio: 0.5, rareRatio: 0.3, legendRatio: 0.2 },
    { stage: 5, attempts: 3, craneSpeed: 4.5, targetScore: 130, dollCount: 14, normalRatio: 0.45, rareRatio: 0.35, legendRatio: 0.2 }
];

// ===== 인형 데이터 =====
const DOLL_TYPES = {
    normal: [
        { emoji: '🧸', name: '곰인형', points: 10 },
        { emoji: '🐶', name: '강아지', points: 10 },
        { emoji: '🐱', name: '고양이', points: 10 },
        { emoji: '🐰', name: '토끼', points: 10 },
        { emoji: '🐸', name: '개구리', points: 10 }
    ],
    rare: [
        { emoji: '🦊', name: '여우', points: 25 },
        { emoji: '🐧', name: '펭귄', points: 25 },
        { emoji: '🦁', name: '사자', points: 25 },
        { emoji: '🐼', name: '판다', points: 25 },
        { emoji: '🐻', name: '곰', points: 25 }
    ],
    legend: [
        { emoji: '🦄', name: '유니콘', points: 50 },
        { emoji: '🐉', name: '드래곤', points: 50 },
        { emoji: '🎀', name: '리본곰', points: 50 },
        { emoji: '🌟', name: '별인형', points: 50 }
    ]
};

// ===== 크레인 =====
const crane = {
    x: 0.5,  // 0~1 비율
    y: 0.15, // 0~1 비율 (머신 영역 내)
    clawOpen: 1, // 0=닫힘, 1=열림
    ropeLength: 0,
    targetRopeLength: 0,
    speed: 2.5,
    moving: { left: false, right: false, up: false, down: false }
};

// ===== 조이스틱 =====
const joystick = {
    baseX: 0, baseY: 0, baseRadius: 0,
    stickX: 0, stickY: 0, stickRadius: 0,
    active: false, touchId: null,
    dx: 0, dy: 0 // -1~1 정규화 방향
};

// ===== 뽑기 버튼 =====
const grabButton = {
    x: 0, y: 0, radius: 0,
    pressed: false, touchId: null,
    enabled: true
};

// ===== 오브 배경 =====
function initOrbs() {
    orbs = [
        { x: 0.85, y: 0.1, radius: 0.35, color: '124, 58, 237', speed: 0.0003, phaseX: 0, phaseY: 0 },
        { x: 0.1, y: 0.85, radius: 0.30, color: '236, 72, 153', speed: 0.00025, phaseX: 2, phaseY: 1 },
        { x: 0.5, y: 0.45, radius: 0.25, color: '59, 130, 246', speed: 0.0002, phaseX: 4, phaseY: 3 }
    ];
}
initOrbs();

// ===== 머신 영역 계산 =====
function getMachineArea() {
    const isPortrait = W() < H();
    const controlHeight = isPortrait ? H() * 0.22 : H() * 0.2;
    const hudHeight = 50;
    const mx = W() * 0.05;
    const my = hudHeight + 10;
    const mw = W() * 0.9;
    const mh = H() - hudHeight - controlHeight - 30;
    return { mx, my, mw, mh, controlHeight, hudHeight };
}

// ===== 인형 생성 =====
function generateDolls() {
    dolls = [];
    const stage = STAGES[currentStage - 1];
    const { mx, my, mw, mh } = getMachineArea();

    // 인형 배치 영역 (머신 하단 40%)
    const dollAreaTop = my + mh * 0.55;
    const dollAreaBottom = my + mh * 0.92;
    const dollAreaLeft = mx + mw * 0.05;
    const dollAreaRight = mx + mw * 0.95;

    for (let i = 0; i < stage.dollCount; i++) {
        let grade, type;
        const r = Math.random();
        if (r < stage.legendRatio) {
            grade = 'legend';
        } else if (r < stage.legendRatio + stage.rareRatio) {
            grade = 'rare';
        } else {
            grade = 'normal';
        }
        const types = DOLL_TYPES[grade];
        type = types[Math.floor(Math.random() * types.length)];

        const baseSize = grade === 'legend' ? 22 : grade === 'rare' ? 26 : 30;
        const size = baseSize + Math.random() * 6;

        // 겹치지 않도록 위치 생성
        let x, y, overlap;
        let tries = 0;
        do {
            x = dollAreaLeft + Math.random() * (dollAreaRight - dollAreaLeft);
            y = dollAreaTop + Math.random() * (dollAreaBottom - dollAreaTop);
            overlap = dolls.some(d => {
                const dist = Math.sqrt((d.x - x) ** 2 + (d.y - y) ** 2);
                return dist < (d.size + size) * 0.7;
            });
            tries++;
        } while (overlap && tries < 50);

        dolls.push({
            x, y, size,
            emoji: type.emoji,
            name: type.name,
            points: type.points,
            grade,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.02 + 0.01
        });
    }
}

// ===== 파티클 =====
function spawnParticles(x, y, color, count, speed = 5) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        particles.push({
            x, y,
            vx: Math.cos(angle) * (Math.random() * speed),
            vy: Math.sin(angle) * (Math.random() * speed),
            life: 1,
            decay: Math.random() * 0.02 + 0.01,
            size: Math.random() * 6 + 2,
            color
        });
    }
}

function spawnEmoji(x, y, emoji, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 8 - 2,
            life: 1,
            decay: Math.random() * 0.015 + 0.005,
            size: 20 + Math.random() * 15,
            emoji,
            isEmoji: true
        });
    }
}

// ===== 배경 그리기 =====
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H());
    gradient.addColorStop(0, '#0c0c1d');
    gradient.addColorStop(0.5, '#12122b');
    gradient.addColorStop(1, '#1a1a35');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W(), H());

    const t = Date.now();
    for (const orb of orbs) {
        const ox = (orb.x + Math.sin(t * orb.speed + orb.phaseX) * 0.03) * W();
        const oy = (orb.y + Math.cos(t * orb.speed * 0.8 + orb.phaseY) * 0.03) * H();
        const r = orb.radius * Math.min(W(), H());
        const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
        rg.addColorStop(0, `rgba(${orb.color}, 0.12)`);
        rg.addColorStop(0.6, `rgba(${orb.color}, 0.05)`);
        rg.addColorStop(1, `rgba(${orb.color}, 0)`);
        ctx.fillStyle = rg;
        ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
    }
}

// ===== 라운드 사각형 =====
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ===== HUD =====
function drawHUD() {
    const { hudHeight } = getMachineArea();
    const stage = STAGES[currentStage - 1];

    // 배경
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W(), hudHeight);

    const fontSize = Math.min(13, W() * 0.03);
    ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
    ctx.textBaseline = 'middle';
    const cy = hudHeight / 2;

    // 홈 버튼
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'left';
    ctx.fillText('🏠', 12, cy);

    // 스테이지
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`스테이지 ${currentStage}`, W() / 2, cy - fontSize * 0.7);

    // 목표 점수
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.max(8, fontSize * 0.65)}px 'Press Start 2P', monospace`;
    ctx.fillText(`목표: ${stage.targetScore}점`, W() / 2, cy + fontSize * 0.7);

    // 시도 횟수
    ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = attemptsLeft <= 1 ? '#FF4444' : '#4FC3F7';
    ctx.textAlign = 'right';
    ctx.fillText(`⚡${attemptsLeft}`, W() - 80, cy);

    // 점수
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`${score}`, W() - 12, cy);
}

// ===== 크레인 머신 =====
function drawMachine() {
    const { mx, my, mw, mh } = getMachineArea();
    const time = Date.now() * 0.001;

    // 머신 프레임 배경
    ctx.save();
    ctx.shadowColor = '#FF69B4';
    ctx.shadowBlur = 20;

    const frameGrad = ctx.createLinearGradient(mx, my, mx, my + mh);
    frameGrad.addColorStop(0, '#2a1040');
    frameGrad.addColorStop(0.5, '#1a0830');
    frameGrad.addColorStop(1, '#2a1040');
    ctx.fillStyle = frameGrad;
    roundRect(mx, my, mw, mh, 16);
    ctx.fill();
    ctx.restore();

    // 네온 테두리
    ctx.strokeStyle = '#FF69B4';
    ctx.lineWidth = 3;
    roundRect(mx, my, mw, mh, 16);
    ctx.stroke();

    // 내부 유리 느낌
    const glassGrad = ctx.createLinearGradient(mx + 8, my + 8, mx + 8, my + mh - 8);
    glassGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
    glassGrad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    glassGrad.addColorStop(1, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = glassGrad;
    roundRect(mx + 8, my + 8, mw - 16, mh - 16, 12);
    ctx.fill();

    // 인형 바닥 영역
    const floorY = my + mh * 0.55;
    const floorGrad = ctx.createLinearGradient(mx, floorY, mx, my + mh);
    floorGrad.addColorStop(0, 'rgba(139, 69, 19, 0.15)');
    floorGrad.addColorStop(1, 'rgba(139, 69, 19, 0.3)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(mx + 8, floorY, mw - 16, mh - (floorY - my) - 8);

    // 인형 그리기
    for (const doll of dolls) {
        doll.wobble += doll.wobbleSpeed;
        const wobbleX = Math.sin(doll.wobble) * 1.5;
        const wobbleY = Math.cos(doll.wobble * 0.7) * 1;

        // 등급 글로우
        if (doll.grade === 'legend') {
            ctx.save();
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 15 + Math.sin(time * 3) * 8;
            ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
            ctx.beginPath();
            ctx.arc(doll.x + wobbleX, doll.y + wobbleY, doll.size * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (doll.grade === 'rare') {
            ctx.save();
            ctx.shadowColor = '#4FC3F7';
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(79, 195, 247, 0.1)';
            ctx.beginPath();
            ctx.arc(doll.x + wobbleX, doll.y + wobbleY, doll.size * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.font = `${doll.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(doll.emoji, doll.x + wobbleX, doll.y + wobbleY);
    }

    // 레일
    const railY = my + 15;
    ctx.fillStyle = '#555';
    roundRect(mx + 15, railY, mw - 30, 6, 3);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    roundRect(mx + 15, railY, mw - 30, 6, 3);
    ctx.stroke();

    // 크레인 위치 계산
    const craneAreaLeft = mx + 25;
    const craneAreaRight = mx + mw - 25;
    const craneAreaTop = railY + 10;
    const craneAreaBottom = my + mh * 0.85;
    const cx = craneAreaLeft + crane.x * (craneAreaRight - craneAreaLeft);
    const cy = craneAreaTop + crane.y * (craneAreaBottom - craneAreaTop);

    // 크레인 몸체 (상단 캐리지)
    const carriageW = 36;
    const carriageH = 20;
    ctx.fillStyle = '#FFD700';
    roundRect(cx - carriageW / 2, railY - 2, carriageW, carriageH, 5);
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    roundRect(cx - carriageW / 2, railY - 2, carriageW, carriageH, 5);
    ctx.stroke();

    // 줄
    const ropeEndY = railY + carriageH - 2 + crane.ropeLength;
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, railY + carriageH - 2);
    ctx.lineTo(cx, ropeEndY);
    ctx.stroke();

    // 집게
    const clawSize = 14;
    const openAngle = crane.clawOpen * 0.5;

    ctx.save();
    ctx.translate(cx, ropeEndY);

    // 집게 중심부
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 왼쪽 집게
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.lineTo(-clawSize * Math.sin(0.3 + openAngle), clawSize * Math.cos(0.3 + openAngle));
    ctx.stroke();

    // 오른쪽 집게
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.lineTo(clawSize * Math.sin(0.3 + openAngle), clawSize * Math.cos(0.3 + openAngle));
    ctx.stroke();

    ctx.restore();

    // 잡힌 인형 그리기
    if (grabbedDoll && (gameState === STATE.RISING || gameState === STATE.DELIVERING)) {
        ctx.font = `${grabbedDoll.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const shakeX = gameState === STATE.RISING ? Math.sin(time * 15) * 2 : 0;
        ctx.fillText(grabbedDoll.emoji, cx + shakeX, ropeEndY + clawSize + 5);
    }

    // 네온 사인 (상단 장식)
    const neonAlpha = 0.5 + Math.sin(time * 2) * 0.3;
    ctx.save();
    ctx.shadowColor = '#FF69B4';
    ctx.shadowBlur = 15;
    ctx.font = `bold ${Math.min(14, mw * 0.04)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = `rgba(255, 105, 180, ${neonAlpha})`;
    ctx.textAlign = 'center';
    ctx.fillText('🧸 CLAW MACHINE 🧸', mx + mw / 2, my + mh * 0.07);
    ctx.restore();
}

// ===== 조이스틱 그리기 =====
function drawJoystick() {
    const { controlHeight } = getMachineArea();
    const controlY = H() - controlHeight;
    const isPortrait = W() < H();

    // 조이스틱 위치 계산
    const baseRadius = Math.min(55, (isPortrait ? W() * 0.12 : W() * 0.06));
    const stickRadius = baseRadius * 0.45;
    const bx = isPortrait ? W() * 0.22 : W() * 0.15;
    const by = controlY + controlHeight / 2;

    joystick.baseX = bx;
    joystick.baseY = by;
    joystick.baseRadius = baseRadius;
    joystick.stickRadius = stickRadius;

    // 베이스 원 (어두운 홈)
    ctx.save();
    const baseGrad = ctx.createRadialGradient(bx, by, 0, bx, by, baseRadius);
    baseGrad.addColorStop(0, '#1a1a3a');
    baseGrad.addColorStop(0.8, '#0d0d25');
    baseGrad.addColorStop(1, '#2a2a5a');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(bx, by, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    // 베이스 테두리
    ctx.strokeStyle = '#444477';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 방향 표시
    const arrowDist = baseRadius * 0.72;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = `${Math.min(14, baseRadius * 0.3)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▲', bx, by - arrowDist);
    ctx.fillText('▼', bx, by + arrowDist);
    ctx.fillText('◀', bx - arrowDist, by);
    ctx.fillText('▶', bx + arrowDist, by);

    // 스틱 위치
    const sx = bx + joystick.dx * baseRadius * 0.55;
    const sy = by + joystick.dy * baseRadius * 0.55;
    joystick.stickX = sx;
    joystick.stickY = sy;

    // 스틱 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(sx + 2, sy + 2, stickRadius, 0, Math.PI * 2);
    ctx.fill();

    // 스틱 (3D 느낌)
    const stickGrad = ctx.createRadialGradient(sx - stickRadius * 0.3, sy - stickRadius * 0.3, 0, sx, sy, stickRadius);
    stickGrad.addColorStop(0, '#888');
    stickGrad.addColorStop(0.5, '#666');
    stickGrad.addColorStop(1, '#444');
    ctx.fillStyle = stickGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, stickRadius, 0, Math.PI * 2);
    ctx.fill();

    // 스틱 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(sx - stickRadius * 0.2, sy - stickRadius * 0.2, stickRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, stickRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // 조이스틱 라벨
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `${Math.max(7, baseRadius * 0.16)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('이동', bx, by + baseRadius + 16);
}

// ===== 뽑기 버튼 그리기 =====
function drawGrabButton() {
    const { controlHeight } = getMachineArea();
    const controlY = H() - controlHeight;
    const isPortrait = W() < H();
    const time = Date.now() * 0.001;

    const radius = Math.min(50, (isPortrait ? W() * 0.11 : W() * 0.055));
    const bx = isPortrait ? W() * 0.78 : W() * 0.85;
    const by = controlY + controlHeight / 2;

    grabButton.x = bx;
    grabButton.y = by;
    grabButton.radius = radius;

    const canGrab = gameState === STATE.PLAYING || gameState === STATE.DROPPING;
    grabButton.enabled = canGrab;

    ctx.save();

    // 버튼 글로우
    if (canGrab) {
        const glowColor = gameState === STATE.DROPPING ? '#44FF44' : '#FF3333';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15 + Math.sin(time * 3) * 8;
    }

    // 버튼 베이스 (3D 효과)
    const pressOffset = grabButton.pressed ? 3 : 0;

    // 버튼 그림자/베이스
    ctx.fillStyle = gameState === STATE.DROPPING ? '#005500' : '#660000';
    ctx.beginPath();
    ctx.arc(bx, by + 4, radius, 0, Math.PI * 2);
    ctx.fill();

    // 메인 버튼
    const btnGrad = ctx.createRadialGradient(bx - radius * 0.2, by - radius * 0.2 + pressOffset, 0, bx, by + pressOffset, radius);
    if (gameState === STATE.DROPPING) {
        // 하강 중 → 초록색 (잡기!)
        btnGrad.addColorStop(0, '#55FF55');
        btnGrad.addColorStop(0.7, '#22CC22');
        btnGrad.addColorStop(1, '#009900');
    } else if (canGrab) {
        btnGrad.addColorStop(0, '#FF5555');
        btnGrad.addColorStop(0.7, '#DD2222');
        btnGrad.addColorStop(1, '#AA0000');
    } else {
        btnGrad.addColorStop(0, '#666');
        btnGrad.addColorStop(0.7, '#555');
        btnGrad.addColorStop(1, '#444');
    }
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.arc(bx, by + pressOffset, radius, 0, Math.PI * 2);
    ctx.fill();

    // 버튼 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(bx - radius * 0.15, by - radius * 0.2 + pressOffset, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 버튼 테두리
    ctx.strokeStyle = gameState === STATE.DROPPING ? '#66FF66' : canGrab ? '#FF6666' : '#777';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by + pressOffset, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 텍스트 (상태에 따라 변경)
    ctx.fillStyle = canGrab ? '#fff' : '#999';
    ctx.font = `bold ${Math.min(13, radius * 0.32)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const btnText = gameState === STATE.DROPPING ? '잡기!' : '뽑기!';
    ctx.fillText(btnText, bx, by + pressOffset);

    ctx.restore();

    // 라벨
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `${Math.max(7, radius * 0.16)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('버튼', bx, by + radius + 16);
}

// ===== 컨트롤러 영역 배경 =====
function drawControllerBackground() {
    const { controlHeight } = getMachineArea();
    const controlY = H() - controlHeight;

    // 컨트롤러 패널 배경
    const panelGrad = ctx.createLinearGradient(0, controlY, 0, H());
    panelGrad.addColorStop(0, '#1a1a3a');
    panelGrad.addColorStop(0.3, '#151530');
    panelGrad.addColorStop(1, '#0d0d25');
    ctx.fillStyle = panelGrad;
    roundRect(0, controlY, W(), controlHeight, 0);
    ctx.fill();

    // 상단 구분선
    ctx.strokeStyle = '#333366';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, controlY);
    ctx.lineTo(W(), controlY);
    ctx.stroke();

    // 메탈 볼트 장식
    const boltSize = 4;
    ctx.fillStyle = '#555577';
    [[15, controlY + 12], [W() - 15, controlY + 12], [15, H() - 12], [W() - 15, H() - 12]].forEach(([bx, by]) => {
        ctx.beginPath();
        ctx.arc(bx, by, boltSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

// ===== 파티클 그리기 & 업데이트 =====
function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // 중력
        p.life -= p.decay;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        ctx.globalAlpha = p.life;
        if (p.isEmoji) {
            ctx.font = `${p.size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.emoji, p.x, p.y);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

// ===== READY 화면 =====
function drawReadyScreen() {
    drawBackground();
    drawMachine();
    drawControllerBackground();
    drawJoystick();
    drawGrabButton();
    drawHUD();

    const time = Date.now() * 0.001;

    // 반투명 오버레이
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W(), H());

    // 타이틀
    const titleSize = Math.min(28, W() * 0.055);
    ctx.save();
    ctx.shadowColor = '#FF69B4';
    ctx.shadowBlur = 20;
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FF69B4';
    ctx.fillText('🧸 인형뽑기 🧸', W() / 2, H() * 0.18);
    ctx.restore();

    // 스테이지
    ctx.font = `${Math.min(14, W() * 0.03)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`스테이지 ${currentStage}`, W() / 2, H() * 0.27);

    // === 조작 안내 패널 ===
    const panelW = Math.min(420, W() * 0.8);
    const panelH = Math.min(260, H() * 0.42);
    const panelX = (W() - panelW) / 2;
    const panelY = H() * 0.32;

    // 패널 배경
    ctx.fillStyle = 'rgba(20, 10, 40, 0.85)';
    roundRect(panelX, panelY, panelW, panelH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 105, 180, 0.5)';
    ctx.lineWidth = 2;
    roundRect(panelX, panelY, panelW, panelH, 14);
    ctx.stroke();

    const instrFont = Math.min(10, W() * 0.02);
    const lineH = instrFont * 2.8;
    let ty = panelY + lineH * 1.2;

    // 패널 타이틀
    ctx.font = `bold ${Math.min(13, W() * 0.025)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 조작법 🎮', W() / 2, ty);
    ty += lineH * 1.3;

    ctx.font = `${instrFont}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';

    // 조작법 항목
    const instructions = [
        { icon: '🕹️', text: '조이스틱 / 방향키', desc: '크레인 이동', color: '#4FC3F7' },
        { icon: '🔴', text: '버튼 1번째', desc: '집게 내리기 시작', color: '#FF5555' },
        { icon: '🟢', text: '버튼 2번째', desc: '원하는 깊이에서 잡기!', color: '#55FF55' },
    ];

    for (const instr of instructions) {
        // 아이콘
        ctx.fillStyle = instr.color;
        ctx.fillText(`${instr.icon} ${instr.text}`, W() / 2, ty);
        ty += lineH * 0.7;

        // 설명
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `${Math.max(7, instrFont * 0.8)}px 'Press Start 2P', monospace`;
        ctx.fillText(`→ ${instr.desc}`, W() / 2, ty);
        ty += lineH;

        ctx.font = `${instrFont}px 'Press Start 2P', monospace`;
    }

    // 등급 안내
    ty += lineH * 0.2;
    ctx.font = `${Math.max(7, instrFont * 0.8)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('⭐일반 10점  ⭐⭐희귀 25점  ⭐⭐⭐전설 50점', W() / 2, ty);

    // 시작 안내
    const pulse = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.font = `${Math.min(11, W() * 0.022)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.fillText('터치 또는 ENTER로 시작', W() / 2, panelY + panelH + lineH * 1.2);

    drawParticles();
}

// ===== RESULT 화면 =====
function drawResultScreen() {
    drawBackground();

    const time = Date.now() * 0.001;
    const stage = STAGES[currentStage - 1];
    const cleared = score >= stage.targetScore;

    // 오버레이
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W(), H());

    // 결과 타이틀
    const titleSize = Math.min(28, W() * 0.05);
    ctx.save();
    ctx.shadowColor = cleared ? '#FFD700' : '#FF4444';
    ctx.shadowBlur = 20;
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';

    if (cleared) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('🎉 스테이지 클리어! 🎉', W() / 2, H() * 0.2);
    } else {
        ctx.fillStyle = '#FF4444';
        ctx.fillText('😢 게임 오버 😢', W() / 2, H() * 0.2);
    }
    ctx.restore();

    // 점수
    ctx.font = `${Math.min(18, W() * 0.035)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`점수: ${score} / ${stage.targetScore}`, W() / 2, H() * 0.32);

    // 뽑은 인형들
    if (resultDolls.length > 0) {
        ctx.font = `${Math.min(13, W() * 0.025)}px 'Press Start 2P', monospace`;
        ctx.fillStyle = '#4FC3F7';
        ctx.fillText('뽑은 인형들', W() / 2, H() * 0.42);

        const dollsPerRow = Math.min(resultDolls.length, 5);
        const emojiSize = Math.min(35, W() * 0.07);
        const spacing = emojiSize * 1.5;
        const startX = W() / 2 - (dollsPerRow - 1) * spacing / 2;

        for (let i = 0; i < resultDolls.length; i++) {
            const row = Math.floor(i / dollsPerRow);
            const col = i % dollsPerRow;
            const dx = startX + col * spacing;
            const dy = H() * 0.52 + row * (emojiSize * 1.8);
            const bounce = Math.sin(time * 2 + i * 0.5) * 3;

            ctx.font = `${emojiSize}px serif`;
            ctx.fillText(resultDolls[i].emoji, dx, dy + bounce);

            ctx.font = `${Math.max(7, emojiSize * 0.25)}px 'Press Start 2P', monospace`;
            ctx.fillStyle = resultDolls[i].grade === 'legend' ? '#FFD700' : resultDolls[i].grade === 'rare' ? '#4FC3F7' : '#aaa';
            ctx.fillText(`${resultDolls[i].points}점`, dx, dy + emojiSize * 0.6);
            ctx.fillStyle = '#4FC3F7';
        }
    }

    // 안내
    const pulse = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.font = `${Math.min(11, W() * 0.022)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    if (cleared && currentStage < 5) {
        ctx.fillText('터치하여 다음 스테이지', W() / 2, H() * 0.88);
    } else if (cleared && currentStage >= 5) {
        ctx.fillText('🏆 모든 스테이지 클리어! 터치하여 재시작', W() / 2, H() * 0.88);
    } else {
        ctx.fillText('터치하여 다시 도전', W() / 2, H() * 0.88);
    }

    drawParticles();
}

// ===== 크레인 업데이트 =====
function updateCrane() {
    const stage = STAGES[currentStage - 1];
    const speed = stage.craneSpeed * 0.005;

    if (gameState === STATE.PLAYING) {
        // 키보드 입력
        if (crane.moving.left) crane.x = Math.max(0, crane.x - speed);
        if (crane.moving.right) crane.x = Math.min(1, crane.x + speed);
        if (crane.moving.up) crane.y = Math.max(0, crane.y - speed);
        if (crane.moving.down) crane.y = Math.min(1, crane.y + speed);

        // 조이스틱 입력
        if (joystick.active) {
            crane.x = Math.max(0, Math.min(1, crane.x + joystick.dx * speed));
            crane.y = Math.max(0, Math.min(1, crane.y + joystick.dy * speed));
        }

        crane.ropeLength = 0;
        crane.clawOpen = 1;
    }

    if (gameState === STATE.DROPPING) {
        const { my, mh } = getMachineArea();
        const maxRope = mh * 0.85;
        crane.ropeLength += 3;
        crane.clawOpen = 1;

        // 최대 깊이 도달 시 자동 잡기 (안전장치)
        if (crane.ropeLength >= maxRope) {
            crane.ropeLength = maxRope;
            gameState = STATE.GRABBING;
        }
    }

    if (gameState === STATE.GRABBING) {
        crane.clawOpen = Math.max(0, crane.clawOpen - 0.05);
        if (crane.clawOpen <= 0) {
            // 잡기 판정
            checkGrab();
            gameState = STATE.RISING;
        }
    }

    if (gameState === STATE.RISING) {
        crane.ropeLength -= 3;
        if (crane.ropeLength <= 0) {
            crane.ropeLength = 0;
            if (grabbedDoll) {
                gameState = STATE.DELIVERING;
            } else {
                // 실패
                spawnParticles(W() / 2, H() * 0.4, '#666', 10, 3);
                attemptsLeft--;
                if (attemptsLeft <= 0) {
                    gameState = STATE.RESULT;
                } else {
                    gameState = STATE.PLAYING;
                }
            }
        }

        // 확률적 떨어뜨리기 (스릴 요소)
        if (grabbedDoll && crane.ropeLength > 20 && Math.random() < 0.003) {
            // 떨어뜨림!
            const { mx, mw, my, mh } = getMachineArea();
            const cx = mx + 25 + crane.x * (mw - 50);
            dolls.push({
                ...grabbedDoll,
                x: cx,
                y: my + mh * 0.7
            });
            spawnEmoji(cx, my + mh * 0.5, '😢', 3);
            shakeTimer = 10;
            shakeIntensity = 3;
            grabbedDoll = null;
        }
    }

    if (gameState === STATE.DELIVERING) {
        // 성공! 점수 추가
        score += grabbedDoll.points;
        resultDolls.push(grabbedDoll);

        const { mx, mw, my } = getMachineArea();
        const cx = mx + 25 + crane.x * (mw - 50);
        spawnParticles(cx, my + 50, '#FFD700', 20, 6);
        spawnEmoji(cx, my + 50, '⭐', 5);
        spawnEmoji(cx, my + 50, grabbedDoll.emoji, 3);

        if (grabbedDoll.grade === 'legend') {
            shakeTimer = 15;
            shakeIntensity = 5;
            spawnParticles(cx, my + 50, '#FF69B4', 30, 8);
        }

        grabbedDoll = null;
        crane.clawOpen = 1;
        attemptsLeft--;

        if (attemptsLeft <= 0) {
            setTimeout(() => { gameState = STATE.RESULT; }, 500);
            gameState = STATE.PLAYING; // 잠시 이펙트 보여줌
        } else {
            gameState = STATE.PLAYING;
        }
    }
}

// ===== 잡기 판정 =====
function checkGrab() {
    const { mx, mw, my, mh } = getMachineArea();
    const clawX = mx + 25 + crane.x * (mw - 50);
    const clawY = my + 20 + crane.ropeLength + 14; // 집게 끝

    let closest = null;
    let closestDist = Infinity;

    for (const doll of dolls) {
        const dist = Math.sqrt((doll.x - clawX) ** 2 + (doll.y - clawY) ** 2);
        if (dist < closestDist) {
            closestDist = dist;
            closest = doll;
        }
    }

    if (!closest) return;

    // 확률 판정
    let grabChance = 0;
    const hitRadius = closest.size;

    if (closestDist < hitRadius * 0.4) {
        grabChance = 1.0; // 완벽
    } else if (closestDist < hitRadius * 0.7) {
        grabChance = 0.8; // 높음
    } else if (closestDist < hitRadius * 1.0) {
        grabChance = 0.5; // 보통
    } else if (closestDist < hitRadius * 1.3) {
        grabChance = 0.25; // 낮음
    }

    // 등급별 보정
    if (closest.grade === 'legend') grabChance *= 0.7;
    else if (closest.grade === 'rare') grabChance *= 0.85;

    if (Math.random() < grabChance) {
        grabbedDoll = closest;
        dolls = dolls.filter(d => d !== closest);
    }
}

// ===== 시작 함수 =====
function startStage() {
    const stage = STAGES[currentStage - 1];
    attemptsLeft = stage.attempts;
    crane.speed = stage.craneSpeed;
    score = 0;
    resultDolls = [];
    grabbedDoll = null;
    crane.x = 0.5;
    crane.y = 0.15;
    crane.ropeLength = 0;
    crane.clawOpen = 1;
    generateDolls();
    gameState = STATE.PLAYING;
}

// ===== 키보드 입력 =====
document.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
    }

    if (gameState === STATE.READY) {
        if (e.key === 'Enter' || e.key === ' ') {
            startStage();
        }
        return;
    }

    if (gameState === STATE.RESULT) {
        if (e.key === 'Enter' || e.key === ' ') {
            const stage = STAGES[currentStage - 1];
            if (score >= stage.targetScore && currentStage < 5) {
                currentStage++;
                gameState = STATE.READY;
            } else if (score >= stage.targetScore && currentStage >= 5) {
                currentStage = 1;
                totalScore = 0;
                gameState = STATE.READY;
            } else {
                gameState = STATE.READY;
            }
        }
        return;
    }

    if (gameState === STATE.PLAYING) {
        if (e.key === 'ArrowLeft' || e.key === 'a') crane.moving.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd') crane.moving.right = true;
        if (e.key === 'ArrowUp' || e.key === 'w') crane.moving.up = true;
        if (e.key === 'ArrowDown' || e.key === 's') crane.moving.down = true;
        if (e.key === ' ' || e.key === 'Enter') {
            gameState = STATE.DROPPING;
        }
    }

    // DROPPING 중 2번째 버튼 → 즉시 잡기
    if (gameState === STATE.DROPPING) {
        if (e.key === ' ' || e.key === 'Enter') {
            gameState = STATE.GRABBING;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') crane.moving.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') crane.moving.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w') crane.moving.up = false;
    if (e.key === 'ArrowDown' || e.key === 's') crane.moving.down = false;
});

// ===== 터치/마우스 =====
function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.changedTouches) {
        return Array.from(e.changedTouches).map(t => ({
            x: t.clientX - rect.left,
            y: t.clientY - rect.top,
            id: t.identifier
        }));
    }
    return [{ x: e.clientX - rect.left, y: e.clientY - rect.top, id: -1 }];
}

function isInsideCircle(px, py, cx, cy, r) {
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

// 홈 버튼 영역
function isHomeButton(x, y) {
    return x < 50 && y < 50;
}

canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
canvas.addEventListener('touchend', handlePointerUp, { passive: false });
canvas.addEventListener('touchcancel', handlePointerUp, { passive: false });
canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('mouseup', handlePointerUp);

function handlePointerDown(e) {
    e.preventDefault();
    const touches = getTouchPos(e);

    for (const touch of touches) {
        // 홈 버튼
        if (isHomeButton(touch.x, touch.y)) {
            window.location.href = '../../index.html';
            return;
        }

        // READY 또는 RESULT 화면 터치
        if (gameState === STATE.READY) {
            startStage();
            return;
        }
        if (gameState === STATE.RESULT) {
            const stage = STAGES[currentStage - 1];
            if (score >= stage.targetScore && currentStage < 5) {
                currentStage++;
                gameState = STATE.READY;
            } else if (score >= stage.targetScore && currentStage >= 5) {
                currentStage = 1;
                totalScore = 0;
                gameState = STATE.READY;
            } else {
                gameState = STATE.READY;
            }
            return;
        }

        // 조이스틱 터치
        if (isInsideCircle(touch.x, touch.y, joystick.baseX, joystick.baseY, joystick.baseRadius * 1.3)) {
            joystick.active = true;
            joystick.touchId = touch.id;
            const dx = touch.x - joystick.baseX;
            const dy = touch.y - joystick.baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = joystick.baseRadius * 0.8;
            if (dist > 0) {
                const clampDist = Math.min(dist, maxDist);
                joystick.dx = (dx / dist) * (clampDist / maxDist);
                joystick.dy = (dy / dist) * (clampDist / maxDist);
            }
            continue;
        }

        // 뽑기 버튼 터치
        if (isInsideCircle(touch.x, touch.y, grabButton.x, grabButton.y, grabButton.radius * 1.2) && grabButton.enabled) {
            grabButton.pressed = true;
            grabButton.touchId = touch.id;
            if (gameState === STATE.PLAYING) {
                gameState = STATE.DROPPING;
            } else if (gameState === STATE.DROPPING) {
                // 2번째 누르기 → 즉시 잡기!
                gameState = STATE.GRABBING;
            }
            continue;
        }
    }
}

function handlePointerMove(e) {
    e.preventDefault();
    const touches = getTouchPos(e);

    for (const touch of touches) {
        if (joystick.active && (touch.id === joystick.touchId || touch.id === -1)) {
            const dx = touch.x - joystick.baseX;
            const dy = touch.y - joystick.baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = joystick.baseRadius * 0.8;
            if (dist > 0) {
                const clampDist = Math.min(dist, maxDist);
                joystick.dx = (dx / dist) * (clampDist / maxDist);
                joystick.dy = (dy / dist) * (clampDist / maxDist);
            }
        }
    }
}

function handlePointerUp(e) {
    e.preventDefault();
    const touches = getTouchPos(e);

    for (const touch of touches) {
        if (touch.id === joystick.touchId || (touch.id === -1 && joystick.active)) {
            joystick.active = false;
            joystick.touchId = null;
            joystick.dx = 0;
            joystick.dy = 0;
        }
        if (touch.id === grabButton.touchId || (touch.id === -1 && grabButton.pressed)) {
            grabButton.pressed = false;
            grabButton.touchId = null;
        }
    }
}

// ===== 화면 흔들기 =====
function applyShake() {
    if (shakeTimer > 0) {
        const sx = (Math.random() - 0.5) * shakeIntensity;
        const sy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(sx, sy);
        shakeTimer--;
    }
}

// ===== 메인 루프 =====
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    resizeCanvas();
    applyShake();

    if (gameState === STATE.READY) {
        drawReadyScreen();
    } else if (gameState === STATE.RESULT) {
        drawResultScreen();
    } else {
        updateCrane();
        drawBackground();
        drawMachine();
        drawControllerBackground();
        drawJoystick();
        drawGrabButton();
        drawHUD();
        drawParticles();
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// 스크롤 방지
window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
    }
});

gameLoop();
