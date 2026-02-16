// ===== 태리의 게임천국 - 메인 허브 =====
const canvas = document.getElementById('hubCanvas');
const ctx = canvas.getContext('2d');

// ===== 게임 목록 =====
const GAMES = [
    {
        id: 'infinite-stairs',
        name: '무한의 계단',
        emoji: '🏗️',
        description: '계단을 끝없이 올라가자!',
        path: 'games/infinite-stairs/index.html',
        color1: '#4169E1',
        color2: '#1a1a6e',
        accent: '#FFD700'
    },
    {
        id: 'ox-quiz',
        name: 'OX 퀴즈',
        emoji: '❓',
        description: 'O일까? X일까?',
        path: 'games/ox-quiz/index.html',
        color1: '#FF6347',
        color2: '#8B0000',
        accent: '#00FF7F'
    },
    {
        id: 'math-king',
        name: '암산왕',
        emoji: '🧮',
        description: '암산의 달인에 도전!',
        path: 'games/math-king/index.html',
        color1: '#A78BFA',
        color2: '#4C1D95',
        accent: '#FCD34D'
    }
];

// ===== 상태 =====
let hubState = 'TITLE'; // TITLE, SELECT
let selectedIndex = 0;
let titleAlpha = 0;
let titleFadeIn = true;
let stars = [];
let particles = [];
let enterPulse = 0;
let transitionAlpha = 0;
let transitioning = false;
let transitionTarget = '';

// ===== Canvas =====
function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const W = () => window.innerWidth;
const H = () => window.innerHeight;

// ===== 별 필드 =====
function initStars() {
    stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * W(),
            y: Math.random() * H(),
            size: Math.random() * 2.5 + 0.3,
            speed: Math.random() * 0.3 + 0.05,
            brightness: Math.random() * 0.7 + 0.3,
            twinkleSpeed: Math.random() * 0.03 + 0.01,
            twinkleOffset: Math.random() * Math.PI * 2
        });
    }
}
initStars();

// ===== 파티클 =====
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1,
            decay: Math.random() * 0.02 + 0.01,
            size: Math.random() * 5 + 2,
            color
        });
    }
}

// ===== 배경 =====
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H());
    gradient.addColorStop(0, '#050510');
    gradient.addColorStop(0.5, '#0a0a2e');
    gradient.addColorStop(1, '#0f0f3d');
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

// ===== 타이틀 화면 =====
function drawTitle() {
    drawBackground();

    const time = Date.now() * 0.001;

    // 타이틀 텍스트 크기 계산
    const titleSize = Math.min(48, W() * 0.06);
    const subtitleSize = Math.min(16, W() * 0.02);

    // 타이틀 글로우
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 30 + Math.sin(time * 2) * 10;

    // 메인 타이틀
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 그라데이션 텍스트
    const titleGrad = ctx.createLinearGradient(0, H() * 0.35, 0, H() * 0.35 + titleSize);
    titleGrad.addColorStop(0, '#FFD700');
    titleGrad.addColorStop(0.5, '#FFA500');
    titleGrad.addColorStop(1, '#FF6347');
    ctx.fillStyle = titleGrad;

    // 타이틀 바운스
    const bounce = Math.sin(time * 1.5) * 5;
    ctx.fillText('태리의', W() / 2, H() * 0.32 + bounce);
    ctx.fillText('게임천국', W() / 2, H() * 0.32 + titleSize * 1.3 + bounce);
    ctx.restore();

    // 이모지 장식
    const emojiSize = Math.min(30, W() * 0.04);
    ctx.font = `${emojiSize}px serif`;
    const emojis = ['🎮', '⭐', '🏆', '🎲', '🎯', '🎪'];
    for (let i = 0; i < emojis.length; i++) {
        const angle = time * 0.5 + (i / emojis.length) * Math.PI * 2;
        const radius = Math.min(200, W() * 0.25);
        const ex = W() / 2 + Math.cos(angle) * radius;
        const ey = H() * 0.35 + Math.sin(angle) * radius * 0.4;
        ctx.globalAlpha = 0.6 + Math.sin(time * 2 + i) * 0.3;
        ctx.fillText(emojis[i], ex - emojiSize / 2, ey);
    }
    ctx.globalAlpha = 1;

    // ENTER 안내
    enterPulse = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.font = `${subtitleSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = `rgba(255, 255, 255, ${enterPulse})`;
    ctx.textAlign = 'center';
    ctx.fillText('ENTER를 눌러 시작', W() / 2, H() * 0.75);

    // 하단 크레딧
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = `${Math.min(10, W() * 0.012)}px 'Press Start 2P', monospace`;
    ctx.fillText('© 2026 태리의 게임천국', W() / 2, H() * 0.95);
}

// ===== 게임 선택 화면 =====
function drawGameSelect() {
    drawBackground();

    const time = Date.now() * 0.001;
    const isPortrait = W() < H();

    // 상단 타이틀
    const headerSize = Math.min(24, W() * 0.04);
    ctx.font = `${headerSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 게임 선택 🎮', W() / 2, H() * 0.08);

    // 게임 카드 레이아웃 (세로/가로 모드 대응)
    let maxCols, cardW, cardH;
    if (isPortrait) {
        maxCols = 1;
        cardW = Math.min(280, W() * 0.75);
        cardH = cardW * 0.45;
    } else {
        maxCols = Math.min(5, GAMES.length);
        cardW = Math.min(220, (W() - 80) / maxCols - 20);
        cardH = cardW * 1.2;
    }
    const rows = Math.ceil(GAMES.length / maxCols);
    const gap = isPortrait ? 16 : 20;
    const totalW = Math.min(GAMES.length, maxCols) * (cardW + gap) - gap;
    const totalH = rows * (cardH + gap) - gap;
    const startX = (W() - totalW) / 2;
    const startY = (H() - totalH) / 2;

    for (let i = 0; i < GAMES.length; i++) {
        const game = GAMES[i];
        const col = i % maxCols;
        const row = Math.floor(i / maxCols);
        const cx = startX + col * (cardW + gap);
        const cy = startY + row * (cardH + gap);
        const isSelected = i === selectedIndex;

        // 선택 애니메이션
        const hoverOffset = isSelected ? Math.sin(time * 3) * 4 : 0;
        const scale = isSelected ? 1.05 : 1;
        const drawX = cx - (cardW * (scale - 1)) / 2;
        const drawY = cy - (cardH * (scale - 1)) / 2 + hoverOffset;
        const drawW = cardW * scale;
        const drawH = cardH * scale;

        ctx.save();

        // 카드 배경
        if (isSelected) {
            ctx.shadowColor = game.accent;
            ctx.shadowBlur = 25;
        }

        // 그라데이션 배경
        const cardGrad = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH);
        cardGrad.addColorStop(0, isSelected ? game.color1 : game.color2);
        cardGrad.addColorStop(1, game.color2);
        ctx.fillStyle = cardGrad;

        // 라운드 사각형
        roundRect(ctx, drawX, drawY, drawW, drawH, 12);
        ctx.fill();

        // 테두리
        ctx.strokeStyle = isSelected ? game.accent : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = isSelected ? 3 : 1;
        roundRect(ctx, drawX, drawY, drawW, drawH, 12);
        ctx.stroke();

        ctx.shadowBlur = 0;

        if (isPortrait) {
            // 세로모드: 이모지 왼쪽 + 텍스트 오른쪽 가로배치
            const emojiSize = Math.min(36, drawH * 0.5);
            ctx.font = `${emojiSize}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(game.emoji, drawX + drawH * 0.45, drawY + drawH / 2);

            const nameSize = Math.min(13, drawW * 0.06);
            ctx.font = `bold ${nameSize}px 'Press Start 2P', monospace`;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'left';
            ctx.fillText(game.name, drawX + drawH * 0.8, drawY + drawH * 0.4);

            const descSize = Math.min(9, drawW * 0.04);
            ctx.font = `${descSize}px 'Press Start 2P', monospace`;
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText(game.description, drawX + drawH * 0.8, drawY + drawH * 0.65);
        } else {
            // 가로모드: 기존 레이아웃
            const emojiSize = Math.min(50, drawW * 0.3);
            ctx.font = `${emojiSize}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(game.emoji, drawX + drawW / 2, drawY + drawH * 0.35);

            const nameSize = Math.min(14, drawW * 0.08);
            ctx.font = `bold ${nameSize}px 'Press Start 2P', monospace`;
            ctx.fillStyle = '#fff';
            ctx.fillText(game.name, drawX + drawW / 2, drawY + drawH * 0.65);

            const descSize = Math.min(10, drawW * 0.05);
            ctx.font = `${descSize}px 'Press Start 2P', monospace`;
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText(game.description, drawX + drawW / 2, drawY + drawH * 0.8);
        }

        ctx.restore();
    }

    // 하단 안내
    const instrSize = Math.min(11, W() * 0.014);
    ctx.font = `${instrSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(time * 2) * 0.2})`;
    ctx.textAlign = 'center';
    if (isPortrait) {
        ctx.fillText('↑↓ 선택    터치하여 실행', W() / 2, H() * 0.93);
    } else {
        ctx.fillText('← → 선택    ENTER 실행    ESC 뒤로', W() / 2, H() * 0.93);
    }

    // 파티클
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= p.decay;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.life <= 0) particles.splice(i, 1);
    }
    ctx.globalAlpha = 1;
}

// ===== 전환 효과 =====
function drawTransition() {
    if (!transitioning) return;
    transitionAlpha += 0.03;
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(transitionAlpha, 1)})`;
    ctx.fillRect(0, 0, W(), H());
    if (transitionAlpha >= 1.2) {
        window.location.href = transitionTarget;
    }
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

// ===== 카드 레이아웃 계산 (입력 핸들러와 공유) =====
function getCardLayout() {
    const isPortrait = W() < H();
    let maxCols, cardW, cardH;
    if (isPortrait) {
        maxCols = 1;
        cardW = Math.min(280, W() * 0.75);
        cardH = cardW * 0.45;
    } else {
        maxCols = Math.min(5, GAMES.length);
        cardW = Math.min(220, (W() - 80) / maxCols - 20);
        cardH = cardW * 1.2;
    }
    const gap = isPortrait ? 16 : 20;
    const totalW = Math.min(GAMES.length, maxCols) * (cardW + gap) - gap;
    const rows = Math.ceil(GAMES.length / maxCols);
    const totalH = rows * (cardH + gap) - gap;
    const startX = (W() - totalW) / 2;
    const startY = (H() - totalH) / 2;
    return { maxCols, cardW, cardH, gap, startX, startY, isPortrait };
}

// ===== 입력 처리 =====
document.addEventListener('keydown', (e) => {
    if (transitioning) return;

    if (hubState === 'TITLE') {
        if (e.key === 'Enter') {
            e.preventDefault();
            hubState = 'SELECT';
            spawnParticles(W() / 2, H() / 2, '#FFD700', 30);
        }
        return;
    }

    if (hubState === 'SELECT') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + GAMES.length) % GAMES.length;
            spawnParticles(W() / 2, H() / 2, GAMES[selectedIndex].accent, 8);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % GAMES.length;
            spawnParticles(W() / 2, H() / 2, GAMES[selectedIndex].accent, 8);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            transitioning = true;
            transitionAlpha = 0;
            transitionTarget = GAMES[selectedIndex].path;
            spawnParticles(W() / 2, H() / 2, '#fff', 40);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hubState = 'TITLE';
        }
    }
});

// 스크롤 방지
window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
    }
});

// ===== 마우스/터치 =====
canvas.addEventListener('click', (e) => {
    if (transitioning) return;

    if (hubState === 'TITLE') {
        hubState = 'SELECT';
        spawnParticles(W() / 2, H() / 2, '#FFD700', 30);
        return;
    }

    if (hubState === 'SELECT') {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const { maxCols, cardW, cardH, gap, startX, startY } = getCardLayout();

        for (let i = 0; i < GAMES.length; i++) {
            const col = i % maxCols;
            const row = Math.floor(i / maxCols);
            const cx = startX + col * (cardW + gap);
            const cy = startY + row * (cardH + gap);

            if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
                if (i === selectedIndex) {
                    transitioning = true;
                    transitionAlpha = 0;
                    transitionTarget = GAMES[i].path;
                    spawnParticles(mx, my, '#fff', 40);
                } else {
                    selectedIndex = i;
                    spawnParticles(mx, my, GAMES[i].accent, 8);
                }
                break;
            }
        }
    }
});

// ===== 메인 루프 =====
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (hubState === 'TITLE') {
        drawTitle();
    } else if (hubState === 'SELECT') {
        drawGameSelect();
    }

    drawTransition();
    requestAnimationFrame(gameLoop);
}

gameLoop();
