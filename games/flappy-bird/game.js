// ===== 플래피버드 (Flappy Bird) =====
(() => {
    'use strict';

    // ===== Canvas Setup =====
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    function W() { return canvas.width; }
    function H() { return canvas.height; }

    // ===== Colors (from theme) =====
    const COLORS = {
        bg: '#0c0c1d',
        bird: '#a78bfa',
        birdGlow: 'rgba(167,139,250,0.4)',
        birdEye: '#f0f0f5',
        birdPupil: '#0c0c1d',
        pipe: '#f472b6',
        pipeGlow: 'rgba(244,114,182,0.25)',
        pipeDark: '#d946a8',
        ground: 'rgba(255,255,255,0.08)',
        groundLine: 'rgba(255,255,255,0.15)',
        text: '#f0f0f5',
        textSecondary: 'rgba(240,240,245,0.6)',
        textMuted: 'rgba(240,240,245,0.35)',
        scoreGlow: 'rgba(167,139,250,0.5)',
        accent: '#a78bfa',
        accentPink: '#f472b6',
        accentBlue: '#60a5fa',
    };

    // ===== Background Orbs =====
    const orbs = [
        { x: 0.15, y: 0.25, r: 200, color: 'rgba(167,139,250,0.07)' },
        { x: 0.85, y: 0.65, r: 250, color: 'rgba(244,114,182,0.05)' },
        { x: 0.5, y: 0.1, r: 160, color: 'rgba(96,165,250,0.06)' },
    ];

    function drawOrbs() {
        orbs.forEach(o => {
            const g = ctx.createRadialGradient(o.x * W(), o.y * H(), 0, o.x * W(), o.y * H(), o.r);
            g.addColorStop(0, o.color);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W(), H());
        });
    }

    // ===== Background Stars =====
    let stars = [];
    function initStars() {
        stars = [];
        const count = Math.floor((W() * H()) / 8000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * W(),
                y: Math.random() * H(),
                r: Math.random() * 1.2 + 0.3,
                a: Math.random() * 0.5 + 0.2,
                speed: Math.random() * 0.3 + 0.1,
            });
        }
    }
    initStars();
    window.addEventListener('resize', initStars);

    function drawStars(time) {
        stars.forEach(s => {
            const flicker = Math.sin(time * 0.001 * s.speed + s.x) * 0.3 + 0.7;
            ctx.globalAlpha = s.a * flicker;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    // ===== Game Constants =====
    const GRAVITY = 1400;
    const JUMP_VELOCITY = -480;
    const PIPE_WIDTH_RATIO = 0.08;  // pipe width relative to screen width
    const PIPE_SPAWN_INTERVAL = 1.8; // seconds between pipe spawns
    const GROUND_HEIGHT = 3;

    // Gap sizes by difficulty
    function getGapSize() {
        const base = Math.min(H() * 0.28, 180);
        if (score <= 5) return base;
        if (score <= 15) return base * 0.83;
        if (score <= 30) return base * 0.72;
        return base * 0.64;
    }

    function getGameSpeed() {
        const base = W() * 0.18;
        if (score <= 5) return base;
        if (score <= 15) return base * 1.2;
        if (score <= 30) return base * 1.4;
        return base * 1.6;
    }

    // ===== Game State =====
    let state = 'START'; // START, PLAY, OVER
    let bird, pipes, score, bestScore, pipeTimer, groundOffset;

    bestScore = parseInt(localStorage.getItem('flappy_best') || '0');

    function birdSize() { return Math.min(W(), H()) * 0.035; }
    function pipeWidth() { return W() * PIPE_WIDTH_RATIO; }
    function groundY() { return H() - GROUND_HEIGHT; }

    function initGame() {
        const r = birdSize();
        bird = {
            x: W() * 0.25,
            y: H() * 0.45,
            vy: 0,
            r: r,
            rotation: 0,
        };
        pipes = [];
        score = 0;
        pipeTimer = PIPE_SPAWN_INTERVAL * 0.6; // spawn first pipe sooner
        groundOffset = 0;
    }

    // ===== Pipes =====
    function spawnPipe() {
        const gap = getGapSize();
        const minY = H() * 0.12 + gap / 2;
        const maxY = groundY() - H() * 0.08 - gap / 2;
        const centerY = Math.random() * (maxY - minY) + minY;

        pipes.push({
            x: W() + pipeWidth(),
            centerY: centerY,
            gap: gap,
            scored: false,
        });
    }

    function drawPipe(p) {
        const pw = pipeWidth();
        const topBottom = p.centerY - p.gap / 2;
        const botTop = p.centerY + p.gap / 2;
        const capH = Math.max(6, pw * 0.15);
        const capExtra = pw * 0.12;

        // Glow
        ctx.shadowColor = COLORS.pipeGlow;
        ctx.shadowBlur = 20;

        // Top pipe body
        const tGrad = ctx.createLinearGradient(p.x, 0, p.x + pw, 0);
        tGrad.addColorStop(0, COLORS.pipeDark);
        tGrad.addColorStop(0.4, COLORS.pipe);
        tGrad.addColorStop(1, COLORS.pipeDark);
        ctx.fillStyle = tGrad;
        roundRect(ctx, p.x, -4, pw, topBottom + 4, 0, true);

        // Top pipe cap
        ctx.fillStyle = COLORS.pipe;
        roundRect(ctx, p.x - capExtra, topBottom - capH, pw + capExtra * 2, capH, 4, true);

        // Pipe highlight (top)
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(p.x + pw * 0.15, 0, pw * 0.15, topBottom - capH);

        // Bottom pipe body
        ctx.fillStyle = tGrad;
        roundRect(ctx, p.x, botTop, pw, H() - botTop + 4, 0, true);

        // Bottom pipe cap
        ctx.fillStyle = COLORS.pipe;
        roundRect(ctx, p.x - capExtra, botTop, pw + capExtra * 2, capH, 4, true);

        // Pipe highlight (bottom)
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(p.x + pw * 0.15, botTop + capH, pw * 0.15, H() - botTop);

        ctx.shadowBlur = 0;
    }

    // ===== Bird Drawing =====
    function drawBird() {
        const r = bird.r;
        const x = bird.x;
        const y = bird.y;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(bird.rotation);

        // Glow
        const glow = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.5);
        glow.addColorStop(0, COLORS.birdGlow);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(-r * 2.5, -r * 2.5, r * 5, r * 5);

        // Body
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        const bodyGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
        bodyGrad.addColorStop(0, '#c4b5fd');
        bodyGrad.addColorStop(1, COLORS.bird);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // Wing
        const wingPhase = Math.sin(Date.now() * 0.012) * 0.3;
        ctx.save();
        ctx.translate(-r * 0.2, r * 0.1);
        ctx.rotate(wingPhase);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.7, r * 0.35, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#8b6fd4';
        ctx.fill();
        ctx.restore();

        // Eye (white)
        ctx.beginPath();
        ctx.arc(r * 0.35, -r * 0.15, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.birdEye;
        ctx.fill();

        // Pupil
        ctx.beginPath();
        ctx.arc(r * 0.45, -r * 0.12, r * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.birdPupil;
        ctx.fill();

        // Beak
        ctx.beginPath();
        ctx.moveTo(r * 0.7, -r * 0.05);
        ctx.lineTo(r * 1.2, r * 0.15);
        ctx.lineTo(r * 0.7, r * 0.3);
        ctx.closePath();
        ctx.fillStyle = '#fbbf24';
        ctx.fill();

        ctx.restore();
    }

    // ===== Ground =====
    function drawGround(dt) {
        const gy = groundY();
        const speed = getGameSpeed();
        if (state === 'PLAY') {
            groundOffset = (groundOffset + speed * dt) % 40;
        }

        ctx.fillStyle = COLORS.ground;
        ctx.fillRect(0, gy, W(), GROUND_HEIGHT);

        ctx.strokeStyle = COLORS.groundLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W(), gy);
        ctx.stroke();

        // Dashed ground markers
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.moveTo(-groundOffset, gy + 1);
        ctx.lineTo(W() + 40, gy + 1);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // ===== Collision Detection =====
    function checkCollision() {
        const r = bird.r * 0.75; // slightly forgiving hitbox

        // Floor / Ceiling
        if (bird.y + r >= groundY() || bird.y - r <= 0) return true;

        // Pipes
        const pw = pipeWidth();
        for (const p of pipes) {
            const topBottom = p.centerY - p.gap / 2;
            const botTop = p.centerY + p.gap / 2;

            // Horizontal overlap?
            if (bird.x + r > p.x && bird.x - r < p.x + pw) {
                // Top pipe or bottom pipe?
                if (bird.y - r < topBottom || bird.y + r > botTop) {
                    return true;
                }
            }
        }
        return false;
    }

    // ===== Update =====
    function update(dt) {
        if (state !== 'PLAY') return;

        // Bird physics
        bird.vy += GRAVITY * dt;
        bird.y += bird.vy * dt;

        // Bird rotation based on velocity
        const targetRot = Math.max(-0.5, Math.min(bird.vy * 0.002, 1.2));
        bird.rotation += (targetRot - bird.rotation) * 0.1;

        // Move pipes
        const speed = getGameSpeed();
        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].x -= speed * dt;

            // Score
            if (!pipes[i].scored && pipes[i].x + pipeWidth() < bird.x) {
                pipes[i].scored = true;
                score++;
            }

            // Remove off-screen pipes
            if (pipes[i].x + pipeWidth() < -20) {
                pipes.splice(i, 1);
            }
        }

        // Spawn pipes
        pipeTimer -= dt;
        if (pipeTimer <= 0) {
            spawnPipe();
            // Slightly reduce interval at higher speeds
            const interval = score > 15 ? PIPE_SPAWN_INTERVAL * 0.85 : PIPE_SPAWN_INTERVAL;
            pipeTimer = interval;
        }

        // Ground scroll
        groundOffset = (groundOffset + speed * dt) % 40;

        // Collision
        if (checkCollision()) {
            gameOver();
        }
    }

    // ===== Jump =====
    function jump() {
        bird.vy = JUMP_VELOCITY;
    }

    // ===== Game Over =====
    function gameOver() {
        state = 'OVER';
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('flappy_best', bestScore.toString());
        }
    }

    // ===== Drawing: HUD =====
    function drawHUD() {
        if (state !== 'PLAY') return;

        const fontSize = Math.max(28, Math.min(W(), H()) * 0.06);
        ctx.font = `800 ${fontSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Score shadow/glow
        ctx.shadowColor = COLORS.scoreGlow;
        ctx.shadowBlur = 20;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(score, W() / 2, H() * 0.06);
        ctx.shadowBlur = 0;
    }

    // ===== Start Screen =====
    function drawStartScreen() {
        // Title
        const titleSize = Math.max(24, Math.min(W(), H()) * 0.05);
        ctx.font = `800 ${titleSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.text;
        ctx.fillText('🐦 플래피버드', W() / 2, H() * 0.32);

        // Subtitle
        const subSize = Math.max(12, titleSize * 0.4);
        ctx.font = `500 ${subSize}px 'Pretendard Variable', sans-serif`;
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText('파이프 사이를 날아가자!', W() / 2, H() * 0.40);

        // Instructions
        const hintSize = Math.max(10, titleSize * 0.32);
        ctx.font = `600 ${hintSize}px 'Pretendard Variable', sans-serif`;
        ctx.fillStyle = COLORS.textMuted;

        const isMobile = 'ontouchstart' in window;
        const msg = isMobile ? '화면을 탭하여 시작' : 'Space / 클릭으로 시작';

        // Pulsing effect
        const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        ctx.fillText(msg, W() / 2, H() * 0.52);
        ctx.globalAlpha = 1;

        // Draw demo bird
        bird.y = H() * 0.45 + Math.sin(Date.now() * 0.003) * 15;
        bird.rotation = Math.sin(Date.now() * 0.004) * 0.15;
        drawBird();
    }

    // ===== Game Over Screen =====
    function drawOverScreen() {
        // Dim overlay
        ctx.fillStyle = 'rgba(12,12,29,0.65)';
        ctx.fillRect(0, 0, W(), H());

        const titleSize = Math.max(22, Math.min(W(), H()) * 0.045);

        // Game Over text
        ctx.font = `800 ${titleSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.accentPink;
        ctx.fillText('GAME OVER', W() / 2, H() * 0.32);

        // Score
        const scoreSize = Math.max(32, titleSize * 1.5);
        ctx.font = `800 ${scoreSize}px 'Inter', sans-serif`;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(score, W() / 2, H() * 0.43);

        // Label
        const labelSize = Math.max(10, titleSize * 0.4);
        ctx.font = `500 ${labelSize}px 'Pretendard Variable', sans-serif`;
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText('점수', W() / 2, H() * 0.37);

        // Best
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText(`최고 기록: ${bestScore}`, W() / 2, H() * 0.52);

        // Restart hint
        const hintSize = Math.max(10, titleSize * 0.35);
        ctx.font = `600 ${hintSize}px 'Pretendard Variable', sans-serif`;

        const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = COLORS.accent;

        const isMobile = 'ontouchstart' in window;
        ctx.fillText(isMobile ? '탭하여 다시 시작' : 'Space / 클릭으로 다시 시작', W() / 2, H() * 0.60);
        ctx.globalAlpha = 1;
    }

    // ===== Home Button =====
    const HOME_SIZE = 44;
    const HOME_PAD = 12;

    function drawHomeBtn() {
        const x = HOME_PAD;
        const y = HOME_PAD;

        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        roundRect(ctx, x, y, HOME_SIZE, HOME_SIZE, 14, true);
        roundRect(ctx, x, y, HOME_SIZE, HOME_SIZE, 14, false, true);

        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.text;
        ctx.fillText('🏠', x + HOME_SIZE / 2, y + HOME_SIZE / 2);
    }

    function isHomeClick(px, py) {
        return px >= HOME_PAD && px <= HOME_PAD + HOME_SIZE && py >= HOME_PAD && py <= HOME_PAD + HOME_SIZE;
    }

    // ===== Helpers =====
    function roundRect(c, x, y, w, h, r, fill, stroke) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
        if (fill) c.fill();
        if (stroke) c.stroke();
    }

    // ===== Main Loop =====
    let lastTime = 0;

    function loop(ts) {
        const dt = Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;

        // Clear
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, W(), H());

        // Background
        drawOrbs();
        drawStars(ts);

        if (state === 'START') {
            drawGround(dt);
            drawStartScreen();
            drawHomeBtn();
        } else if (state === 'PLAY') {
            update(dt);
            pipes.forEach(drawPipe);
            drawGround(dt);
            drawBird();
            drawHUD();
            drawHomeBtn();
        } else if (state === 'OVER') {
            pipes.forEach(drawPipe);
            drawGround(dt);
            drawBird();
            drawOverScreen();
            drawHomeBtn();
        }

        requestAnimationFrame(loop);
    }

    // ===== Input: Keyboard =====
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (state === 'START') { initGame(); state = 'PLAY'; jump(); return; }
            if (state === 'OVER') { initGame(); state = 'PLAY'; jump(); return; }
            if (state === 'PLAY') { jump(); }
        }
        if (e.key === 'Escape') {
            window.location.href = '../../index.html';
        }
    });

    // ===== Input: Touch =====
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        if (isHomeClick(t.clientX, t.clientY)) {
            window.location.href = '../../index.html';
            return;
        }
        if (state === 'START') { initGame(); state = 'PLAY'; jump(); return; }
        if (state === 'OVER') { initGame(); state = 'PLAY'; jump(); return; }
        if (state === 'PLAY') { jump(); }
    }, { passive: false });

    // ===== Input: Mouse Click =====
    canvas.addEventListener('click', (e) => {
        if (isHomeClick(e.clientX, e.clientY)) {
            window.location.href = '../../index.html';
            return;
        }
        if (state === 'START') { initGame(); state = 'PLAY'; jump(); return; }
        if (state === 'OVER') { initGame(); state = 'PLAY'; jump(); return; }
        if (state === 'PLAY') { jump(); }
    });

    // Prevent scroll
    window.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });

    // ===== Init =====
    initGame();
    requestAnimationFrame(loop);
})();
