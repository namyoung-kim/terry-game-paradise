// ===== 카드 뒤집기 메모리 게임 =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===== 상수 =====
const STAGES = [
    { rows: 2, cols: 3, theme: '동물', emojis: ['🐶', '🐱', '🐼', '🐸', '🐵', '🦁', '🐰', '🐻', '🐯', '🦊', '🐷', '🐮'] },
    { rows: 3, cols: 4, theme: '음식', emojis: ['🍎', '🍕', '🍔', '🍩', '🍦', '🎂', '🍓', '🍌', '🍪', '🧁', '🌮', '🍉'] },
    { rows: 4, cols: 4, theme: '자연', emojis: ['🌸', '🌻', '🌈', '🌙', '⭐', '🍀', '🌊', '🔥', '❄️', '🍂', '🌺', '🍇', '🌴', '🍄', '🦋', '💎'] },
    { rows: 4, cols: 5, theme: '탈것', emojis: ['🚗', '🚀', '🚁', '✈️', '🚂', '🚢', '🏎️', '🚲', '🛸', '🚌', '🏍️', '🛵', '🚒', '🚑', '🛻', '🚜', '🛶', '🚤', '🛴', '⛵'] },
    { rows: 5, cols: 6, theme: '스포츠', emojis: ['⚽', '🏀', '🎾', '⚾', '🏐', '🎳', '🏓', '🏸', '🥊', '🏹', '🎯', '⛳', '🥅', '🏋️', '🤸', '🎿', '🏄', '🚴', '🤾', '⛸️', '🥇', '🏆', '🎖️', '🎪', '🥋', '🤺', '🏊', '⛷️', '🧗', '🤽'] }
];

const CARD_COLORS = {
    back: '#2D1B69',
    backBorder: '#7C3AED',
    matchGlow: '#34D399',
    failShake: '#EF4444'
};

// ===== 상태 =====
let gameState = 'TITLE'; // TITLE, READY, PLAYING, CHECKING, STAGE_CLEAR, GAME_OVER
let currentStage = 0;
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let totalPairs = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let timer = 0;
let timerStart = 0;
let stageTimeLimit = 0;
let stars = [];
let particles = [];
let titleBounce = 0;
let readyCountdown = 0;
let readyStart = 0;
let checkTimeout = null;
let stageScoreBreakdown = null;

// 카드 미리보기 상태
let previewActive = false;
let previewStart = 0;
const PREVIEW_DURATION = 2000; // 2초간 미리보기

// ===== Canvas 설정 =====
function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const W = () => window.innerWidth;
const H = () => window.innerHeight;

// ===== 별 배경 =====
function initStars() {
    stars = [];
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * W(),
            y: Math.random() * H(),
            size: Math.random() * 2 + 0.3,
            speed: Math.random() * 0.2 + 0.05,
            brightness: Math.random() * 0.6 + 0.3,
            twinkleSpeed: Math.random() * 0.03 + 0.01,
            twinkleOffset: Math.random() * Math.PI * 2
        });
    }
}
initStars();

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H());
    gradient.addColorStop(0, '#0B0022');
    gradient.addColorStop(0.5, '#1A0A3E');
    gradient.addColorStop(1, '#0D0D2B');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W(), H());

    const time = Date.now() * 0.001;
    for (const star of stars) {
        star.y += star.speed;
        if (star.y > H()) { star.y = 0; star.x = Math.random() * W(); }
        const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.twinkleOffset) * 0.3 + 0.7;
        ctx.globalAlpha = star.brightness * twinkle;
        ctx.fillStyle = '#E8DAEF';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ===== 파티클 =====
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            decay: Math.random() * 0.015 + 0.008,
            size: Math.random() * 6 + 2,
            color
        });
    }
}

function spawnEmojiParticles(x, y, emoji, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 4 - 2,
            life: 1,
            decay: Math.random() * 0.01 + 0.005,
            size: Math.random() * 16 + 12,
            emoji,
            isEmoji: true
        });
    }
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        ctx.globalAlpha = Math.max(0, p.life);
        if (p.isEmoji) {
            ctx.font = `${p.size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.emoji, p.x, p.y);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0, p.size * p.life), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

// ===== 유틸 =====
function roundRect(ctx, x, y, w, h, r) {
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

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function formatTime(ms) {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ===== 카드 생성 =====
function createCards(stageIndex) {
    const stage = STAGES[stageIndex];
    const pairCount = (stage.rows * stage.cols) / 2;
    totalPairs = pairCount;
    matchedPairs = 0;

    // 이모지 셔플 후 필요한 만큼 선택
    const selectedEmojis = shuffle(stage.emojis).slice(0, pairCount);
    const cardEmojis = shuffle([...selectedEmojis, ...selectedEmojis]);

    cards = cardEmojis.map((emoji, i) => ({
        emoji,
        row: Math.floor(i / stage.cols),
        col: i % stage.cols,
        flipped: false,
        matched: false,
        flipProgress: 0,    // 0 = 뒷면, 1 = 앞면
        flipDirection: 0,   // 1 = 뒤집는 중, -1 = 다시 뒤집는 중
        shakeTime: 0,
        matchTime: 0,
        scaleEffect: 1
    }));
}

// ===== 카드 레이아웃 계산 =====
function getCardLayout() {
    const stage = STAGES[currentStage];
    const { rows, cols } = stage;

    const hudHeight = 60;
    const padding = 16;
    const gap = Math.min(10, W() * 0.015);

    const availW = W() - padding * 2;
    const availH = H() - hudHeight - padding * 2 - 20;

    const cardW = Math.min(100, (availW - gap * (cols - 1)) / cols);
    const cardH = Math.min(120, (availH - gap * (rows - 1)) / rows);
    const finalSize = Math.min(cardW, cardH);

    const totalW = cols * finalSize + (cols - 1) * gap;
    const totalH = rows * finalSize + (rows - 1) * gap;
    const startX = (W() - totalW) / 2;
    const startY = hudHeight + (H() - hudHeight - totalH) / 2;

    return { startX, startY, cardSize: finalSize, gap, rows, cols };
}

// ===== 타이틀 화면 =====
function drawTitle() {
    drawBackground();
    const time = Date.now() * 0.001;

    // 데모 카드 애니메이션
    const demoEmojis = ['🃏', '🎴', '🃏', '🎴', '🃏', '🎴'];
    const demoSize = Math.min(70, W() * 0.12);
    const demoGap = Math.min(15, W() * 0.025);
    const totalDemoW = demoEmojis.length * (demoSize + demoGap) - demoGap;
    const demoStartX = (W() - totalDemoW) / 2;
    const demoY = H() * 0.22;

    for (let i = 0; i < demoEmojis.length; i++) {
        const x = demoStartX + i * (demoSize + demoGap);
        const flipPhase = (Math.sin(time * 2 + i * 0.8) + 1) / 2;
        const scaleX = Math.abs(Math.cos(time * 2 + i * 0.8));

        ctx.save();
        ctx.translate(x + demoSize / 2, demoY + demoSize / 2);
        ctx.scale(scaleX, 1);

        // 카드 뒷면 or 앞면
        if (scaleX < 0.1) {
            // 전환 순간
        } else if (Math.cos(time * 2 + i * 0.8) > 0) {
            // 뒷면
            const grad = ctx.createLinearGradient(-demoSize / 2, -demoSize / 2, demoSize / 2, demoSize / 2);
            grad.addColorStop(0, '#4C1D95');
            grad.addColorStop(1, '#7C3AED');
            ctx.fillStyle = grad;
            roundRect(ctx, -demoSize / 2, -demoSize / 2, demoSize, demoSize, 8);
            ctx.fill();
            ctx.strokeStyle = '#A78BFA';
            ctx.lineWidth = 2;
            roundRect(ctx, -demoSize / 2, -demoSize / 2, demoSize, demoSize, 8);
            ctx.stroke();
            ctx.font = `${demoSize * 0.4}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', 0, 0);
        } else {
            // 앞면
            ctx.fillStyle = '#1E1B4B';
            roundRect(ctx, -demoSize / 2, -demoSize / 2, demoSize, demoSize, 8);
            ctx.fill();
            ctx.strokeStyle = '#E879F9';
            ctx.lineWidth = 2;
            roundRect(ctx, -demoSize / 2, -demoSize / 2, demoSize, demoSize, 8);
            ctx.stroke();
            const stageEmojis = STAGES[i % STAGES.length].emojis;
            ctx.font = `${demoSize * 0.5}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(stageEmojis[i], 0, 2);
        }
        ctx.restore();
    }

    // 타이틀
    const titleSize = Math.min(40, W() * 0.06);
    ctx.save();
    ctx.shadowColor = '#E879F9';
    ctx.shadowBlur = 25 + Math.sin(time * 2) * 10;
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleGrad = ctx.createLinearGradient(0, H() * 0.48, 0, H() * 0.48 + titleSize * 2);
    titleGrad.addColorStop(0, '#E879F9');
    titleGrad.addColorStop(0.5, '#F0ABFC');
    titleGrad.addColorStop(1, '#FDE047');
    ctx.fillStyle = titleGrad;

    const bounce = Math.sin(time * 1.5) * 4;
    ctx.fillText('카드', W() / 2, H() * 0.48 + bounce);
    ctx.fillText('뒤집기', W() / 2, H() * 0.48 + titleSize * 1.3 + bounce);
    ctx.restore();

    // 설명
    const descSize = Math.min(12, W() * 0.018);
    ctx.font = `${descSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = 'rgba(248, 200, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('같은 그림의 짝을 찾아라!', W() / 2, H() * 0.68);

    // 시작 안내
    const startAlpha = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.font = `${Math.min(13, W() * 0.018)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = `rgba(255, 255, 255, ${startAlpha})`;
    ctx.fillText('ENTER 또는 터치하여 시작', W() / 2, H() * 0.78);

    // 홈 버튼
    drawHomeButton();

    updateAndDrawParticles();
}

// ===== 홈 버튼 =====
function getHomeButtonRect() {
    const size = Math.min(36, W() * 0.06);
    return { x: 12, y: 12, w: size, h: size };
}

function drawHomeButton() {
    const { x, y, w, h } = getHomeButtonRect();
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();
    ctx.font = `${w * 0.55}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏠', x + w / 2, y + h / 2);
    ctx.restore();
}

// ===== 미리보기 화면 =====
function drawPreview() {
    drawBackground();
    drawHUD();

    const elapsed = Date.now() - previewStart;
    const remaining = Math.max(0, PREVIEW_DURATION - elapsed);

    const layout = getCardLayout();

    // 모든 카드를 앞면으로 그리기
    for (const card of cards) {
        if (card.matched) continue;
        const cx = layout.startX + card.col * (layout.cardSize + layout.gap);
        const cy = layout.startY + card.row * (layout.cardSize + layout.gap);
        drawCardFace(cx, cy, layout.cardSize, card.emoji, 1);
    }

    // 미리보기 카운트다운 표시
    const countdownSec = Math.ceil(remaining / 1000);
    const overlayAlpha = 0.5;
    ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha * 0.3})`;
    ctx.fillRect(0, 0, W(), H());

    const countSize = Math.min(60, W() * 0.1);
    ctx.font = `bold ${countSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FDE047';
    ctx.shadowColor = '#FDE047';
    ctx.shadowBlur = 20;
    ctx.fillText(`👀 ${countdownSec}`, W() / 2, H() * 0.92);
    ctx.shadowBlur = 0;

    const hintSize = Math.min(11, W() * 0.016);
    ctx.font = `${hintSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('카드를 기억하세요!', W() / 2, H() * 0.97);

    if (remaining <= 0) {
        previewActive = false;
        gameState = 'PLAYING';
        timerStart = Date.now();
    }

    drawHomeButton();
    updateAndDrawParticles();
}

// ===== 게임 화면 =====
function drawGame() {
    drawBackground();
    drawHUD();

    const layout = getCardLayout();
    const time = Date.now() * 0.001;

    for (const card of cards) {
        const cx = layout.startX + card.col * (layout.cardSize + layout.gap);
        const cy = layout.startY + card.row * (layout.cardSize + layout.gap);

        // 매칭된 카드
        if (card.matched) {
            const matchElapsed = (Date.now() - card.matchTime) / 1000;
            if (matchElapsed < 0.5) {
                // 매칭 애니메이션
                const scale = 1 + Math.sin(matchElapsed * Math.PI) * 0.15;
                const alpha = 1 - matchElapsed * 0.5;
                ctx.globalAlpha = Math.max(0.3, alpha);
                drawCardFace(cx, cy, layout.cardSize, card.emoji, scale);
                ctx.globalAlpha = 1;
            } else {
                // 매칭 완료 - 반투명
                ctx.globalAlpha = 0.2;
                drawCardFace(cx, cy, layout.cardSize, card.emoji, 1);
                ctx.globalAlpha = 1;
            }
            continue;
        }

        // 애니메이션 업데이트
        if (card.flipDirection !== 0) {
            card.flipProgress += card.flipDirection * 0.08;
            if (card.flipProgress >= 1) {
                card.flipProgress = 1;
                card.flipDirection = 0;
                card.flipped = true;
            } else if (card.flipProgress <= 0) {
                card.flipProgress = 0;
                card.flipDirection = 0;
                card.flipped = false;
            }
        }

        // 흔들림 효과
        let shakeX = 0;
        if (card.shakeTime > 0) {
            const elapsed = (Date.now() - card.shakeTime);
            if (elapsed < 400) {
                shakeX = Math.sin(elapsed * 0.05) * 5 * (1 - elapsed / 400);
            } else {
                card.shakeTime = 0;
            }
        }

        // 카드 그리기
        const scaleX = Math.abs(1 - card.flipProgress * 2); // 1→0→1
        const showFront = card.flipProgress > 0.5;

        ctx.save();
        ctx.translate(cx + layout.cardSize / 2 + shakeX, cy + layout.cardSize / 2);
        ctx.scale(Math.max(0.02, scaleX) * card.scaleEffect, card.scaleEffect);
        ctx.translate(-layout.cardSize / 2, -layout.cardSize / 2);

        if (showFront) {
            drawCardFaceRaw(0, 0, layout.cardSize, card.emoji);
        } else {
            drawCardBackRaw(0, 0, layout.cardSize);
        }

        ctx.restore();
    }

    // 타이머 업데이트
    if (gameState === 'PLAYING') {
        timer = Date.now() - timerStart;
    }

    drawHomeButton();
    updateAndDrawParticles();
}

// ===== 카드 그리기 =====
function drawCardBackRaw(x, y, size) {
    const grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, '#4C1D95');
    grad.addColorStop(1, '#7C3AED');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, size, size, Math.min(12, size * 0.12));
    ctx.fill();

    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, size, size, Math.min(12, size * 0.12));
    ctx.stroke();

    // 물음표 패턴
    ctx.fillStyle = 'rgba(167, 139, 250, 0.3)';
    ctx.font = `bold ${size * 0.4}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + size / 2, y + size / 2);

    // 장식 다이아몬드
    const dSize = size * 0.08;
    ctx.fillStyle = 'rgba(167, 139, 250, 0.2)';
    const corners = [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];
    for (const [px, py] of corners) {
        ctx.save();
        ctx.translate(x + size * px, y + size * py);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-dSize / 2, -dSize / 2, dSize, dSize);
        ctx.restore();
    }
}

function drawCardFaceRaw(x, y, size, emoji) {
    // 앞면 배경
    ctx.fillStyle = '#1E1B4B';
    roundRect(ctx, x, y, size, size, Math.min(12, size * 0.12));
    ctx.fill();

    ctx.strokeStyle = '#E879F9';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, size, size, Math.min(12, size * 0.12));
    ctx.stroke();

    // 이모지
    ctx.font = `${size * 0.5}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x + size / 2, y + size / 2 + 2);
}

function drawCardFace(x, y, size, emoji, scale) {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    ctx.scale(scale, scale);
    ctx.translate(-size / 2, -size / 2);
    drawCardFaceRaw(0, 0, size, emoji);
    ctx.restore();
}

// ===== HUD =====
function drawHUD() {
    const hudH = 50;

    // HUD 배경
    ctx.fillStyle = 'rgba(10, 0, 40, 0.7)';
    ctx.fillRect(0, 0, W(), hudH);
    ctx.strokeStyle = 'rgba(232, 121, 249, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hudH);
    ctx.lineTo(W(), hudH);
    ctx.stroke();

    const fontSize = Math.min(11, W() * 0.016);
    ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
    ctx.textBaseline = 'middle';

    // 스테이지
    ctx.textAlign = 'left';
    ctx.fillStyle = '#E879F9';
    ctx.fillText(`Stage ${currentStage + 1}`, 60, hudH / 2);

    // 테마
    const theme = STAGES[currentStage].theme;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const themeX = 60 + (fontSize * 8);
    ctx.fillText(theme, themeX, hudH / 2);

    // 점수 (중앙)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FDE047';
    ctx.fillText(`${score}점`, W() / 2, hudH / 2);

    // 콤보
    if (combo >= 2) {
        const comboSize = Math.min(10, W() * 0.013);
        ctx.font = `${comboSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = '#34D399';
        ctx.fillText(`×${combo} COMBO`, W() / 2, hudH / 2 + fontSize + 2);
    }

    // 시간
    ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'right';
    const elapsed = gameState === 'PLAYING' ? Date.now() - timerStart : timer;
    const remaining = Math.max(0, stageTimeLimit - elapsed);
    const timeColor = remaining < 10000 ? '#EF4444' : '#fff';
    ctx.fillStyle = timeColor;
    ctx.fillText(formatTime(remaining), W() - 16, hudH / 2);

    // 짝 카운트
    const pairSize = Math.min(9, W() * 0.012);
    ctx.font = `${pairSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`${matchedPairs}/${totalPairs}`, W() - 16, hudH / 2 + fontSize + 2);

    // 시간 초과 체크
    if (gameState === 'PLAYING' && remaining <= 0) {
        gameState = 'GAME_OVER';
    }
}

// ===== 스테이지 초기화 =====
function startStage(stageIndex) {
    currentStage = stageIndex;
    createCards(stageIndex);
    flippedCards = [];
    combo = 0;

    // 스테이지별 시간 제한
    const timeLimits = [60000, 90000, 120000, 150000, 200000];
    stageTimeLimit = timeLimits[stageIndex] || 120000;

    // 미리보기 모드 시작
    previewActive = true;
    previewStart = Date.now();
    gameState = 'READY';
}

// ===== 카드 클릭 처리 =====
function handleCardClick(mx, my) {
    if (gameState !== 'PLAYING') return;
    if (flippedCards.length >= 2) return;

    const layout = getCardLayout();

    for (const card of cards) {
        if (card.matched || card.flipped) continue;

        const cx = layout.startX + card.col * (layout.cardSize + layout.gap);
        const cy = layout.startY + card.row * (layout.cardSize + layout.gap);

        if (mx >= cx && mx <= cx + layout.cardSize && my >= cy && my <= cy + layout.cardSize) {
            // 카드 뒤집기
            card.flipDirection = 1;
            flippedCards.push(card);
            spawnParticles(cx + layout.cardSize / 2, cy + layout.cardSize / 2, '#E879F9', 5);

            if (flippedCards.length === 2) {
                gameState = 'CHECKING';
                setTimeout(() => checkMatch(), 800);
            }
            break;
        }
    }
}

// ===== 짝 확인 =====
function checkMatch() {
    const [c1, c2] = flippedCards;

    if (c1.emoji === c2.emoji) {
        // 짝 맞음!
        c1.matched = true;
        c2.matched = true;
        c1.matchTime = Date.now();
        c2.matchTime = Date.now();
        matchedPairs++;
        combo++;
        if (combo > maxCombo) maxCombo = combo;

        // 점수
        const comboMultiplier = Math.min(combo, 5);
        const points = 100 * comboMultiplier;
        score += points;

        // 이펙트
        const layout = getCardLayout();
        const cx1 = layout.startX + c1.col * (layout.cardSize + layout.gap) + layout.cardSize / 2;
        const cy1 = layout.startY + c1.row * (layout.cardSize + layout.gap) + layout.cardSize / 2;
        const cx2 = layout.startX + c2.col * (layout.cardSize + layout.gap) + layout.cardSize / 2;
        const cy2 = layout.startY + c2.row * (layout.cardSize + layout.gap) + layout.cardSize / 2;
        spawnParticles(cx1, cy1, '#34D399', 15);
        spawnParticles(cx2, cy2, '#34D399', 15);
        spawnEmojiParticles((cx1 + cx2) / 2, (cy1 + cy2) / 2, c1.emoji, 3);

        // 스테이지 클리어 체크
        if (matchedPairs >= totalPairs) {
            timer = Date.now() - timerStart;
            setTimeout(() => {
                gameState = 'STAGE_CLEAR';
                calculateStageScore();
            }, 600);
        }
    } else {
        // 짝이 아님
        combo = 0;
        const layout = getCardLayout();
        c1.shakeTime = Date.now();
        c2.shakeTime = Date.now();

        // 다시 뒤집기
        c1.flipDirection = -1;
        c2.flipDirection = -1;
    }

    flippedCards = [];
    if (gameState === 'CHECKING') gameState = 'PLAYING';
}

// ===== 스테이지 점수 계산 =====
function calculateStageScore() {
    const remaining = Math.max(0, stageTimeLimit - timer);
    const timeBonus = Math.floor(remaining / 1000) * 10;
    score += timeBonus;

    stageScoreBreakdown = {
        pairs: matchedPairs * 100,
        comboBonus: score - timeBonus - matchedPairs * 100,
        timeBonus,
        maxCombo
    };
}

// ===== 스테이지 클리어 버튼 Y좌표 계산 =====
function getStageClearButtonY() {
    const centerY = H() * 0.15;
    const titleSize = Math.min(36, W() * 0.05);
    const lineH = Math.min(32, H() * 0.05);
    const startY = centerY + titleSize + 20;
    const totalY = startY + 4 * lineH + lineH; // 4 items + 1 spacing
    return totalY + lineH * 2;
}

// ===== 스테이지 클리어 화면 =====
function drawStageClear() {
    drawBackground();
    const time = Date.now() * 0.001;

    // 축하 배경 효과
    if (Math.random() < 0.1) {
        spawnParticles(
            Math.random() * W(),
            Math.random() * H() * 0.3,
            ['#E879F9', '#FDE047', '#34D399', '#60A5FA'][Math.floor(Math.random() * 4)],
            3
        );
    }

    const centerY = H() * 0.15;
    const titleSize = Math.min(36, W() * 0.05);

    // 클리어!
    ctx.save();
    ctx.shadowColor = '#FDE047';
    ctx.shadowBlur = 20;
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FDE047';
    const bounce = Math.sin(time * 2) * 5;
    ctx.fillText('🎉 CLEAR! 🎉', W() / 2, centerY + bounce);
    ctx.restore();

    // 스코어 상세
    if (stageScoreBreakdown) {
        const lineH = Math.min(32, H() * 0.05);
        const startY = centerY + titleSize + 20;
        const labelSize = Math.min(12, W() * 0.017);
        const valueSize = Math.min(14, W() * 0.02);

        const items = [
            { label: '짝 맞추기', value: `${stageScoreBreakdown.pairs}점`, color: '#E879F9' },
            { label: '콤보 보너스', value: `${stageScoreBreakdown.comboBonus}점`, color: '#34D399' },
            { label: '시간 보너스', value: `${stageScoreBreakdown.timeBonus}점`, color: '#60A5FA' },
            { label: '최대 콤보', value: `×${stageScoreBreakdown.maxCombo}`, color: '#FDE047' }
        ];

        for (let i = 0; i < items.length; i++) {
            const y = startY + i * lineH;
            ctx.font = `${labelSize}px 'Press Start 2P', monospace`;
            ctx.textAlign = 'right';
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText(items[i].label, W() / 2 - 20, y);

            ctx.font = `bold ${valueSize}px 'Press Start 2P', monospace`;
            ctx.textAlign = 'left';
            ctx.fillStyle = items[i].color;
            ctx.fillText(items[i].value, W() / 2 + 20, y);
        }

        // 총점
        const totalY = startY + items.length * lineH + lineH;
        ctx.font = `bold ${Math.min(18, W() * 0.025)}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FDE047';
        ctx.fillText(`총 ${score}점`, W() / 2, totalY);

        // 다음 스테이지 or 최종 결과
        const btnY = getStageClearButtonY();
        const isLast = currentStage >= STAGES.length - 1;

        drawButton(
            W() / 2, btnY,
            isLast ? '🏆 최종 결과' : '▶ 다음 스테이지',
            '#E879F9', time
        );
    }

    drawHomeButton();
    updateAndDrawParticles();
}

// ===== 최종 결과 화면 =====
function drawGameOver() {
    drawBackground();
    const time = Date.now() * 0.001;

    const titleSize = Math.min(30, W() * 0.04);
    ctx.save();
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 20;
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#EF4444';
    ctx.fillText('⏰ TIME OVER', W() / 2, H() * 0.2);
    ctx.restore();

    const infoSize = Math.min(14, W() * 0.02);
    ctx.font = `${infoSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`Stage ${currentStage + 1}에서 실패`, W() / 2, H() * 0.35);
    ctx.fillStyle = '#FDE047';
    ctx.fillText(`최종 점수: ${score}점`, W() / 2, H() * 0.45);

    // 등급
    const grade = getGrade();
    const gradeSize = Math.min(50, W() * 0.08);
    ctx.font = `${gradeSize}px serif`;
    ctx.fillText(grade, W() / 2, H() * 0.58);

    drawButton(W() / 2, H() * 0.72, '🔄 다시 도전', '#E879F9', time);
    drawButton(W() / 2, H() * 0.82, '🏠 홈으로', '#7C3AED', time);

    updateAndDrawParticles();
}

// ===== 최종 결과 (클리어) =====
function drawFinalResult() {
    drawBackground();
    const time = Date.now() * 0.001;

    // 축하 파티클
    if (Math.random() < 0.15) {
        spawnEmojiParticles(
            Math.random() * W(),
            -20,
            ['🎉', '🎊', '⭐', '🏆', '✨'][Math.floor(Math.random() * 5)],
            1
        );
    }

    const titleSize = Math.min(30, W() * 0.04);
    ctx.save();
    ctx.shadowColor = '#FDE047';
    ctx.shadowBlur = 25;
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    const bounce = Math.sin(time * 1.5) * 4;
    ctx.fillStyle = '#FDE047';
    ctx.fillText('🏆 ALL CLEAR! 🏆', W() / 2, H() * 0.15 + bounce);
    ctx.restore();

    // 총점 + 등급
    const scoreSize = Math.min(20, W() * 0.03);
    ctx.font = `bold ${scoreSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FDE047';
    ctx.textAlign = 'center';
    ctx.fillText(`총 ${score}점`, W() / 2, H() * 0.3);

    const grade = getGrade();
    const gradeSize = Math.min(60, W() * 0.1);
    ctx.font = `${gradeSize}px serif`;
    ctx.fillText(grade, W() / 2, H() * 0.45);

    const gradeLabel = getGradeLabel();
    const labelSize = Math.min(14, W() * 0.02);
    ctx.font = `${labelSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#E879F9';
    ctx.fillText(gradeLabel, W() / 2, H() * 0.55);

    drawButton(W() / 2, H() * 0.7, '🔄 다시 도전', '#E879F9', time);
    drawButton(W() / 2, H() * 0.8, '🏠 홈으로', '#7C3AED', time);

    updateAndDrawParticles();
}

// ===== 등급 =====
function getGrade() {
    if (score >= 5000) return '⭐⭐⭐';
    if (score >= 3000) return '⭐⭐';
    return '⭐';
}

function getGradeLabel() {
    if (score >= 5000) return '기억력 천재!';
    if (score >= 3000) return '대단해요!';
    return '좋은 시작!';
}

// ===== 버튼 =====
function drawButton(cx, cy, text, color, time) {
    const btnW = Math.min(280, W() * 0.6);
    const btnH = Math.min(48, H() * 0.06);
    const x = cx - btnW / 2;
    const y = cy - btnH / 2;
    const pulse = Math.sin(time * 3) * 0.05 + 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = `${color}33`;
    roundRect(ctx, x, y, btnW, btnH, 12);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, btnW, btnH, 12);
    ctx.stroke();

    const fontSize = Math.min(12, W() * 0.017);
    ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(text, cx, cy);

    ctx.restore();

    return { x, y, w: btnW, h: btnH };
}

// 버튼 히트 테스트
function isInButton(mx, my, cx, cy) {
    const btnW = Math.min(280, W() * 0.6);
    const btnH = Math.min(48, H() * 0.06);
    const x = cx - btnW / 2;
    const y = cy - btnH / 2;
    return mx >= x && mx <= x + btnW && my >= y && my <= y + btnH;
}

// ===== 입력 처리 =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (gameState === 'TITLE') {
            score = 0;
            combo = 0;
            maxCombo = 0;
            startStage(0);
        }
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        window.location.href = '../../index.html';
    }
});

// 스크롤 방지
window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
    }
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 홈 버튼 체크
    const hb = getHomeButtonRect();
    if (mx >= hb.x && mx <= hb.x + hb.w && my >= hb.y && my <= hb.y + hb.h) {
        window.location.href = '../../index.html';
        return;
    }

    if (gameState === 'TITLE') {
        score = 0;
        combo = 0;
        maxCombo = 0;
        startStage(0);
        return;
    }

    if (gameState === 'PLAYING' || gameState === 'CHECKING') {
        handleCardClick(mx, my);
        return;
    }

    if (gameState === 'STAGE_CLEAR') {
        const isLast = currentStage >= STAGES.length - 1;
        const btnY = getStageClearButtonY();

        if (isInButton(mx, my, W() / 2, btnY)) {
            if (isLast) {
                gameState = 'FINAL';
            } else {
                startStage(currentStage + 1);
            }
            return;
        }
    }

    if (gameState === 'GAME_OVER') {
        if (isInButton(mx, my, W() / 2, H() * 0.72)) {
            score = 0;
            combo = 0;
            maxCombo = 0;
            startStage(0);
            return;
        }
        if (isInButton(mx, my, W() / 2, H() * 0.82)) {
            window.location.href = '../../index.html';
            return;
        }
    }

    if (gameState === 'FINAL') {
        if (isInButton(mx, my, W() / 2, H() * 0.7)) {
            score = 0;
            combo = 0;
            maxCombo = 0;
            startStage(0);
            return;
        }
        if (isInButton(mx, my, W() / 2, H() * 0.8)) {
            window.location.href = '../../index.html';
            return;
        }
    }
});

// ===== 메인 루프 =====
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (gameState) {
        case 'TITLE':
            drawTitle();
            break;
        case 'READY':
            if (previewActive) {
                drawPreview();
            }
            break;
        case 'PLAYING':
        case 'CHECKING':
            drawGame();
            break;
        case 'STAGE_CLEAR':
            drawStageClear();
            break;
        case 'GAME_OVER':
            drawGameOver();
            break;
        case 'FINAL':
            drawFinalResult();
            break;
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
