// ===== 뱀 게임 (Snake) =====
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

    // ===== Colors (from theme) =====
    const COLORS = {
        bg: '#0c0c1d',
        bgSecondary: '#12122b',
        grid: 'rgba(255,255,255,0.03)',
        snakeHead: '#a78bfa',
        snakeBody: '#7c5cd4',
        snakeGlow: 'rgba(167,139,250,0.4)',
        food: '#f472b6',
        foodGlow: 'rgba(244,114,182,0.5)',
        text: '#f0f0f5',
        textMuted: 'rgba(240,240,245,0.5)',
        accent: '#60a5fa',
        border: 'rgba(255,255,255,0.08)',
    };

    // ===== Orb background (synced with other games) =====
    const orbs = [
        { x: 0.2, y: 0.3, r: 180, color: 'rgba(167,139,250,0.08)' },
        { x: 0.8, y: 0.7, r: 220, color: 'rgba(244,114,182,0.06)' },
        { x: 0.5, y: 0.1, r: 150, color: 'rgba(96,165,250,0.06)' },
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

    // ===== Game State =====
    const GRID = 20; // cells
    let cellSize, offsetX, offsetY, boardSize;
    let snake, direction, nextDirection, food, score, bestScore, speed, moveTimer;
    let state = 'START'; // START, PLAY, OVER

    bestScore = parseInt(localStorage.getItem('snake_best') || '0');

    // D-pad height reservation for mobile
    const DPAD_BOTTOM_MARGIN = 24; // matches CSS bottom value

    function getDpadHeight() {
        const el = document.getElementById('dpad');
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        // If dpad is hidden (display:none), height is 0 — perfect for desktop
        return rect.height > 0 ? rect.height + DPAD_BOTTOM_MARGIN + 10 : 0;
    }

    function calcBoard() {
        const dpadH = getDpadHeight();
        const availH = H() - dpadH;
        const minDim = Math.min(W(), availH);
        boardSize = Math.floor(minDim * 0.85);
        cellSize = Math.floor(boardSize / GRID);
        boardSize = cellSize * GRID;
        offsetX = (W() - boardSize) / 2;
        offsetY = (availH - boardSize) / 2;
    }

    function initGame() {
        calcBoard();
        const mid = Math.floor(GRID / 2);
        snake = [
            { x: mid, y: mid },
            { x: mid - 1, y: mid },
            { x: mid - 2, y: mid },
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        speed = 130; // ms per move
        moveTimer = 0;
        placeFood();
    }

    function placeFood() {
        let pos;
        do {
            pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
        } while (snake.some(s => s.x === pos.x && s.y === pos.y));
        food = pos;
    }

    // ===== Game Logic =====
    function update() {
        direction = nextDirection;
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

        // wall collision
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
            gameOver();
            return;
        }
        // self collision
        if (snake.some(s => s.x === head.x && s.y === head.y)) {
            gameOver();
            return;
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score += 10;
            if (speed > 60) speed -= 2;
            placeFood();
        } else {
            snake.pop();
        }
    }

    function gameOver() {
        state = 'OVER';
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('snake_best', bestScore);
        }
    }

    // ===== Drawing =====
    function drawBoard() {
        // board background
        ctx.fillStyle = COLORS.bgSecondary;
        ctx.beginPath();
        roundRect(ctx, offsetX, offsetY, boardSize, boardSize, 12);
        ctx.fill();

        // grid lines
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;
        for (let i = 1; i < GRID; i++) {
            ctx.beginPath();
            ctx.moveTo(offsetX + i * cellSize, offsetY);
            ctx.lineTo(offsetX + i * cellSize, offsetY + boardSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY + i * cellSize);
            ctx.lineTo(offsetX + boardSize, offsetY + i * cellSize);
            ctx.stroke();
        }

        // border
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        roundRect(ctx, offsetX, offsetY, boardSize, boardSize, 12);
        ctx.stroke();
    }

    function drawSnake() {
        snake.forEach((seg, i) => {
            const x = offsetX + seg.x * cellSize;
            const y = offsetY + seg.y * cellSize;
            const pad = 1;

            if (i === 0) {
                // head glow
                ctx.shadowColor = COLORS.snakeGlow;
                ctx.shadowBlur = 14;
                ctx.fillStyle = COLORS.snakeHead;
            } else {
                ctx.shadowBlur = 0;
                const t = 1 - (i / snake.length) * 0.5;
                ctx.fillStyle = `rgba(124,92,212,${t})`;
            }

            ctx.beginPath();
            roundRect(ctx, x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, 4);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    }

    function drawFood() {
        const x = offsetX + food.x * cellSize + cellSize / 2;
        const y = offsetY + food.y * cellSize + cellSize / 2;
        const r = cellSize * 0.38;

        // glow
        ctx.shadowColor = COLORS.foodGlow;
        ctx.shadowBlur = 16;
        ctx.fillStyle = COLORS.food;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // inner bright
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawScore() {
        const y = offsetY - 14;
        ctx.font = "600 14px 'Press Start 2P', monospace";
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score}`, offsetX, y);
        ctx.textAlign = 'right';
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText(`BEST ${bestScore}`, offsetX + boardSize, y);
        ctx.textAlign = 'left';
    }

    function drawStartScreen() {
        ctx.fillStyle = 'rgba(12,12,29,0.85)';
        ctx.fillRect(0, 0, W(), H());
        drawOrbs();

        const cx = W() / 2, cy = H() / 2;

        ctx.font = "bold 48px 'Inter', sans-serif";
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';
        ctx.fillText('🐍', cx, cy - 60);

        ctx.font = "800 28px 'Inter', sans-serif";
        ctx.fillText('뱀 게임', cx, cy);

        ctx.font = "500 15px 'Pretendard Variable', sans-serif";
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText('방향키 또는 스와이프로 조종', cx, cy + 35);

        ctx.font = "600 14px 'Press Start 2P', monospace";
        ctx.fillStyle = COLORS.accent;
        const pulse = 0.6 + Math.sin(Date.now() / 400) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.fillText('TAP OR ENTER TO START', cx, cy + 80);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    function drawOverScreen() {
        ctx.fillStyle = 'rgba(12,12,29,0.82)';
        ctx.fillRect(0, 0, W(), H());

        const cx = W() / 2, cy = H() / 2;

        ctx.font = "800 32px 'Inter', sans-serif";
        ctx.fillStyle = COLORS.food;
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', cx, cy - 40);

        ctx.font = "600 18px 'Press Start 2P', monospace";
        ctx.fillStyle = COLORS.text;
        ctx.fillText(`SCORE  ${score}`, cx, cy + 10);

        if (score >= bestScore && score > 0) {
            ctx.font = "600 12px 'Press Start 2P', monospace";
            ctx.fillStyle = COLORS.accent;
            ctx.fillText('🏆 NEW BEST!', cx, cy + 40);
        }

        ctx.font = "500 14px 'Pretendard Variable', sans-serif";
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText('탭하거나 Enter를 눌러 재시작', cx, cy + 80);
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

    function isHomeClick(x, y) {
        return x >= 12 && x <= 56 && y >= 12 && y <= 56;
    }

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
        const dt = ts - lastTime;
        lastTime = ts;

        calcBoard();

        // clear
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, W(), H());
        drawOrbs();

        if (state === 'START') {
            drawStartScreen();
            drawHomeBtn();
            updateDpadVisibility();
            return;
        }

        // PLAY or OVER
        if (state === 'PLAY') {
            moveTimer += dt;
            while (moveTimer >= speed) {
                moveTimer -= speed;
                update();
                if (state === 'OVER') break;
            }
        }

        drawBoard();
        drawSnake();
        drawFood();
        drawScore();
        drawHomeBtn();

        if (state === 'OVER') {
            drawOverScreen();
        }

        updateDpadVisibility();
    }

    // ===== Input: Keyboard =====
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (state === 'START') { initGame(); state = 'PLAY'; }
            else if (state === 'OVER') { initGame(); state = 'PLAY'; }
            return;
        }
        if (state !== 'PLAY') return;
        switch (e.key) {
            case 'ArrowUp': if (direction.y === 0) nextDirection = { x: 0, y: -1 }; break;
            case 'ArrowDown': if (direction.y === 0) nextDirection = { x: 0, y: 1 }; break;
            case 'ArrowLeft': if (direction.x === 0) nextDirection = { x: -1, y: 0 }; break;
            case 'ArrowRight': if (direction.x === 0) nextDirection = { x: 1, y: 0 }; break;
        }
    });

    // ===== Input: Touch (swipe + tap) =====
    let touchStartX, touchStartY, touchStartTime;
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchStartTime = Date.now();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (!touchStartX) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        const dist = Math.hypot(dx, dy);
        const elapsed = Date.now() - touchStartTime;

        // home button
        if (dist < 10 && isHomeClick(touchStartX, touchStartY)) {
            window.location.href = '../../index.html';
            return;
        }

        if (state === 'START' || state === 'OVER') {
            if (dist < 30) { initGame(); state = 'PLAY'; }
            return;
        }

        // swipe detection
        if (dist > 30 && elapsed < 500) {
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && direction.x === 0) nextDirection = { x: 1, y: 0 };
                else if (dx < 0 && direction.x === 0) nextDirection = { x: -1, y: 0 };
            } else {
                if (dy > 0 && direction.y === 0) nextDirection = { x: 0, y: 1 };
                else if (dy < 0 && direction.y === 0) nextDirection = { x: 0, y: -1 };
            }
        }
    }, { passive: false });

    // ===== Input: Mouse click =====
    canvas.addEventListener('click', (e) => {
        if (isHomeClick(e.clientX, e.clientY)) {
            window.location.href = '../../index.html';
            return;
        }
        if (state === 'START' || state === 'OVER') {
            initGame();
            state = 'PLAY';
        }
    });

    // Default key scroll prevention
    window.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });

    // ===== Input: D-Pad (Mobile soft keys) =====
    const dpad = document.getElementById('dpad');
    const dpadBtns = document.querySelectorAll('.dpad-btn');

    function showDpad(visible) {
        if (dpad) {
            dpad.classList.toggle('visible', visible);
        }
    }

    // Direction map for D-pad buttons
    const DIR_MAP = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
    };

    dpadBtns.forEach(btn => {
        const dir = btn.dataset.dir;

        // Use touchstart for immediate response on mobile
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (state === 'START' || state === 'OVER') {
                initGame();
                state = 'PLAY';
                showDpad(true);
                return;
            }

            if (state !== 'PLAY') return;

            const d = DIR_MAP[dir];
            if (!d) return;

            // Prevent reversing direction (can't go opposite way)
            if (d.x !== 0 && direction.x === 0) {
                nextDirection = d;
            } else if (d.y !== 0 && direction.y === 0) {
                nextDirection = d;
            }
        }, { passive: false });

        // Also handle click for edge cases
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    // ===== D-Pad visibility: show when PLAY, hide otherwise =====
    // Integrate into the main loop
    function updateDpadVisibility() {
        showDpad(state === 'PLAY');
    }

    // ===== Init =====
    initGame();
    requestAnimationFrame(loop);
})();
