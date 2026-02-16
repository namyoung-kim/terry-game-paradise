// ===== 암산왕 게임 =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const answerBox = document.getElementById('answerBox');
const answerInput = document.getElementById('answerInput');
const submitBtn = document.getElementById('submitBtn');

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
const MAX_WRONG = 5;
const TIME_PER_QUESTION = 30000; // 30초
const FAST_BONUS_TIME = 5000; // 5초 이내 보너스
const SHOW_RESULT_DURATION = 2000; // 결과 표시 시간

// ===== 연산 타입 (배지 표시용) =====
const OPS = [
    { id: 'add', name: '덧셈', emoji: '➕', color: '#4ECDC4' },
    { id: 'sub', name: '뺄셈', emoji: '➖', color: '#FF6B6B' },
    { id: 'mul', name: '곱셈', emoji: '✖️', color: '#A78BFA' },
    { id: 'div', name: '나눗셈', emoji: '➗', color: '#FCD34D' }
];

// ===== 게임 상태 =====
let state = 'READY'; // READY, PLAYING, RESULT, GAME_OVER

let currentProblem = null; // { num1, num2, op, answer, display }
let score = 0;
let combo = 0;
let maxCombo = 0;
let wrongCount = 0;
let questionNum = 0;
let timerStart = 0;
let resultStart = 0;
let lastCorrect = false;
let lastAnswer = null; // 유저가 제출한 답
let lastTimedOut = false;

let particles = [];
let shakeAmount = 0;
let stars = [];
let bestScore = parseInt(localStorage.getItem('mathKingBestAll') || '0', 10);

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
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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

// ===== 문제 생성 (랜덤 사칙연산 & 유동 자릿수) =====
function generateProblem() {
    const opTypes = ['add', 'sub', 'mul', 'div'];
    const opType = opTypes[Math.floor(Math.random() * opTypes.length)];
    let num1, num2, answer, display, opInfo;

    switch (opType) {
        case 'add':
            // 1~999 + 1~999 (1자리~3자리 자유 조합)
            num1 = randInt(1, 999);
            num2 = randInt(1, 999);
            answer = num1 + num2;
            display = `${num1} + ${num2} = ?`;
            opInfo = OPS[0];
            break;
        case 'sub':
            // 결과가 최소 1 이상이 되도록
            num1 = randInt(2, 999);
            num2 = randInt(1, num1 - 1); // 결과 = num1 - num2 >= 1
            answer = num1 - num2;
            display = `${num1} - ${num2} = ?`;
            opInfo = OPS[1];
            break;
        case 'mul':
            // 1~99 × 1~9 (1~2자리 × 1자리 자유 조합)
            num1 = randInt(1, 99);
            num2 = randInt(1, 9);
            answer = num1 * num2;
            display = `${num1} × ${num2} = ?`;
            opInfo = OPS[2];
            break;
        case 'div':
            // 나머지 없는 나눗셈 (1~2자리 ÷ 1자리)
            num2 = randInt(2, 9);
            const quotient = randInt(1, Math.floor(99 / num2));
            num1 = quotient * num2;
            answer = quotient;
            display = `${num1} ÷ ${num2} = ?`;
            opInfo = OPS[3];
            break;
    }
    return { num1, num2, op: opInfo, answer, display };
}

// ===== 게임 흐름 =====
function startGame() {
    score = 0;
    combo = 0;
    maxCombo = 0;
    wrongCount = 0;
    questionNum = 0;
    particles = [];
    shakeAmount = 0;
    nextProblem();
}

function nextProblem() {
    if (wrongCount >= MAX_WRONG) {
        state = 'GAME_OVER';
        hideAnswerBox();
        // 최고점수 갱신
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('mathKingBestAll', String(bestScore));
        }
        return;
    }
    questionNum++;
    currentProblem = generateProblem();
    state = 'PLAYING';
    timerStart = Date.now();
    lastCorrect = false;
    lastAnswer = null;
    lastTimedOut = false;
    showAnswerBox();
}

function submitAnswer() {
    if (state !== 'PLAYING') return;
    const val = answerInput.value.trim();
    if (val === '') return;

    const userAnswer = parseInt(val, 10);
    if (isNaN(userAnswer)) return;

    lastAnswer = userAnswer;
    const elapsed = Date.now() - timerStart;
    const correct = userAnswer === currentProblem.answer;
    lastCorrect = correct;
    lastTimedOut = false;

    if (correct) {
        let pts = 10;
        // 5초 이내 보너스
        if (elapsed <= FAST_BONUS_TIME) {
            pts += 20;
        } else if (elapsed <= 10000) {
            pts += 10;
        }
        // 콤보 보너스
        pts += combo * 3;
        score += pts;
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        spawnParticles(W() / 2, H() * 0.35, '#00FF7F', 30);
    } else {
        combo = 0;
        wrongCount++;
        shakeAmount = 12;
        spawnParticles(W() / 2, H() * 0.35, '#FF4757', 20);
    }

    state = 'RESULT';
    resultStart = Date.now();
    hideAnswerBox();
}

function handleTimeout() {
    lastAnswer = null;
    lastCorrect = false;
    lastTimedOut = true;
    combo = 0;
    wrongCount++;
    shakeAmount = 8;
    spawnParticles(W() / 2, H() * 0.35, '#ffa502', 15);
    state = 'RESULT';
    resultStart = Date.now();
    hideAnswerBox();
}

function showAnswerBox() {
    answerBox.style.display = 'flex';
    answerInput.value = '';
    // 짧은 딜레이 후 포커스 (모바일 대응)
    setTimeout(() => answerInput.focus(), 100);
}

// ===== visualViewport 기반 키보드 대응 =====
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        const vv = window.visualViewport;
        // 키보드가 올라오면 입력창을 가시 영역 하단에 고정
        const offsetY = window.innerHeight - vv.height - vv.offsetTop;
        if (offsetY > 50) {
            // 키보드가 올라온 상태
            answerBox.style.bottom = (offsetY + 4) + 'px';
        } else {
            answerBox.style.bottom = '';
        }
    });
    window.visualViewport.addEventListener('scroll', () => {
        const vv = window.visualViewport;
        const offsetY = window.innerHeight - vv.height - vv.offsetTop;
        if (offsetY > 50) {
            answerBox.style.bottom = (offsetY + 4) + 'px';
        } else {
            answerBox.style.bottom = '';
        }
    });
}

function hideAnswerBox() {
    answerBox.style.display = 'none';
    answerInput.blur();
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

// ===== READY 화면 =====
function drawReady() {
    drawBackground();
    const t = Date.now() * 0.001;

    // 타이틀
    const titleSize = Math.min(36, W() * 0.05);
    ctx.save();
    ctx.shadowColor = '#FCD34D';
    ctx.shadowBlur = 25;
    ctx.font = `bold ${titleSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';

    const titleGrad = ctx.createLinearGradient(0, H() * 0.22, 0, H() * 0.22 + titleSize * 2);
    titleGrad.addColorStop(0, '#FFD700');
    titleGrad.addColorStop(1, '#FF8C00');
    ctx.fillStyle = titleGrad;

    const bounce = Math.sin(t * 1.5) * 5;
    ctx.fillText('🧮 암산왕 🧮', W() / 2, H() * 0.25 + bounce);
    ctx.restore();

    // 연산 아이콘 애니메이션
    const iconSize = Math.min(40, W() * 0.06);
    ctx.font = `${iconSize}px serif`;
    const icons = ['➕', '➖', '✖️', '➗'];
    for (let i = 0; i < icons.length; i++) {
        const angle = t * 0.8 + (i / icons.length) * Math.PI * 2;
        const radius = Math.min(120, W() * 0.15);
        const ix = W() / 2 + Math.cos(angle) * radius;
        const iy = H() * 0.45 + Math.sin(angle) * radius * 0.35;
        ctx.globalAlpha = 0.7 + Math.sin(t * 2 + i) * 0.3;
        ctx.textAlign = 'center';
        ctx.fillText(icons[i], ix, iy);
    }
    ctx.globalAlpha = 1;

    // 설명
    const descSize = Math.min(12, W() * 0.015);
    ctx.font = `${descSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('사칙연산 랜덤 암산 챌린지!', W() / 2, H() * 0.6);
    ctx.fillText(`♥ × ${MAX_WRONG}  |  문제당 ${TIME_PER_QUESTION / 1000}초`, W() / 2, H() * 0.66);
    ctx.fillText('5초 안에 맞추면 보너스!', W() / 2, H() * 0.72);

    // 최고점수
    if (bestScore > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`BEST: ${bestScore}점`, W() / 2, H() * 0.78);
    }

    // ENTER 안내
    const pulse = Math.sin(t * 3) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.fillText('ENTER를 눌러 시작!', W() / 2, H() * 0.85);

    // ESC
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `${Math.min(9, W() * 0.01)}px 'Press Start 2P', monospace`;
    ctx.fillText('ESC: 게임 목록으로', W() / 2, H() * 0.95);
}

// ===== PLAYING 화면 =====
function drawPlaying() {
    drawBackground();
    if (!currentProblem) return;
    const t = Date.now() * 0.001;

    // 상단 HUD
    const barY = 15;

    // 라이프 (하트)
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
    ctx.fillText(`Q${questionNum}`, W() / 2, barY + numSize);

    // 점수 & 콤보
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.min(11, W() * 0.014)}px 'Press Start 2P', monospace`;
    ctx.fillText(`SCORE: ${score}`, W() - 15, barY + numSize);
    if (combo > 1) {
        ctx.fillStyle = '#FFD700';
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

    // 타이머 숫자 (남은 시간)
    const secLeft = Math.ceil((TIME_PER_QUESTION - elapsed) / 1000);
    if (secLeft <= 5 && secLeft > 0) {
        ctx.font = `bold ${Math.min(14, W() * 0.018)}px 'Press Start 2P', monospace`;
        ctx.fillStyle = '#ff4757';
        ctx.textAlign = 'center';
        ctx.fillText(`${secLeft}`, W() / 2, timerY + 28);
    }

    // 연산 배지 (현재 문제의 연산 표시)
    const op = currentProblem.op;
    const catSize = Math.min(12, W() * 0.015);
    const catText = `${op.emoji} ${op.name}`;
    ctx.font = `bold ${catSize}px 'Press Start 2P', monospace`;
    const catTextW = ctx.measureText(catText).width + 20;
    const catBadgeX = (W() - catTextW) / 2;
    const catBadgeY = H() * 0.12;
    ctx.fillStyle = op.color + '33';
    roundRect(ctx, catBadgeX, catBadgeY, catTextW, catSize + 12, 8);
    ctx.fill();
    ctx.strokeStyle = op.color + '88';
    ctx.lineWidth = 1;
    roundRect(ctx, catBadgeX, catBadgeY, catTextW, catSize + 12, 8);
    ctx.stroke();
    ctx.fillStyle = op.color;
    ctx.textAlign = 'center';
    ctx.fillText(catText, W() / 2, catBadgeY + catSize + 4);

    // 문제 카드 (모바일에서 키보드를 고려해 위쪽에 배치)
    const cardW = Math.min(600, W() * 0.8);
    const cardH = Math.min(110, H() * 0.14);
    const cardX = (W() - cardW) / 2;
    const cardY = H() * 0.18;

    ctx.save();
    if (shakeAmount > 0) {
        ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
        shakeAmount *= 0.9;
        if (shakeAmount < 0.5) shakeAmount = 0;
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

    // 문제 텍스트
    const qFontSize = Math.min(28, W() * 0.045, cardW * 0.055);
    ctx.font = `bold ${qFontSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentProblem.display, W() / 2, cardY + cardH / 2);
    ctx.restore();

    // 5초 보너스 표시
    const bonusElapsed = Date.now() - timerStart;
    if (bonusElapsed <= FAST_BONUS_TIME) {
        const bonusAlpha = 0.4 + Math.sin(t * 4) * 0.3;
        ctx.font = `${Math.min(10, W() * 0.012)}px 'Press Start 2P', monospace`;
        ctx.fillStyle = `rgba(0, 255, 127, ${bonusAlpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('⚡ 보너스 타임! ⚡', W() / 2, cardY + cardH + 22);
    }

    drawParticles();
}

// ===== RESULT 화면 =====
function drawResult() {
    drawBackground();

    const headerSize = Math.min(36, W() * 0.05);
    ctx.save();

    if (lastTimedOut) {
        ctx.shadowColor = '#ffa502';
        ctx.shadowBlur = 25;
        ctx.font = `bold ${headerSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = '#ffa502';
        ctx.textAlign = 'center';
        ctx.fillText('⏰ 시간 초과!', W() / 2, H() * 0.15);
    } else if (lastCorrect) {
        ctx.shadowColor = '#00FF7F';
        ctx.shadowBlur = 25;
        ctx.font = `bold ${headerSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = '#00FF7F';
        ctx.textAlign = 'center';
        ctx.fillText('⭕ 정답!', W() / 2, H() * 0.15);
    } else {
        ctx.shadowColor = '#FF4757';
        ctx.shadowBlur = 25;
        ctx.font = `bold ${headerSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = '#FF4757';
        ctx.textAlign = 'center';
        ctx.fillText('❌ 오답!', W() / 2, H() * 0.15);
    }
    ctx.restore();

    // 문제 + 정답
    const ansSize = Math.min(22, W() * 0.03);
    ctx.font = `bold ${ansSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';

    const probDisplay = currentProblem.display.replace('?', currentProblem.answer);
    ctx.fillText(probDisplay, W() / 2, H() * 0.3);

    // 유저 답 표시
    if (!lastTimedOut && !lastCorrect) {
        const userSize = Math.min(14, W() * 0.018);
        ctx.font = `${userSize}px 'Press Start 2P', monospace`;
        ctx.fillStyle = '#FF4757';
        ctx.fillText(`당신의 답: ${lastAnswer}`, W() / 2, H() * 0.4);
    }

    // 점수 정보
    const scoreSize = Math.min(14, W() * 0.018);
    ctx.font = `${scoreSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`SCORE: ${score}`, W() / 2, H() * 0.52);

    // 남은 라이프
    const livesLeft = MAX_WRONG - wrongCount;
    ctx.fillStyle = livesLeft > 2 ? '#00FF7F' : livesLeft > 0 ? '#ffa502' : '#FF4757';
    ctx.fillText(`♥ × ${livesLeft}`, W() / 2, H() * 0.6);

    // 자동 넘기기 안내
    const remaining = SHOW_RESULT_DURATION - (Date.now() - resultStart);
    if (remaining > 0) {
        ctx.font = `${Math.min(10, W() * 0.012)}px 'Press Start 2P', monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('잠시 후 다음 문제...  (ENTER: 바로 넘기기)', W() / 2, H() * 0.82);
    }

    drawParticles();
}

// ===== GAME_OVER 화면 =====
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
    ctx.fillText('🏆 게임 오버 🏆', W() / 2, H() * 0.1);
    ctx.restore();

    // 최종 점수
    const scoreSize = Math.min(48, W() * 0.06);
    ctx.font = `bold ${scoreSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`${score}점`, W() / 2, H() * 0.28);

    // 통계
    const statSize = Math.min(13, W() * 0.016);
    ctx.font = `${statSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#00FF7F';
    ctx.fillText(`총 ${questionNum}문제  |  최고콤보 ${maxCombo}`, W() / 2, H() * 0.4);

    // 최고점수
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`BEST: ${bestScore}점`, W() / 2, H() * 0.47);

    // 신기록 표시
    if (score >= bestScore && score > 0) {
        const newRecordSize = Math.min(18, W() * 0.025);
        ctx.font = `bold ${newRecordSize}px 'Press Start 2P', monospace`;
        const pulse = Math.sin(t * 4) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
        ctx.fillText('🎉 NEW RECORD! 🎉', W() / 2, H() * 0.55);
    }

    // 안내
    const instrPulse = Math.sin(t * 3) * 0.3 + 0.7;
    ctx.font = `${Math.min(11, W() * 0.013)}px 'Press Start 2P', monospace`;
    ctx.fillStyle = `rgba(255,255,255,${instrPulse})`;
    ctx.fillText('ENTER: 다시 도전', W() / 2, H() * 0.75);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('ESC: 홈으로  |  홈: 게임 목록', W() / 2, H() * 0.82);

    drawParticles();
}

// ===== 상태 업데이트 =====
function update() {
    if (state === 'PLAYING') {
        const elapsed = Date.now() - timerStart;
        if (elapsed >= TIME_PER_QUESTION) {
            handleTimeout();
        }
    }
    if (state === 'RESULT') {
        const elapsed = Date.now() - resultStart;
        if (elapsed >= SHOW_RESULT_DURATION) {
            nextProblem();
        }
    }
}

// ===== 메인 루프 =====
function gameLoop() {
    update();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state === 'READY') drawReady();
    else if (state === 'PLAYING') drawPlaying();
    else if (state === 'RESULT') drawResult();
    else if (state === 'GAME_OVER') drawGameOver();

    requestAnimationFrame(gameLoop);
}

// ===== 키보드 입력 =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
        if (state === 'GAME_OVER' || state === 'READY') {
            window.location.href = '../../index.html';
        } else if (state === 'PLAYING' || state === 'RESULT') {
            // 게임 중 ESC → READY로
            state = 'READY';
            hideAnswerBox();
        }
        return;
    }

    if (state === 'READY') {
        if (e.key === 'Enter') { e.preventDefault(); startGame(); }
        return;
    }

    if (state === 'PLAYING') {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitAnswer();
        }
        // 숫자 입력은 input 필드가 처리
        return;
    }

    if (state === 'RESULT') {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            nextProblem();
        }
        return;
    }

    if (state === 'GAME_OVER') {
        if (e.key === 'Enter') {
            e.preventDefault();
            startGame(); // 재시작
        }
        return;
    }
});

// 기본 스크롤 방지 (input 포커스가 아닐 때)
window.addEventListener('keydown', (e) => {
    if (document.activeElement === answerInput) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
    }
});

// ===== 제출 버튼 =====
submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    submitAnswer();
});

// input에서 Enter 키 처리
answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitAnswer();
    }
});

// ===== 마우스/터치 =====
canvas.addEventListener('click', (e) => {
    if (state === 'READY') { startGame(); return; }
    if (state === 'RESULT') { nextProblem(); return; }
    if (state === 'GAME_OVER') { startGame(); return; }
});

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

gameLoop();
