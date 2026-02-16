// ===== OX 퀴즈 게임 =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

// ===== 상수 =====
const MAX_WRONG = 5; // 5번 틀리면 게임 종료
const TIME_PER_QUESTION = 20000; // 20초
const SHOW_RESULT_DURATION = 3500; // 풀이 보여주는 시간

// ===== 게임 상태 =====
let state = 'READY'; // READY, PLAYING, SHOW_RESULT, GAME_OVER
let questions = [];
let currentQ = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let wrongCount = 0;
let answers = []; // { correct, userAnswer, question }
let timerStart = 0;
let resultStart = 0;
let lastAnswer = null; // true/false/null(timeout)
let lastCorrect = false;
let particles = [];
let shakeAmount = 0;
let stars = [];
let bestScore = parseInt(localStorage.getItem('oxQuizBest')) || 0;

// 선택 애니메이션
let selectedSide = null; // 'O' or 'X'
let selectTime = 0;

// ===== 별 필드 =====
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * W(), y: Math.random() * H(),
            size: Math.random() * 2 + 0.5,
            brightness: Math.random() * 0.5 + 0.2,
            twinkle: Math.random() * 0.02 + 0.005,
            offset: Math.random() * Math.PI * 2
        });
    }
}
initStars();

// ===== 유틸 =====
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

const CATEGORY_STYLE = {
    '국어': { emoji: '📚', color: '#FF6B6B' },
    '수학': { emoji: '🔢', color: '#4ECDC4' },
    '과학': { emoji: '🔬', color: '#45B7D1' },
    '사회': { emoji: '🌍', color: '#96CEB4' },
    '역사': { emoji: '🏛️', color: '#DDA0DD' },
    '안전': { emoji: '🛡️', color: '#FFD93D' },
    '넌센스': { emoji: '🤪', color: '#FF8C42' },
};

function getCategoryStyle(category) {
    return CATEGORY_STYLE[category] || { emoji: '❓', color: '#aaa' };
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: -(Math.random() * 6 + 2),
            life: 1, decay: Math.random() * 0.02 + 0.01,
            size: Math.random() * 6 + 2, color
        });
    }
}

function roundRect(cx, x, y, w, h, r) {
    cx.beginPath();
    cx.moveTo(x + r, y);
    cx.lineTo(x + w - r, y);
    cx.quadraticCurveTo(x + w, y, x + w, y + r);
    cx.lineTo(x + w, y + h - r);
    cx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    cx.lineTo(x + r, y + h);
    cx.quadraticCurveTo(x, y + h, x, y + h - r);
    cx.lineTo(x, y + r);
    cx.quadraticCurveTo(x, y, x + r, y);
    cx.closePath();
}

function wrapText(text, maxWidth, fontSize) {
    ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
    const words = text.split('');
    let lines = [];
    let line = '';
    for (const ch of words) {
        const test = line + ch;
        if (ctx.measureText(test).width > maxWidth && line.length > 0) {
            lines.push(line);
            line = ch;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines;
}

// ===== 게임 시작 =====
function startGame() {
    questions = shuffle([...QUESTIONS]);
    currentQ = 0;
    score = 0;
    combo = 0;
    maxCombo = 0;
    wrongCount = 0;
    answers = [];
    particles = [];
    shakeAmount = 0;
    selectedSide = null;
    state = 'PLAYING';
    timerStart = Date.now();
}

function submitAnswer(userAnswer) {
    if (state !== 'PLAYING') return;

    const q = questions[currentQ];
    const correct = (userAnswer === q.a);
    lastAnswer = userAnswer;
    lastCorrect = correct;
    selectedSide = userAnswer ? 'O' : 'X';
    selectTime = Date.now();

    answers.push({ correct, userAnswer, question: q });

    if (correct) {
        score += 10 + combo * 2;
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        spawnParticles(W() / 2, H() / 2, '#00FF7F', 25);
    } else {
        combo = 0;
        wrongCount++;
        shakeAmount = 10;
        spawnParticles(W() / 2, H() / 2, '#FF4757', 20);
    }

    state = 'SHOW_RESULT';
    resultStart = Date.now();
}

function nextQuestion() {
    currentQ++;
    selectedSide = null;
    if (wrongCount >= MAX_WRONG || currentQ >= questions.length) {
        state = 'GAME_OVER';
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('oxQuizBest', bestScore);
        }
    } else {
        state = 'PLAYING';
        timerStart = Date.now();
    }
}

// ===== 그리기 =====
function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H());
    grad.addColorStop(0, '#050515');
    grad.addColorStop(1, '#0f0f3d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W(), H());

    const t = Date.now() * 0.001;
    for (const s of stars) {
        const tw = Math.sin(t * s.twinkle * 60 + s.offset) * 0.3 + 0.7;
        ctx.globalAlpha = s.brightness * tw;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawReady() {
    drawBackground();
    const t = Date.now() * 0.001;

    // 타이틀
    const titleSize = Math.min(36, W() * 0.05);
    ctx.save();
    ctx.shadowColor = '#FF6347';
    ctx.shadowBlur = 20;
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FF6347';
    ctx.textAlign = 'center';
    ctx.fillText('OX 퀴즈', W() / 2, H() * 0.3);
    ctx.restore();

    // O/X 아이콘
    const iconSize = Math.min(80, W() * 0.1);
    ctx.font = `bold ${iconSize}px 'Press Start 2P', monospace`;
    const bounce = Math.sin(t * 2) * 8;
    ctx.fillStyle = '#4169E1';
    ctx.fillText('O', W() * 0.35, H() * 0.5 + bounce);
    ctx.fillStyle = '#FF4757';
    ctx.fillText('X', W() * 0.65, H() * 0.5 - bounce);

    // 설명
    const descSize = Math.min(12, W() * 0.015);
    ctx.font = `${descSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('← 또는 O키 = ⭕', W() / 2, H() * 0.65);
    ctx.fillText('→ 또는 X키 = ❌', W() / 2, H() * 0.7);
    ctx.fillText(`${MAX_WRONG}번 틀리면 종료!  |  문제당 ${TIME_PER_QUESTION / 1000}초`, W() / 2, H() * 0.76);

    // 모바일 안내
    if (W() < H()) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('화면을 터치하여 조작!', W() / 2, H() * 0.82);
    }

    // ENTER
    const pulse = Math.sin(t * 3) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.fillText('ENTER를 눌러 시작!', W() / 2, H() * 0.88);

    // ESC 안내
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `${Math.min(9, W() * 0.01)}px 'Press Start 2P', monospace`;
    ctx.fillText('ESC: 게임 목록으로', W() / 2, H() * 0.95);
}

function drawPlaying() {
    drawBackground();
    const q = questions[currentQ];
    const t = Date.now() * 0.001;

    // 상단: 목숨(하트) 표시
    const barY = 15;
    const livesLeft = MAX_WRONG - wrongCount;
    const heartSize = Math.min(16, W() * 0.02);
    ctx.font = `${heartSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'left';
    for (let i = 0; i < MAX_WRONG; i++) {
        const hx = 60 + i * (heartSize + 6);
        ctx.fillStyle = i < livesLeft ? '#FF4757' : '#333';
        ctx.fillText('♥', hx, barY + heartSize);
    }

    // 문제 번호
    const numSize = Math.min(14, W() * 0.018);
    ctx.font = `bold ${numSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText(`Q${currentQ + 1}`, W() / 2, barY + numSize);

    // 점수 & 콤보
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.min(11, W() * 0.014)}px 'Press Start 2P', monospace`;
    ctx.fillText(`SCORE: ${score}`, W() - 15, barY + numSize);
    if (combo > 1) {
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'right';
        ctx.fillText(`🔥 ${combo} COMBO`, W() - 15, barY + numSize + 20);
    }

    // 타이머 바
    const elapsed = Date.now() - timerStart;
    const timeLeft = Math.max(0, 1 - elapsed / TIME_PER_QUESTION);
    const timerY = barY + numSize + 12;
    const timerW = W() * 0.6;
    const timerX = (W() - timerW) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, timerX, timerY, timerW, 8, 4);
    ctx.fill();
    const timerColor = timeLeft > 0.5 ? '#2ed573' : timeLeft > 0.25 ? '#ffa502' : '#ff4757';
    ctx.fillStyle = timerColor;
    roundRect(ctx, timerX, timerY, timerW * timeLeft, 8, 4);
    ctx.fill();

    // 타이머 숫자
    const secLeft = Math.ceil((TIME_PER_QUESTION - elapsed) / 1000);
    if (secLeft <= 3 && secLeft > 0) {
        ctx.font = `bold ${Math.min(14, W() * 0.018)}px 'Press Start 2P', monospace`;
        ctx.fillStyle = '#ff4757';
        ctx.textAlign = 'center';
        ctx.fillText(`${secLeft}`, W() / 2, timerY + 28);
    }

    // 카테고리 배지
    const catStyle = getCategoryStyle(q.category);
    const catSize = Math.min(12, W() * 0.015);
    const catText = `${catStyle.emoji} ${q.category}`;
    ctx.font = `bold ${catSize}px 'Press Start 2P', monospace`;
    const catTextW = ctx.measureText(catText).width + 20;
    const catBadgeX = (W() - catTextW) / 2;
    const catBadgeY = H() * 0.19;
    ctx.fillStyle = catStyle.color + '33';
    roundRect(ctx, catBadgeX, catBadgeY, catTextW, catSize + 12, 8);
    ctx.fill();
    ctx.strokeStyle = catStyle.color + '88';
    ctx.lineWidth = 1;
    roundRect(ctx, catBadgeX, catBadgeY, catTextW, catSize + 12, 8);
    ctx.stroke();
    ctx.fillStyle = catStyle.color;
    ctx.textAlign = 'center';
    ctx.fillText(catText, W() / 2, catBadgeY + catSize + 4);

    // 문제 카드
    const cardW = Math.min(700, W() * 0.85);
    const cardH = Math.min(180, H() * 0.22);
    const cardX = (W() - cardW) / 2;
    const cardY = H() * 0.25;

    ctx.save();
    if (shakeAmount > 0) {
        ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
        shakeAmount *= 0.9;
    }

    // 카드 배경
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
    cardGrad.addColorStop(1, 'rgba(255,255,255,0.04)');
    ctx.fillStyle = cardGrad;
    roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.stroke();

    // 문제 텍스트 (줄바꿈)
    const qFontSize = Math.min(15, W() * 0.018, cardW * 0.025);
    const lines = wrapText(q.q, cardW - 40, qFontSize);
    ctx.font = `bold ${qFontSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    const lineH = qFontSize * 1.8;
    const textStartY = cardY + (cardH - lines.length * lineH) / 2 + qFontSize;
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], W() / 2, textStartY + i * lineH);
    }
    ctx.restore();

    // O / X 버튼
    const btnSize = Math.min(120, W() * 0.15, H() * 0.15);
    const btnY = H() * 0.58;
    const btnGap = Math.min(100, W() * 0.12);

    // O 버튼
    const oX = W() / 2 - btnGap - btnSize / 2;
    const oHover = selectedSide === 'O' ? 1.1 : 1;
    drawOXButton(oX, btnY, btnSize * oHover, 'O', '#4169E1', '#1a1a6e', selectedSide === 'O');

    // X 버튼
    const xX = W() / 2 + btnGap - btnSize / 2;
    const xHover = selectedSide === 'X' ? 1.1 : 1;
    drawOXButton(xX, btnY, btnSize * xHover, 'X', '#FF4757', '#8B0000', selectedSide === 'X');

    // 안내
    ctx.font = `${Math.min(10, W() * 0.012)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('← O키 = ⭕    → X키 = ❌', W() / 2, H() * 0.88);

    // 시간 초과는 gameLoop의 update()에서 처리
}

function drawOXButton(x, y, size, label, color1, color2, active) {
    ctx.save();
    if (active) {
        ctx.shadowColor = color1;
        ctx.shadowBlur = 20;
    }
    const grad = ctx.createRadialGradient(x + size / 2, y + size / 2, 0, x + size / 2, y + size / 2, size / 2);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = active ? 3 : 1;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = `bold ${size * 0.5}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + size / 2, y + size / 2);
    ctx.restore();
}

function drawShowResult() {
    drawBackground();
    const q = questions[currentQ];
    const elapsed = Date.now() - resultStart;

    // 정답/오답 표시
    const headerSize = Math.min(36, W() * 0.05);
    ctx.save();
    if (lastCorrect) {
        ctx.shadowColor = '#00FF7F';
        ctx.shadowBlur = 25;
        ctx.font = `bold ${headerSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = '#00FF7F';
        ctx.textAlign = 'center';
        ctx.fillText('⭕ 정답!', W() / 2, H() * 0.12);
    } else if (lastAnswer === null) {
        ctx.shadowColor = '#ffa502';
        ctx.shadowBlur = 25;
        ctx.font = `bold ${headerSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = '#ffa502';
        ctx.textAlign = 'center';
        ctx.fillText('⏰ 시간 초과!', W() / 2, H() * 0.12);
    } else {
        ctx.shadowColor = '#FF4757';
        ctx.shadowBlur = 25;
        ctx.font = `bold ${headerSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = '#FF4757';
        ctx.textAlign = 'center';
        ctx.fillText('❌ 오답!', W() / 2, H() * 0.12);
    }
    ctx.restore();

    // 정답 표시
    const ansSize = Math.min(20, W() * 0.025);
    ctx.font = `bold ${ansSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText(`정답: ${q.a ? 'O ⭕' : 'X ❌'}`, W() / 2, H() * 0.2);

    // 문제 카드 (작게)
    const qCardW = Math.min(650, W() * 0.8);
    const qCardH = Math.min(80, H() * 0.1);
    const qCardX = (W() - qCardW) / 2;
    const qCardY = H() * 0.25;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, qCardX, qCardY, qCardW, qCardH, 10);
    ctx.fill();

    const qSize = Math.min(11, W() * 0.014);
    const qLines = wrapText(q.q, qCardW - 30, qSize);
    ctx.font = `bold ${qSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    const qLineH = qSize * 1.6;
    const qStartY = qCardY + (qCardH - qLines.length * qLineH) / 2 + qSize;
    for (let i = 0; i < qLines.length; i++) {
        ctx.fillText(qLines[i], W() / 2, qStartY + i * qLineH);
    }

    // 풀이 카드
    const expCardW = Math.min(650, W() * 0.8);
    const expCardH = Math.min(200, H() * 0.25);
    const expCardX = (W() - expCardW) / 2;
    const expCardY = H() * 0.4;

    const expGrad = ctx.createLinearGradient(expCardX, expCardY, expCardX, expCardY + expCardH);
    expGrad.addColorStop(0, 'rgba(255,215,0,0.12)');
    expGrad.addColorStop(1, 'rgba(255,215,0,0.03)');
    ctx.fillStyle = expGrad;
    roundRect(ctx, expCardX, expCardY, expCardW, expCardH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, expCardX, expCardY, expCardW, expCardH, 14);
    ctx.stroke();

    // "풀이" 레이블
    const labelSize = Math.min(13, W() * 0.016);
    ctx.font = `bold ${labelSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'left';
    ctx.fillText('📝 풀이', expCardX + 18, expCardY + 28);

    // 풀이 텍스트
    const expSize = Math.min(12, W() * 0.015);
    const expLines = wrapText(q.exp, expCardW - 50, expSize);
    ctx.font = `bold ${expSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    const expLineH = expSize * 2;
    const expStartY = expCardY + 55;
    for (let i = 0; i < expLines.length; i++) {
        ctx.fillText(expLines[i], W() / 2, expStartY + i * expLineH);
    }

    // 다음 문제 안내
    const remaining = SHOW_RESULT_DURATION - elapsed;
    if (remaining > 0) {
        const sec = Math.ceil(remaining / 1000);
        ctx.font = `${Math.min(11, W() * 0.013)}px 'Press Start 2P', monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText(`${sec}초 후 다음 문제...  (ENTER: 바로 넘기기)`, W() / 2, H() * 0.85);
    }

    // 자동 넘기기는 gameLoop의 update()에서 처리

    // 파티클
    drawParticles();
}

function drawGameOver() {
    drawBackground();
    const t = Date.now() * 0.001;

    // 타이틀
    const titleSize = Math.min(32, W() * 0.04);
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 결과 🏆', W() / 2, H() * 0.08);
    ctx.restore();

    // 점수
    const scoreSize = Math.min(48, W() * 0.06);
    ctx.font = `bold ${scoreSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`${score}점`, W() / 2, H() * 0.18);

    // 통계
    const correct = answers.filter(a => a.correct).length;
    const totalAnswered = answers.length;
    const statSize = Math.min(13, W() * 0.016);
    ctx.font = `${statSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#00FF7F';
    ctx.fillText(`정답 ${correct}/${totalAnswered}  |  최고콤보 ${maxCombo}`, W() / 2, H() * 0.24);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`BEST: ${bestScore}점`, W() / 2, H() * 0.29);

    // 각 문제 결과 스크롤 (작은 카드들)
    const listStart = H() * 0.34;
    const itemH = Math.min(40, H() * 0.045);
    const listW = Math.min(700, W() * 0.85);
    const listX = (W() - listW) / 2;

    for (let i = 0; i < answers.length; i++) {
        const a = answers[i];
        const iy = listStart + i * (itemH + 4);
        if (iy > H() * 0.85) break;

        ctx.fillStyle = a.correct ? 'rgba(0,255,127,0.08)' : 'rgba(255,71,87,0.08)';
        roundRect(ctx, listX, iy, listW, itemH, 6);
        ctx.fill();

        // 번호 + 카테고리
        const itemFontSize = Math.min(10, itemH * 0.28);
        ctx.font = `bold ${itemFontSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = a.correct ? '#00FF7F' : '#FF4757';
        ctx.textAlign = 'left';
        const catS = getCategoryStyle(a.question.category);
        ctx.fillText(`${a.correct ? '⭕' : '❌'} Q${i + 1}`, listX + 10, iy + itemH * 0.65);
        ctx.fillStyle = catS.color;
        ctx.fillText(`[${a.question.category}]`, listX + 85, iy + itemH * 0.65);

        // 내용 (축약)
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        const qText = a.question.q.length > 25 ? a.question.q.substring(0, 25) + '...' : a.question.q;
        ctx.fillText(qText, listX + 80, iy + itemH * 0.65);
    }

    // 안내
    const pulse = Math.sin(t * 3) * 0.3 + 0.7;
    ctx.font = `${Math.min(11, W() * 0.013)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.textAlign = 'center';
    ctx.fillText('ENTER: 다시 도전  |  ESC: 게임 목록', W() / 2, H() * 0.94);
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.15;
        p.life -= p.decay;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.life <= 0) particles.splice(i, 1);
    }
    ctx.globalAlpha = 1;
}

// ===== 상태 업데이트 (렌더와 분리) =====
function update() {
    if (state === 'PLAYING') {
        const elapsed = Date.now() - timerStart;
        if (elapsed >= TIME_PER_QUESTION) {
            const q = questions[currentQ];
            lastAnswer = null;
            lastCorrect = false;
            combo = 0;
            wrongCount++;
            answers.push({ correct: false, userAnswer: null, question: q });
            shakeAmount = 8;
            spawnParticles(W() / 2, H() * 0.4, '#ffa502', 15);
            state = 'SHOW_RESULT';
            resultStart = Date.now();
        }
    }
    if (state === 'SHOW_RESULT') {
        const elapsed = Date.now() - resultStart;
        if (elapsed >= SHOW_RESULT_DURATION) {
            nextQuestion();
        }
    }
}

// ===== 메인 루프 =====
function gameLoop() {
    update();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state === 'READY') drawReady();
    else if (state === 'PLAYING') drawPlaying();
    else if (state === 'SHOW_RESULT') drawShowResult();
    else if (state === 'GAME_OVER') drawGameOver();

    requestAnimationFrame(gameLoop);
}

// ===== 입력 =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
        window.location.href = '../../index.html';
        return;
    }

    if (state === 'READY') {
        if (e.key === 'Enter') { e.preventDefault(); startGame(); }
        return;
    }

    if (state === 'PLAYING') {
        if (e.key === 'ArrowLeft' || e.key === 'o' || e.key === 'O') {
            e.preventDefault(); submitAnswer(true);
        } else if (e.key === 'ArrowRight' || e.key === 'x' || e.key === 'X') {
            e.preventDefault(); submitAnswer(false);
        }
        return;
    }

    if (state === 'SHOW_RESULT') {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextQuestion(); }
        return;
    }

    if (state === 'GAME_OVER') {
        if (e.key === 'Enter') { e.preventDefault(); state = 'READY'; }
        return;
    }
});

window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(e.key)) e.preventDefault();
});

// ===== 마우스/터치 =====
canvas.addEventListener('click', (e) => {
    if (state === 'READY') { startGame(); return; }
    if (state === 'SHOW_RESULT') { nextQuestion(); return; }
    if (state === 'GAME_OVER') { state = 'READY'; return; }

    if (state === 'PLAYING') {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        if (mx < W() / 2) submitAnswer(true);
        else submitAnswer(false);
    }
});

gameLoop();

// ===== 홈 버튼 =====
(function createHomeButton() {
    const btn = document.createElement('button');
    btn.id = 'homeBtn';
    btn.innerHTML = '🏠';
    btn.title = '홈으로';
    btn.style.cssText = `
        position:fixed; top:12px; left:12px; z-index:20;
        width:44px; height:44px; border:none; border-radius:12px;
        background:rgba(255,255,255,0.1); backdrop-filter:blur(6px);
        -webkit-backdrop-filter:blur(6px); font-size:22px;
        line-height:44px; text-align:center; cursor:pointer;
        color:#fff; touch-action:manipulation;
        transition: background 0.2s, transform 0.15s;
    `;
    document.body.appendChild(btn);
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '../../index.html';
    });
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        window.location.href = '../../index.html';
    });
})();
