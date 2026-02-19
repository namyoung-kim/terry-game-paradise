// ===== 공룡 점프 (Dino Run) =====
(() => {
    'use strict';

    // ===== Canvas Setup =====
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth * devicePixelRatio;
        canvas.height = window.innerHeight * devicePixelRatio;
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // ===== Colors =====
    const COLORS = {
        bg: '#0c0c1d',
        ground: 'rgba(255,255,255,0.08)',
        groundLine: 'rgba(255,255,255,0.15)',
        dino: '#a78bfa',
        dinoGlow: 'rgba(167,139,250,0.35)',
        obstacle: '#f472b6',
        obstacleGlow: 'rgba(244,114,182,0.3)',
        bird: '#60a5fa',
        birdGlow: 'rgba(96,165,250,0.3)',
        text: '#f0f0f5',
        textMuted: 'rgba(240,240,245,0.5)',
        accent: '#60a5fa',
        border: 'rgba(255,255,255,0.08)',
        star: 'rgba(255,255,255,0.15)',
    };

    // ===== Orbs =====
    const orbs = [
        { x: 0.15, y: 0.25, r: 200, color: 'rgba(167,139,250,0.07)' },
        { x: 0.85, y: 0.65, r: 250, color: 'rgba(244,114,182,0.05)' },
        { x: 0.5, y: 0.1, r: 160, color: 'rgba(96,165,250,0.06)' },
    ];
    function drawOrbs() {
        orbs.forEach(o => {
            const grd = ctx.createRadialGradient(o.x * W(), o.y * H(), 0, o.x * W(), o.y * H(), o.r);
            grd.addColorStop(0, o.color);
            grd.addColorStop(1, 'transparent');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, W(), H());
        });
    }

    // ===== Background Stars =====
    let stars = [];
    function initStars() {
        stars = [];
        for (let i = 0; i < 60; i++) {
            stars.push({
                x: Math.random() * W(),
                y: Math.random() * H() * 0.6,
                r: Math.random() * 1.2 + 0.3,
                twinkle: Math.random() * Math.PI * 2,
            });
        }
    }
    initStars();
    window.addEventListener('resize', initStars);

    function drawStars(time) {
        stars.forEach(s => {
            const alpha = 0.1 + Math.sin(time / 1000 + s.twinkle) * 0.08;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // ===== Game State =====
    const GRAVITY = 1800;
    const JUMP_VELOCITY = -650;
    const GROUND_HEIGHT_RATIO = 0.78;

    let state = 'START'; // START, PLAY, OVER
    let dino, obstacles, gameSpeed, distScore, bestScore, obstacleTimer, nextObstacleInterval;
    let groundOffset = 0;

    bestScore = parseInt(localStorage.getItem('dino_best') || '0');

    function groundY() { return H() * GROUND_HEIGHT_RATIO; }

    function initGame() {
        dino = {
            x: W() * 0.12,
            w: 40, h: 50,
            y: groundY() - 50,
            vy: 0,
            grounded: true,
            ducking: false,
        };
        obstacles = [];
        gameSpeed = 300;
        distScore = 0;
        obstacleTimer = 0;
        nextObstacleInterval = randomInterval();
    }

    function randomInterval() { return 1.2 + Math.random() * 1.5; }

    // ===== Dino Drawing (pixel art style) =====
    function drawDino() {
        const d = dino;
        const x = d.x, y = d.y, w = d.w, h = d.ducking ? 30 : d.h;

        // glow
        ctx.shadowColor = COLORS.dinoGlow;
        ctx.shadowBlur = 16;
        ctx.fillStyle = COLORS.dino;

        // body
        ctx.beginPath();
        roundRect(ctx, x, y + (d.ducking ? 20 : 0), w, h, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        // eye
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + w - 14, y + (d.ducking ? 24 : 8), 8, 8);
        ctx.fillStyle = '#0c0c1d';
        ctx.fillRect(x + w - 10, y + (d.ducking ? 26 : 10), 4, 4);

        // legs (animate while running)
        if (d.grounded) {
            const legPhase = Math.floor(Date.now() / 100) % 2;
            ctx.fillStyle = COLORS.dino;
            if (legPhase === 0) {
                ctx.fillRect(x + 8, y + h, 8, 12);
                ctx.fillRect(x + w - 16, y + h, 8, 8);
            } else {
                ctx.fillRect(x + 8, y + h, 8, 8);
                ctx.fillRect(x + w - 16, y + h, 8, 12);
            }
        } else {
            ctx.fillStyle = COLORS.dino;
            ctx.fillRect(x + 8, y + h, 8, 10);
            ctx.fillRect(x + w - 16, y + h, 8, 10);
        }
    }

    // ===== Obstacle Drawing =====
    function spawnObstacle() {
        const type = Math.random();
        if (type < 0.65) {
            // cactus (ground)
            const h = 30 + Math.random() * 35;
            const w = 14 + Math.random() * 16;
            obstacles.push({
                type: 'cactus',
                x: W() + 50,
                y: groundY() - h,
                w, h,
            });
        } else {
            // bird (flying)
            const flyH = groundY() - 50 - Math.random() * 60;
            obstacles.push({
                type: 'bird',
                x: W() + 50,
                y: flyH,
                w: 36, h: 24,
                wingPhase: 0,
            });
        }
    }

    function drawObstacle(ob) {
        if (ob.type === 'cactus') {
            ctx.shadowColor = COLORS.obstacleGlow;
            ctx.shadowBlur = 10;
            ctx.fillStyle = COLORS.obstacle;
            ctx.beginPath();
            roundRect(ctx, ob.x, ob.y, ob.w, ob.h, 4);
            ctx.fill();
            ctx.shadowBlur = 0;

            // cactus arms
            const armW = 8;
            ctx.fillStyle = COLORS.obstacle;
            ctx.fillRect(ob.x - armW, ob.y + ob.h * 0.3, armW, 6);
            ctx.fillRect(ob.x - armW, ob.y + ob.h * 0.3 - 10, 6, 12);
            ctx.fillRect(ob.x + ob.w, ob.y + ob.h * 0.5, armW, 6);
            ctx.fillRect(ob.x + ob.w + armW - 6, ob.y + ob.h * 0.5 - 8, 6, 10);
        } else {
            // bird
            ctx.shadowColor = COLORS.birdGlow;
            ctx.shadowBlur = 10;
            ctx.fillStyle = COLORS.bird;

            // body
            ctx.beginPath();
            roundRect(ctx, ob.x, ob.y, ob.w, ob.h * 0.6, 6);
            ctx.fill();
            ctx.shadowBlur = 0;

            // wings
            ob.wingPhase += 0.15;
            const wingY = Math.sin(ob.wingPhase) * 8;
            ctx.fillStyle = COLORS.bird;
            ctx.beginPath();
            ctx.moveTo(ob.x + 6, ob.y + ob.h * 0.3);
            ctx.lineTo(ob.x + ob.w / 2, ob.y - 8 + wingY);
            ctx.lineTo(ob.x + ob.w - 6, ob.y + ob.h * 0.3);
            ctx.fill();

            // eye
            ctx.fillStyle = '#fff';
            ctx.fillRect(ob.x + ob.w - 10, ob.y + 3, 5, 5);
        }
    }

    // ===== Ground =====
    function drawGround(dt) {
        const gy = groundY();
        groundOffset = (groundOffset + gameSpeed * dt) % 40;

        // ground plane
        ctx.fillStyle = COLORS.ground;
        ctx.fillRect(0, gy, W(), H() - gy);

        // top line
        ctx.strokeStyle = COLORS.groundLine;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W(), gy);
        ctx.stroke();

        // dashes
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let x = -groundOffset; x < W(); x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, gy + 10);
            ctx.lineTo(x + 20, gy + 10);
            ctx.stroke();
        }
    }

    // ===== Collision =====
    function checkCollision() {
        const d = dino;
        const dh = d.ducking ? 30 : d.h;
        const dy = d.ducking ? d.y + 20 : d.y;
        const pad = 6;

        for (const ob of obstacles) {
            if (
                d.x + d.w - pad > ob.x + pad &&
                d.x + pad < ob.x + ob.w - pad &&
                dy + dh - pad > ob.y + pad &&
                dy + pad < ob.y + ob.h - pad
            ) {
                return true;
            }
        }
        return false;
    }

    // ===== Update =====
    function update(dt) {
        // dino physics
        if (!dino.grounded) {
            dino.vy += GRAVITY * dt;
            dino.y += dino.vy * dt;
            if (dino.y >= groundY() - dino.h) {
                dino.y = groundY() - dino.h;
                dino.vy = 0;
                dino.grounded = true;
            }
        }

        // obstacles
        obstacleTimer += dt;
        if (obstacleTimer >= nextObstacleInterval) {
            spawnObstacle();
            obstacleTimer = 0;
            nextObstacleInterval = randomInterval();
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].x -= gameSpeed * dt;
            if (obstacles[i].x + obstacles[i].w < -20) {
                obstacles.splice(i, 1);
            }
        }

        // score & speed
        distScore += dt * 10;
        gameSpeed += dt * 8; // gradually faster

        // collision
        if (checkCollision()) {
            gameOver();
        }
    }

    function jump() {
        if (state !== 'PLAY') return;
        if (!dino.grounded) return;
        dino.vy = JUMP_VELOCITY;
        dino.grounded = false;
        dino.ducking = false;
    }

    function duck(active) {
        if (state !== 'PLAY') return;
        dino.ducking = active;
    }

    function gameOver() {
        state = 'OVER';
        const s = Math.floor(distScore);
        if (s > bestScore) {
            bestScore = s;
            localStorage.setItem('dino_best', bestScore);
        }
    }

    // ===== Drawing: UI =====
    function drawHUD() {
        const s = Math.floor(distScore);
        ctx.font = "600 14px 'Press Start 2P', monospace";
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'right';
        const str = String(s).padStart(5, '0');
        ctx.fillText(str, W() - 20, 36);

        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText(`HI ${String(bestScore).padStart(5, '0')}`, W() - 20, 56);
        ctx.textAlign = 'left';
    }

    function drawStartScreen() {
        ctx.fillStyle = 'rgba(12,12,29,0.85)';
        ctx.fillRect(0, 0, W(), H());
        drawOrbs();

        const cx = W() / 2, cy = H() / 2;

        ctx.font = "bold 52px 'Inter', sans-serif";
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';
        ctx.fillText('🦖', cx, cy - 60);

        ctx.font = "800 28px 'Inter', sans-serif";
        ctx.fillText('공룡 점프', cx, cy);

        ctx.font = "500 15px 'Pretendard Variable', sans-serif";
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText('스페이스바 또는 탭하여 점프', cx, cy + 35);

        ctx.font = "600 14px 'Press Start 2P', monospace";
        ctx.fillStyle = COLORS.accent;
        const pulse = 0.6 + Math.sin(Date.now() / 400) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.fillText('TAP OR SPACE TO START', cx, cy + 80);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    function drawOverScreen() {
        ctx.fillStyle = 'rgba(12,12,29,0.82)';
        ctx.fillRect(0, 0, W(), H());

        const cx = W() / 2, cy = H() / 2;
        const s = Math.floor(distScore);

        ctx.font = "800 32px 'Inter', sans-serif";
        ctx.fillStyle = COLORS.obstacle;
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', cx, cy - 40);

        ctx.font = "600 18px 'Press Start 2P', monospace";
        ctx.fillStyle = COLORS.text;
        ctx.fillText(`SCORE  ${String(s).padStart(5, '0')}`, cx, cy + 10);

        if (s >= bestScore && s > 0) {
            ctx.font = "600 12px 'Press Start 2P', monospace";
            ctx.fillStyle = COLORS.accent;
            ctx.fillText('🏆 NEW BEST!', cx, cy + 40);
        }

        ctx.font = "500 14px 'Pretendard Variable', sans-serif";
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText('탭하거나 스페이스를 눌러 재시작', cx, cy + 80);
        ctx.textAlign = 'left';
    }

    // ===== Home Button =====
    function drawHomeBtn() {
        const size = 44, m = 12;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        roundRect(ctx, m, m, size, size, 14);
        ctx.fill();
        ctx.stroke();
        ctx.font = '22px sans-serif';
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏠', m + size / 2, m + size / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
    function isHomeClick(x, y) { return x >= 12 && x <= 56 && y >= 12 && y <= 56; }

    // ===== Helpers =====
    function roundRect(c, x, y, w, h, r) {
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
    }

    // ===== Main Loop =====
    let lastTime = 0;

    function loop(ts) {
        requestAnimationFrame(loop);
        const dt = Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;

        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, W(), H());
        drawOrbs();
        drawStars(ts);

        if (state === 'START') {
            drawGround(0);
            drawStartScreen();
            drawHomeBtn();
            return;
        }

        if (state === 'PLAY') {
            update(dt);
        }

        drawGround(dt);
        obstacles.forEach(drawObstacle);
        drawDino();
        drawHUD();
        drawHomeBtn();

        if (state === 'OVER') {
            drawOverScreen();
        }
    }

    // ===== Input: Keyboard =====
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (state === 'START') { initGame(); state = 'PLAY'; return; }
            if (state === 'OVER') { initGame(); state = 'PLAY'; return; }
            jump();
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            duck(true);
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (state === 'START') { initGame(); state = 'PLAY'; }
            else if (state === 'OVER') { initGame(); state = 'PLAY'; }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowDown') {
            duck(false);
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
        if (state === 'START' || state === 'OVER') { initGame(); state = 'PLAY'; return; }
        jump();
    }, { passive: false });

    canvas.addEventListener('click', (e) => {
        if (isHomeClick(e.clientX, e.clientY)) {
            window.location.href = '../../index.html';
            return;
        }
        if (state === 'START' || state === 'OVER') { initGame(); state = 'PLAY'; return; }
        jump();
    });

    // Default key scroll prevention
    window.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });

    // ===== Init =====
    initGame();
    requestAnimationFrame(loop);
})();
