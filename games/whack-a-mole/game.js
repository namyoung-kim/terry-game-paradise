// ===== 두더지 잡기 게임 =====
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
    STAGE_CLEAR: 'STAGE_CLEAR',
    GAME_OVER: 'GAME_OVER'
};

let gameState = STATE.READY;
let score = 0;
let timeLeft = 30;
let currentStage = 1;
let combo = 0;
let maxCombo = 0;
let lastSpawnTime = 0;
let gameTimer = null;
let stageTransitionTimer = 0;

// ===== 스테이지 설정 =====
const STAGES = [
    { stage: 1, targetScore: 80, maxMoles: 1, spawnInterval: 1200, moleShowTime: 1500, bombChance: 0.05, fastChance: 0.05, goldChance: 0.02 },
    { stage: 2, targetScore: 120, maxMoles: 2, spawnInterval: 1000, moleShowTime: 1300, bombChance: 0.10, fastChance: 0.10, goldChance: 0.03 },
    { stage: 3, targetScore: 180, maxMoles: 2, spawnInterval: 800, moleShowTime: 1100, bombChance: 0.12, fastChance: 0.15, goldChance: 0.05 },
    { stage: 4, targetScore: 250, maxMoles: 3, spawnInterval: 600, moleShowTime: 900, bombChance: 0.15, fastChance: 0.20, goldChance: 0.07 },
    { stage: 5, targetScore: 350, maxMoles: 3, spawnInterval: 500, moleShowTime: 700, bombChance: 0.18, fastChance: 0.25, goldChance: 0.10 }
];

// ===== 두더지 타입 =====
const MOLE_TYPES = {
    normal: { emoji: '🐹', name: '두더지', points: 10, color: '#8B4513' },
    fast: { emoji: '🐭', name: '빠른쥐', points: 20, color: '#A0522D' },
    gold: { emoji: '⭐', name: '황금별', points: 50, color: '#FFD700' },
    bomb: { emoji: '💣', name: '폭탄', points: -30, color: '#333' }
};

// ===== 구멍 & 두더지 =====
const GRID_ROWS = 3;
const GRID_COLS = 3;
let holes = []; // { x, y, size, mole: null | { type, showProgress, hiding, hitTime } }

// ===== 파티클 =====
let particles = [];
let emojiParticles = [];
let screenShake = 0;

// ===== 별 배경 =====
let stars = [];
function initStars() {
    stars = [];
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * W(),
            y: Math.random() * H(),
            size: Math.random() * 2 + 0.3,
            speed: Math.random() * 0.3 + 0.05,
            brightness: Math.random() * 0.6 + 0.3,
            twinkleSpeed: Math.random() * 0.03 + 0.01,
            twinkleOffset: Math.random() * Math.PI * 2
        });
    }
}
initStars();

// ===== 구멍 레이아웃 계산 =====
function calculateLayout() {
    holes = [];
    const isPortrait = W() < H();

    // 게임 영역 계산
    const areaTop = H() * 0.18;
    const areaBottom = H() * 0.88;
    const areaLeft = W() * 0.08;
    const areaRight = W() * 0.92;
    const areaW = areaRight - areaLeft;
    const areaH = areaBottom - areaTop;

    const cellW = areaW / GRID_COLS;
    const cellH = areaH / GRID_ROWS;
    const holeSize = Math.min(cellW, cellH) * 0.6;

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const cx = areaLeft + cellW * c + cellW / 2;
            const cy = areaTop + cellH * r + cellH / 2;
            holes.push({
                x: cx,
                y: cy,
                size: holeSize,
                mole: null
            });
        }
    }
}
calculateLayout();
window.addEventListener('resize', () => {
    calculateLayout();
    initStars();
});

// ===== 파티클 생성 =====
function spawnParticles(x, y, color, count, speed = 5) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * speed + 1;
        particles.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 2,
            life: 1,
            decay: Math.random() * 0.025 + 0.015,
            size: Math.random() * 6 + 3,
            color
        });
    }
}

function spawnEmoji(x, y, emoji, count = 1) {
    for (let i = 0; i < count; i++) {
        emojiParticles.push({
            x: x + (Math.random() - 0.5) * 30,
            y,
            vy: -3 - Math.random() * 3,
            vx: (Math.random() - 0.5) * 2,
            life: 1,
            decay: 0.015,
            emoji,
            size: 24 + Math.random() * 16,
            rotation: (Math.random() - 0.5) * 0.3
        });
    }
}

// ===== 점수 플로팅 텍스트 =====
let floatingTexts = [];
function showFloatingText(x, y, text, color) {
    floatingTexts.push({
        x, y,
        text,
        color,
        life: 1,
        vy: -2
    });
}

// ===== 두더지 생성 =====
function getStageConfig() {
    return STAGES[Math.min(currentStage - 1, STAGES.length - 1)];
}

function spawnMole() {
    const config = getStageConfig();

    // 빈 구멍 찾기
    const emptyHoles = holes.filter(h => h.mole === null);
    if (emptyHoles.length === 0) return;

    // 현재 활성 두더지 수 체크
    const activeMoles = holes.filter(h => h.mole !== null).length;
    if (activeMoles >= config.maxMoles) return;

    // 랜덤 빈 구멍 선택
    const hole = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];

    // 두더지 타입 결정
    let type = 'normal';
    const rand = Math.random();
    if (rand < config.bombChance) {
        type = 'bomb';
    } else if (rand < config.bombChance + config.goldChance) {
        type = 'gold';
    } else if (rand < config.bombChance + config.goldChance + config.fastChance) {
        type = 'fast';
    }

    const showTime = type === 'fast' ? config.moleShowTime * 0.6 :
        type === 'gold' ? config.moleShowTime * 0.5 :
            config.moleShowTime;

    hole.mole = {
        type,
        showProgress: 0,     // 0~1 (올라오기), 1 = 완전히 나옴
        phase: 'rising',     // rising, showing, hiding
        showTimer: showTime,
        hit: false,
        hitTimer: 0
    };
}

// ===== 두더지 업데이트 =====
function updateMoles(dt) {
    for (const hole of holes) {
        if (!hole.mole) continue;
        const mole = hole.mole;

        if (mole.hit) {
            mole.hitTimer -= dt;
            mole.showProgress = Math.max(0, mole.showProgress - dt * 0.004);
            if (mole.hitTimer <= 0) {
                hole.mole = null;
            }
            continue;
        }

        if (mole.phase === 'rising') {
            mole.showProgress += dt * 0.005;
            if (mole.showProgress >= 1) {
                mole.showProgress = 1;
                mole.phase = 'showing';
            }
        } else if (mole.phase === 'showing') {
            mole.showTimer -= dt;
            if (mole.showTimer <= 0) {
                mole.phase = 'hiding';
            }
        } else if (mole.phase === 'hiding') {
            mole.showProgress -= dt * 0.004;
            if (mole.showProgress <= 0) {
                // 놓친 두더지 - 콤보 리셋
                if (mole.type !== 'bomb') {
                    combo = 0;
                }
                hole.mole = null;
            }
        }
    }
}

// ===== 두더지 때리기 =====
function whackMole(holeIndex) {
    const hole = holes[holeIndex];
    if (!hole.mole || hole.mole.hit || hole.mole.showProgress < 0.3) return false;

    const mole = hole.mole;
    const typeInfo = MOLE_TYPES[mole.type];

    mole.hit = true;
    mole.hitTimer = 300;

    if (mole.type === 'bomb') {
        // 폭탄!
        score = Math.max(0, score + typeInfo.points);
        combo = 0;
        screenShake = 15;
        spawnParticles(hole.x, hole.y, '#FF4500', 25, 8);
        spawnParticles(hole.x, hole.y, '#FFD700', 15, 6);
        spawnEmoji(hole.x, hole.y, '💥', 3);
        showFloatingText(hole.x, hole.y - hole.size * 0.3, typeInfo.points.toString(), '#FF4500');
    } else {
        // 점수 획득!
        combo++;
        if (combo > maxCombo) maxCombo = combo;

        // 콤보 보너스
        const comboBonus = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
        const points = typeInfo.points * comboBonus;
        score += points;

        const color = mole.type === 'gold' ? '#FFD700' : mole.type === 'fast' ? '#00BFFF' : '#00FF7F';
        spawnParticles(hole.x, hole.y, color, 15, 5);
        spawnEmoji(hole.x, hole.y, '🔨', 1);

        if (mole.type === 'gold') {
            spawnEmoji(hole.x, hole.y, '✨', 2);
            spawnParticles(hole.x, hole.y, '#FFD700', 20, 7);
        }

        let text = `+${points}`;
        if (comboBonus > 1) text += ` x${comboBonus}`;
        showFloatingText(hole.x, hole.y - hole.size * 0.3, text, color);

        if (combo >= 5) {
            showFloatingText(hole.x, hole.y - hole.size * 0.6, `${combo} COMBO!`, '#FFD700');
        }
    }

    return true;
}

// ===== 게임 시작 =====
let allTimerIds = []; // 모든 타이머 ID 추적

function clearAllGameTimers() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    for (const id of allTimerIds) {
        clearInterval(id);
    }
    allTimerIds = [];
}

function startStage() {
    const config = getStageConfig();
    timeLeft = 30;
    lastSpawnTime = 0;
    gameState = STATE.PLAYING;

    // 모든 구멍 초기화
    for (const hole of holes) {
        hole.mole = null;
    }
    particles = [];
    emojiParticles = [];
    floatingTexts = [];

    if (currentStage === 1) {
        score = 0;
        combo = 0;
        maxCombo = 0;
    }

    // 기존 타이머 모두 정리
    clearAllGameTimers();

    // 타이머 시작
    gameTimer = setInterval(() => {
        if (gameState !== STATE.PLAYING) return;
        timeLeft--;
        if (timeLeft <= 0) {
            timeLeft = 0;
            checkStageEnd();
        }
    }, 1000);
    allTimerIds.push(gameTimer);
}

function checkStageEnd() {
    clearAllGameTimers();
    const config = getStageConfig();

    if (score >= config.targetScore) {
        if (currentStage >= STAGES.length) {
            // 최종 클리어!
            gameState = STATE.STAGE_CLEAR;
            stageTransitionTimer = 0;
        } else {
            gameState = STATE.STAGE_CLEAR;
            stageTransitionTimer = 0;
        }
        // 축하 파티클
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                spawnParticles(Math.random() * W(), Math.random() * H() * 0.5, '#FFD700', 20, 8);
                spawnEmoji(Math.random() * W(), Math.random() * H() * 0.5, '🎉', 1);
            }, i * 200);
        }
    } else {
        gameState = STATE.GAME_OVER;
        stageTransitionTimer = 0;
    }
}

// ===== 배경 그리기 =====
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H());
    gradient.addColorStop(0, '#050510');
    gradient.addColorStop(0.4, '#0a0a2e');
    gradient.addColorStop(1, '#1a0f0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W(), H());

    // 별
    const time = Date.now() * 0.001;
    for (const star of stars) {
        star.y += star.speed;
        if (star.y > H()) { star.y = 0; star.x = Math.random() * W(); }
        const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.twinkleOffset) * 0.3 + 0.7;
        ctx.globalAlpha = star.brightness * twinkle;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
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

// ===== HUD 그리기 =====
function drawHUD() {
    const fontSize = Math.min(14, W() * 0.025);
    const padding = 12;
    const config = getStageConfig();

    // 홈 버튼
    const homeSize = Math.min(36, W() * 0.06);
    ctx.font = `${homeSize}px serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🏠', padding, padding);

    // 스테이지
    ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText(`STAGE ${currentStage}`, W() / 2, padding);

    // 점수
    ctx.font = `${fontSize * 0.9}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`${score} / ${config.targetScore}`, W() / 2, padding + fontSize * 1.5);

    // 점수 바
    const barW = Math.min(200, W() * 0.35);
    const barH = 8;
    const barX = W() / 2 - barW / 2;
    const barY = padding + fontSize * 2.8;

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    const progress = Math.min(1, score / config.targetScore);
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW * progress, 0);
    barGrad.addColorStop(0, '#00FF7F');
    barGrad.addColorStop(1, '#FFD700');
    ctx.fillStyle = barGrad;
    roundRect(barX, barY, barW * progress, barH, 4);
    ctx.fill();

    // 시간
    const timeColor = timeLeft <= 5 ? '#FF4500' : timeLeft <= 10 ? '#FFD700' : '#fff';
    ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = timeColor;
    ctx.textAlign = 'right';
    ctx.fillText(`⏱ ${timeLeft}`, W() - padding, padding);

    // 콤보
    if (combo >= 3) {
        const comboSize = Math.min(18, W() * 0.03);
        const pulse = Math.sin(Date.now() * 0.005) * 0.15 + 0.85;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.font = `bold ${comboSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = combo >= 10 ? '#FF4500' : combo >= 5 ? '#FFD700' : '#00FF7F';
        ctx.textAlign = 'right';
        ctx.fillText(`${combo} COMBO`, W() - padding, padding + fontSize * 2);
        ctx.restore();
    }
}

// ===== 구멍 & 두더지 그리기 =====
function drawHoles() {
    const time = Date.now() * 0.001;

    for (const hole of holes) {
        const { x, y, size } = hole;
        const halfSize = size / 2;

        // 구멍 그림자 (타원)
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, y + halfSize * 0.3, halfSize * 1.1, halfSize * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1a0f05';
        ctx.fill();
        ctx.strokeStyle = '#3d2b1f';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 두더지 클리핑 영역 (구멍 위쪽만 보이게)
        if (hole.mole) {
            const mole = hole.mole;
            const typeInfo = MOLE_TYPES[mole.type];
            const moleY = y + halfSize * 0.3 - (mole.showProgress * halfSize * 1.2);
            const emojiSize = size * 0.6;

            // 클리핑: 구멍 위로만 두더지가 보이게
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - halfSize * 1.2, y - size * 2, halfSize * 2.4, size * 2 + halfSize * 0.3);
            ctx.clip();

            // 두더지 몸통 (둥근 사각형)
            if (!mole.hit) {
                const bodyW = size * 0.55;
                const bodyH = size * 0.7;
                const bodyGrad = ctx.createLinearGradient(x, moleY - bodyH / 2, x, moleY + bodyH / 2);
                bodyGrad.addColorStop(0, typeInfo.color);
                bodyGrad.addColorStop(1, mole.type === 'bomb' ? '#111' : '#5C3317');
                ctx.fillStyle = bodyGrad;
                roundRect(x - bodyW / 2, moleY - bodyH * 0.3, bodyW, bodyH, bodyW * 0.3);
                ctx.fill();
            }

            // 이모지
            ctx.font = `${emojiSize}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (mole.hit) {
                // 맞았을 때 효과
                if (mole.type === 'bomb') {
                    ctx.globalAlpha = mole.showProgress;
                    ctx.fillText('💥', x, moleY);
                } else {
                    ctx.globalAlpha = mole.showProgress;
                    const wobble = Math.sin(Date.now() * 0.02) * 10;
                    ctx.fillText('😵', x + wobble, moleY);
                }
            } else {
                // 황금별 빛나는 효과
                if (mole.type === 'gold') {
                    ctx.save();
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 15 + Math.sin(time * 5) * 8;
                    ctx.fillText(typeInfo.emoji, x, moleY);
                    ctx.restore();
                } else if (mole.type === 'bomb') {
                    // 폭탄 떨림 효과
                    const shake = Math.sin(time * 15) * 2;
                    ctx.fillText(typeInfo.emoji, x + shake, moleY);
                } else {
                    ctx.fillText(typeInfo.emoji, x, moleY);
                }
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // 구멍 앞쪽 (흙 테두리) - 두더지 위에 덮이는 부분
        ctx.beginPath();
        ctx.ellipse(x, y + halfSize * 0.3, halfSize * 1.15, halfSize * 0.25, 0, 0, Math.PI);
        const dirtGrad = ctx.createLinearGradient(x, y + halfSize * 0.1, x, y + halfSize * 0.55);
        dirtGrad.addColorStop(0, '#5C3317');
        dirtGrad.addColorStop(1, '#3d2b1f');
        ctx.fillStyle = dirtGrad;
        ctx.fill();

        // 잔디 장식
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 2;
        const grassCount = 5;
        for (let g = 0; g < grassCount; g++) {
            const gx = x - halfSize * 0.8 + (halfSize * 1.6 / grassCount) * g;
            const gy = y + halfSize * 0.3;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            const sway = Math.sin(time * 2 + g * 1.5) * 3;
            ctx.quadraticCurveTo(gx + sway, gy - 8, gx + sway * 1.5, gy - 14);
            ctx.stroke();
        }

    }
}

// ===== 파티클 그리기 =====
function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // 중력
        p.life -= p.decay;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = emojiParticles.length - 1; i >= 0; i--) {
        const p = emojiParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= p.decay;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * (1 - p.life) * 5);
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
        if (p.life <= 0) emojiParticles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.life -= 0.02;
        ctx.globalAlpha = Math.max(0, ft.life);
        const fontSize = Math.min(16, W() * 0.03);
        ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    ctx.globalAlpha = 1;
}

// ===== READY 화면 =====
function drawReadyScreen() {
    drawBackground();

    const time = Date.now() * 0.001;
    const cx = W() / 2;

    // 홈 버튼
    const homeSize = Math.min(36, W() * 0.06);
    ctx.font = `${homeSize}px serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🏠', 12, 12);

    // 타이틀
    const titleSize = Math.min(36, W() * 0.06);
    ctx.save();
    ctx.shadowColor = '#FF8C00';
    ctx.shadowBlur = 20 + Math.sin(time * 2) * 8;
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';

    const titleGrad = ctx.createLinearGradient(cx - 150, 0, cx + 150, 0);
    titleGrad.addColorStop(0, '#FF8C00');
    titleGrad.addColorStop(0.5, '#FFD700');
    titleGrad.addColorStop(1, '#FF6347');
    ctx.fillStyle = titleGrad;

    const bounce = Math.sin(time * 1.5) * 5;
    ctx.fillText('두더지 잡기', cx, H() * 0.2 + bounce);
    ctx.restore();

    // 두더지 이모지 장식
    const emojiSize = Math.min(50, W() * 0.08);
    ctx.font = `${emojiSize}px serif`;
    const displayEmojis = ['🐹', '🔨', '🐭', '⭐', '💣'];
    for (let i = 0; i < displayEmojis.length; i++) {
        const angle = time * 0.6 + (i / displayEmojis.length) * Math.PI * 2;
        const radius = Math.min(130, W() * 0.18);
        const ex = cx + Math.cos(angle) * radius;
        const ey = H() * 0.42 + Math.sin(angle) * radius * 0.5;
        ctx.globalAlpha = 0.7 + Math.sin(time * 2 + i) * 0.3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayEmojis[i], ex, ey);
    }
    ctx.globalAlpha = 1;

    // 규칙 설명
    const infoSize = Math.min(12, W() * 0.02);
    ctx.font = `${infoSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';

    const rules = [
        '🐹 두더지를 클릭해서 잡아라!',
        '⭐ 황금별은 50점!',
        '💣 폭탄은 누르면 안돼! -30점',
        '🔥 콤보로 점수 2배, 3배!',
    ];
    rules.forEach((rule, i) => {
        ctx.fillStyle = i === 2 ? '#FF6347' : '#bbb';
        ctx.fillText(rule, cx, H() * 0.58 + i * (infoSize * 2.2));
    });

    // 시작 안내
    const startSize = Math.min(14, W() * 0.022);
    const pulse = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.font = `${startSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.fillText('클릭 또는 ENTER로 시작!', cx, H() * 0.82);

    // 하단
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = `${Math.min(9, W() * 0.012)}px 'Press Start 2P', monospace`;
    ctx.fillText('© 2026 태리의 게임천국', cx, H() * 0.95);

    drawParticles();
}

// ===== 스테이지 클리어 화면 =====
function drawStageClearScreen() {
    drawBackground();

    const time = Date.now() * 0.001;
    const cx = W() / 2;
    const cy = H() / 2;
    const isFinal = currentStage >= STAGES.length;

    // 배경 글로우
    ctx.save();
    const glowRadius = Math.min(W(), H()) * 0.4;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.1)');
    glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W(), H());
    ctx.restore();

    // 타이틀
    const titleSize = Math.min(32, W() * 0.05);
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';

    if (isFinal) {
        ctx.fillText('🏆 ALL CLEAR! 🏆', cx, cy - titleSize * 2);
    } else {
        ctx.fillText('✨ STAGE CLEAR! ✨', cx, cy - titleSize * 2);
    }
    ctx.restore();

    // 정보
    const infoSize = Math.min(14, W() * 0.022);
    ctx.font = `${infoSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`점수: ${score}`, cx, cy - infoSize);
    ctx.fillText(`최대 콤보: ${maxCombo}`, cx, cy + infoSize * 1.2);

    // 다음 안내
    const pulse = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.font = `${infoSize * 0.9}px 'Press Start 2P', monospace`;
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;

    if (isFinal) {
        ctx.fillText('클릭으로 처음부터 시작', cx, cy + infoSize * 4);
    } else {
        ctx.fillText('클릭으로 다음 스테이지!', cx, cy + infoSize * 4);
    }

    drawParticles();
}

// ===== 게임 오버 화면 =====
function drawGameOverScreen() {
    drawBackground();

    const time = Date.now() * 0.001;
    const cx = W() / 2;
    const cy = H() / 2;
    const config = getStageConfig();

    // 어두운 오버레이
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, W(), H());

    // 타이틀
    const titleSize = Math.min(28, W() * 0.045);
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FF4500';
    ctx.textAlign = 'center';
    ctx.fillText('😢 TIME UP! 😢', cx, cy - titleSize * 2.5);

    // 점수
    const infoSize = Math.min(13, W() * 0.02);
    ctx.font = `${infoSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`점수: ${score} / 목표: ${config.targetScore}`, cx, cy - infoSize);
    ctx.fillText(`스테이지: ${currentStage}`, cx, cy + infoSize * 1.5);
    ctx.fillText(`최대 콤보: ${maxCombo}`, cx, cy + infoSize * 3);

    // 재시작 안내
    const pulse = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.font = `${infoSize * 0.9}px 'Press Start 2P', monospace`;
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.fillText('클릭으로 다시 시작!', cx, cy + infoSize * 6);

    // 홈 안내
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${Math.min(10, W() * 0.015)}px 'Press Start 2P', monospace`;
    ctx.fillText('🏠 홈으로 돌아가기', cx, cy + infoSize * 8);

    drawParticles();
}

// ===== 플레이 화면 =====
function drawPlayScreen() {
    drawBackground();

    // 화면 흔들림 적용
    if (screenShake > 0) {
        ctx.save();
        ctx.translate(
            (Math.random() - 0.5) * screenShake,
            (Math.random() - 0.5) * screenShake
        );
        screenShake *= 0.85;
        if (screenShake < 0.5) screenShake = 0;
    }

    // 잔디 바닥
    const grassGrad = ctx.createLinearGradient(0, H() * 0.75, 0, H());
    grassGrad.addColorStop(0, 'rgba(34, 139, 34, 0)');
    grassGrad.addColorStop(0.5, 'rgba(34, 139, 34, 0.08)');
    grassGrad.addColorStop(1, 'rgba(34, 139, 34, 0.15)');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, H() * 0.75, W(), H() * 0.25);

    drawHoles();
    drawHUD();
    drawParticles();

    if (screenShake > 0) {
        ctx.restore();
    }
}

// ===== 홈 버튼 판정 =====
function isHomeButton(x, y) {
    const homeSize = Math.min(36, W() * 0.06);
    return x >= 8 && x <= 8 + homeSize * 1.5 && y >= 8 && y <= 8 + homeSize * 1.5;
}

// ===== 입력 처리 =====
document.addEventListener('keydown', (e) => {
    if (['Enter', ' ', 'Escape'].includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === 'Escape') {
        window.location.href = '../../index.html';
        return;
    }

    if (gameState === STATE.READY) {
        if (e.key === 'Enter' || e.key === ' ') {
            startStage();
        }
    } else if (gameState === STATE.STAGE_CLEAR) {
        if (e.key === 'Enter' || e.key === ' ') {
            if (currentStage >= STAGES.length) {
                currentStage = 1;
            } else {
                currentStage++;
            }
            startStage();
        }
    } else if (gameState === STATE.GAME_OVER) {
        if (e.key === 'Enter' || e.key === ' ') {
            currentStage = 1;
            startStage();
        }
    }
});

// 클릭/터치
function handleClick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // 홈 버튼
    if (isHomeButton(x, y)) {
        window.location.href = '../../index.html';
        return;
    }

    if (gameState === STATE.READY) {
        startStage();
        return;
    }

    if (gameState === STATE.STAGE_CLEAR) {
        if (currentStage >= STAGES.length) {
            currentStage = 1;
        } else {
            currentStage++;
        }
        startStage();
        return;
    }

    if (gameState === STATE.GAME_OVER) {
        currentStage = 1;
        startStage();
        return;
    }

    if (gameState === STATE.PLAYING) {
        // 두더지 히트 판정
        let hit = false;
        for (let i = 0; i < holes.length; i++) {
            const hole = holes[i];
            if (!hole.mole || hole.mole.hit) continue;

            const moleY = hole.y + (hole.size / 2) * 0.3 - (hole.mole.showProgress * (hole.size / 2) * 1.2);
            const hitRadius = hole.size * 0.45;
            const dx = x - hole.x;
            const dy = y - moleY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < hitRadius) {
                hit = whackMole(i);
                if (hit) break;
            }
        }

        // 빈 곳 클릭 시 미스 이펙트
        if (!hit) {
            spawnEmoji(x, y, '💨', 1);
        }
    }
}

// touch/click 이중 발화 방지
let lastTouchTime = 0;

canvas.addEventListener('click', (e) => {
    // 최근 touchstart가 있었으면 click 무시 (이중 발화 방지)
    if (Date.now() - lastTouchTime < 500) return;
    handleClick(e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    lastTouchTime = Date.now();
    const touch = e.touches[0];
    handleClick(touch.clientX, touch.clientY);
}, { passive: false });

// ===== 메인 루프 =====
let lastTime = Date.now();

function gameLoop() {
    const now = Date.now();
    const dt = now - lastTime;
    lastTime = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === STATE.READY) {
        drawReadyScreen();
    } else if (gameState === STATE.PLAYING) {
        // 두더지 스폰
        const config = getStageConfig();
        lastSpawnTime += dt;
        if (lastSpawnTime >= config.spawnInterval) {
            spawnMole();
            lastSpawnTime = 0;
        }

        // 두더지 업데이트
        updateMoles(dt);

        // 자동 스테이지 클리어 체크 (게임 중인 경우에만)
        if (gameState === STATE.PLAYING && score >= config.targetScore && timeLeft > 0) {
            checkStageEnd();
        }

        drawPlayScreen();
    } else if (gameState === STATE.STAGE_CLEAR) {
        drawStageClearScreen();
    } else if (gameState === STATE.GAME_OVER) {
        drawGameOverScreen();
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
