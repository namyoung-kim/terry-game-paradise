// ===== 테트리스 (Tetris) =====
(() => {
    'use strict';

    // ===== Canvas Setup =====
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // ===== Board Constants (must be declared before resize/calcBoard) =====
    const COLS = 10;
    const ROWS = 20;
    let cellSize, boardX, boardY, boardW, boardH;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        calcBoard();
    }
    window.addEventListener('resize', resize);
    resize();

    function W() { return canvas.width; }
    function H() { return canvas.height; }

    // ===== Colors =====
    const COLORS = {
        bg: '#0c0c1d',
        boardBg: 'rgba(255,255,255,0.02)',
        grid: 'rgba(255,255,255,0.04)',
        text: '#f0f0f5',
        textSecondary: 'rgba(240,240,245,0.6)',
        textMuted: 'rgba(240,240,245,0.35)',
        accent: '#a78bfa',
        accentPink: '#f472b6',
        ghost: 'rgba(255,255,255,0.08)',
        ghostBorder: 'rgba(255,255,255,0.15)',
    };

    // Tetromino colors
    const PIECE_COLORS = {
        I: { main: '#60a5fa', light: '#93c5fd', glow: 'rgba(96,165,250,0.3)' },
        O: { main: '#fbbf24', light: '#fcd34d', glow: 'rgba(251,191,36,0.3)' },
        T: { main: '#a78bfa', light: '#c4b5fd', glow: 'rgba(167,139,250,0.3)' },
        S: { main: '#34d399', light: '#6ee7b7', glow: 'rgba(52,211,153,0.3)' },
        Z: { main: '#f472b6', light: '#f9a8d4', glow: 'rgba(244,114,182,0.3)' },
        L: { main: '#fb923c', light: '#fdba74', glow: 'rgba(251,146,60,0.3)' },
        J: { main: '#60a5fa', light: '#93c5fd', glow: 'rgba(96,165,250,0.3)' },
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
        const count = Math.floor((W() * H()) / 10000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * W(),
                y: Math.random() * H(),
                r: Math.random() * 1.2 + 0.3,
                a: Math.random() * 0.4 + 0.15,
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

    // (Board constants COLS, ROWS, cellSize etc. declared above resize)

    function calcBoard() {
        const touchCtrl = document.getElementById('touchControls');
        const isMobile = window.innerWidth <= 768;
        const reserveBottom = isMobile ? 140 : 20;
        const reserveTop = 20;

        const availH = H() - reserveTop - reserveBottom;
        const availW = W() * 0.55; // leave room for side panels

        cellSize = Math.floor(Math.min(availH / ROWS, availW / COLS));
        boardW = cellSize * COLS;
        boardH = cellSize * ROWS;
        boardX = Math.floor((W() - boardW) / 2);
        boardY = Math.floor((H() - reserveBottom - boardH) / 2) + reserveTop / 2;
    }

    // ===== Tetromino Definitions =====
    const SHAPES = {
        I: [[0, 0], [1, 0], [2, 0], [3, 0]],
        O: [[0, 0], [1, 0], [0, 1], [1, 1]],
        T: [[0, 0], [1, 0], [2, 0], [1, 1]],
        S: [[1, 0], [2, 0], [0, 1], [1, 1]],
        Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
        L: [[0, 0], [0, 1], [1, 1], [2, 1]],
        J: [[2, 0], [0, 1], [1, 1], [2, 1]],
    };

    const PIECE_TYPES = Object.keys(SHAPES);

    // ===== Game State =====
    let state = 'START'; // START, PLAY, OVER
    let board; // 2D array [row][col] = null or piece type
    let current, currentType, currentX, currentY;
    let nextType;
    let score, level, lines, bestScore;
    let dropTimer, dropInterval;
    let lockTimer, lockDelay;
    let clearingLines, clearTimer;

    bestScore = parseInt(localStorage.getItem('tetris_best') || '0');

    function initGame() {
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        score = 0;
        level = 1;
        lines = 0;
        dropTimer = 0;
        lockTimer = 0;
        lockDelay = 0.5;
        clearingLines = [];
        clearTimer = 0;
        nextType = randomPiece();
        spawnPiece();
        calcDropInterval();
    }

    function calcDropInterval() {
        // Speed increases with level
        dropInterval = Math.max(0.05, 1.0 - (level - 1) * 0.08);
    }

    function randomPiece() {
        return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    }

    function spawnPiece() {
        currentType = nextType;
        nextType = randomPiece();
        current = SHAPES[currentType].map(([x, y]) => [x, y]);
        currentX = Math.floor((COLS - 4) / 2);
        currentY = 0;
        lockTimer = 0;

        // Check game over
        if (!isValid(current, currentX, currentY)) {
            gameOver();
        }
    }

    // ===== Piece Movement =====
    function isValid(shape, ox, oy) {
        for (const [sx, sy] of shape) {
            const nx = ox + sx;
            const ny = oy + sy;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
            if (ny >= 0 && board[ny][nx] !== null) return false;
        }
        return true;
    }

    function moveLeft() {
        if (isValid(current, currentX - 1, currentY)) {
            currentX--;
            lockTimer = 0;
        }
    }

    function moveRight() {
        if (isValid(current, currentX + 1, currentY)) {
            currentX++;
            lockTimer = 0;
        }
    }

    function moveDown() {
        if (isValid(current, currentX, currentY + 1)) {
            currentY++;
            lockTimer = 0;
            return true;
        }
        return false;
    }

    function hardDrop() {
        while (isValid(current, currentX, currentY + 1)) {
            currentY++;
            score += 2;
        }
        lockPiece();
    }

    function rotate() {
        // Rotate 90° clockwise
        const rotated = current.map(([x, y]) => [-y, x]);
        // Normalize to positive coordinates
        const minX = Math.min(...rotated.map(([x]) => x));
        const minY = Math.min(...rotated.map(([, y]) => y));
        const normalized = rotated.map(([x, y]) => [x - minX, y - minY]);

        // Wall kick offsets to try
        const kicks = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
        for (const [kx, ky] of kicks) {
            if (isValid(normalized, currentX + kx, currentY + ky)) {
                current = normalized;
                currentX += kx;
                currentY += ky;
                lockTimer = 0;
                return;
            }
        }
    }

    // ===== Ghost Piece =====
    function getGhostY() {
        let gy = currentY;
        while (isValid(current, currentX, gy + 1)) gy++;
        return gy;
    }

    // ===== Lock & Clear =====
    function lockPiece() {
        for (const [sx, sy] of current) {
            const nx = currentX + sx;
            const ny = currentY + sy;
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
                board[ny][nx] = currentType;
            }
        }

        // Check full lines
        const fullLines = [];
        for (let r = 0; r < ROWS; r++) {
            if (board[r].every(c => c !== null)) {
                fullLines.push(r);
            }
        }

        if (fullLines.length > 0) {
            clearingLines = fullLines;
            clearTimer = 0.3; // animation duration
            // Score
            const lineScores = [0, 100, 300, 500, 800];
            score += (lineScores[fullLines.length] || 800) * level;
            lines += fullLines.length;
            level = Math.floor(lines / 10) + 1;
            calcDropInterval();
        } else {
            spawnPiece();
        }
    }

    function finishClear() {
        // Remove lines — splice all first, then unshift empty rows
        const sorted = clearingLines.sort((a, b) => b - a);
        for (const row of sorted) {
            board.splice(row, 1);
        }
        for (let i = 0; i < sorted.length; i++) {
            board.unshift(Array(COLS).fill(null));
        }
        clearingLines = [];
        spawnPiece();
    }

    // ===== Game Over =====
    function gameOver() {
        state = 'OVER';
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('tetris_best', bestScore.toString());
        }
    }

    // ===== Update =====
    function update(dt) {
        if (state !== 'PLAY') return;

        // Line clear animation
        if (clearingLines.length > 0) {
            clearTimer -= dt;
            if (clearTimer <= 0) {
                finishClear();
            }
            return;
        }

        // Drop
        dropTimer += dt;
        if (dropTimer >= dropInterval) {
            dropTimer = 0;
            if (!moveDown()) {
                // Can't move down — start lock timer
                lockTimer += dropInterval;
                if (lockTimer >= lockDelay) {
                    lockPiece();
                }
            }
        }
    }

    // ===== Drawing: Board =====
    function drawBoard() {
        // Board background
        ctx.fillStyle = COLORS.boardBg;
        ctx.fillRect(boardX, boardY, boardW, boardH);

        // Board border
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(boardX, boardY, boardW, boardH);

        // Grid lines
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;
        for (let c = 1; c < COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(boardX + c * cellSize, boardY);
            ctx.lineTo(boardX + c * cellSize, boardY + boardH);
            ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(boardX, boardY + r * cellSize);
            ctx.lineTo(boardX + boardW, boardY + r * cellSize);
            ctx.stroke();
        }

        // Locked pieces
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] !== null) {
                    // Check if this row is being cleared
                    const isClearing = clearingLines.includes(r);
                    if (isClearing) {
                        const flashPhase = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
                        ctx.globalAlpha = flashPhase;
                    }
                    drawCell(c, r, board[r][c]);
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    function drawCell(col, row, type) {
        const x = boardX + col * cellSize;
        const y = boardY + row * cellSize;
        const pad = 1;
        const cs = cellSize - pad * 2;
        const colors = PIECE_COLORS[type];

        // Glow
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 8;

        // Main fill
        const grad = ctx.createLinearGradient(x, y, x, y + cs);
        grad.addColorStop(0, colors.light);
        grad.addColorStop(1, colors.main);
        ctx.fillStyle = grad;
        roundRect(ctx, x + pad, y + pad, cs, cs, 3, true);

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + pad + 2, y + pad + 2, cs - 4, cs * 0.3);

        ctx.shadowBlur = 0;
    }

    // ===== Drawing: Current Piece =====
    function drawCurrentPiece() {
        if (clearingLines.length > 0) return;

        // Ghost
        const ghostY = getGhostY();
        if (ghostY !== currentY) {
            for (const [sx, sy] of current) {
                const gx = boardX + (currentX + sx) * cellSize;
                const gy = boardY + (ghostY + sy) * cellSize;
                const pad = 1;
                const cs = cellSize - pad * 2;

                ctx.fillStyle = COLORS.ghost;
                roundRect(ctx, gx + pad, gy + pad, cs, cs, 3, true);
                ctx.strokeStyle = COLORS.ghostBorder;
                ctx.lineWidth = 1;
                roundRect(ctx, gx + pad, gy + pad, cs, cs, 3, false, true);
            }
        }

        // Actual piece
        for (const [sx, sy] of current) {
            if (currentY + sy >= 0) {
                drawCell(currentX + sx, currentY + sy, currentType);
            }
        }
    }

    // ===== Drawing: Next Piece Preview =====
    function drawNextPreview() {
        const previewSize = cellSize * 0.7;
        const shape = SHAPES[nextType];
        const maxX = Math.max(...shape.map(([x]) => x));
        const maxY = Math.max(...shape.map(([, y]) => y));
        const pw = (maxX + 1) * previewSize;
        const ph = (maxY + 1) * previewSize;

        // Position: right of board
        const px = boardX + boardW + 20;
        const py = boardY + 10;

        // Label
        const labelSize = Math.max(10, cellSize * 0.4);
        ctx.font = `600 ${labelSize}px 'Pretendard Variable', sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText('NEXT', px, py);

        // Background panel
        const panelW = previewSize * 5;
        const panelH = previewSize * 4;
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        roundRect(ctx, px - 5, py + labelSize + 8, panelW, panelH, 8, true);
        roundRect(ctx, px - 5, py + labelSize + 8, panelW, panelH, 8, false, true);

        // Draw preview blocks
        const cx = px - 5 + (panelW - pw) / 2;
        const cy = py + labelSize + 8 + (panelH - ph) / 2;

        const colors = PIECE_COLORS[nextType];
        for (const [sx, sy] of shape) {
            const bx = cx + sx * previewSize;
            const by = cy + sy * previewSize;
            const pad = 1;
            const cs = previewSize - pad * 2;

            ctx.shadowColor = colors.glow;
            ctx.shadowBlur = 5;
            const grad = ctx.createLinearGradient(bx, by, bx, by + cs);
            grad.addColorStop(0, colors.light);
            grad.addColorStop(1, colors.main);
            ctx.fillStyle = grad;
            roundRect(ctx, bx + pad, by + pad, cs, cs, 2, true);
            ctx.shadowBlur = 0;
        }
    }

    // ===== Drawing: Score Panel =====
    function drawScorePanel() {
        const px = boardX + boardW + 20;
        const py = boardY + cellSize * 5;
        const labelSize = Math.max(10, cellSize * 0.35);
        const valueSize = Math.max(14, cellSize * 0.55);

        const items = [
            { label: 'SCORE', value: score.toLocaleString() },
            { label: 'LEVEL', value: level },
            { label: 'LINES', value: lines },
            { label: 'BEST', value: bestScore.toLocaleString() },
        ];

        items.forEach((item, i) => {
            const iy = py + i * (valueSize + labelSize + 16);

            ctx.font = `600 ${labelSize}px 'Pretendard Variable', sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = COLORS.textMuted;
            ctx.fillText(item.label, px, iy);

            ctx.font = `700 ${valueSize}px 'Inter', sans-serif`;
            ctx.fillStyle = COLORS.text;
            ctx.fillText(item.value, px, iy + labelSize + 4);
        });
    }

    // ===== Drawing: Start Screen =====
    function drawStartScreen() {
        const titleSize = Math.max(24, Math.min(W(), H()) * 0.05);
        ctx.font = `800 ${titleSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.text;
        ctx.fillText('🧱 테트리스', W() / 2, H() * 0.32);

        const subSize = Math.max(12, titleSize * 0.4);
        ctx.font = `500 ${subSize}px 'Pretendard Variable', sans-serif`;
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText('블록을 쌓아 줄을 완성해라!', W() / 2, H() * 0.40);

        const hintSize = Math.max(10, titleSize * 0.32);
        ctx.font = `600 ${hintSize}px 'Pretendard Variable', sans-serif`;
        ctx.fillStyle = COLORS.textMuted;

        const isMobile = 'ontouchstart' in window;
        const msg = isMobile ? '화면을 탭하여 시작' : 'Enter / 클릭으로 시작';

        const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        ctx.fillText(msg, W() / 2, H() * 0.52);
        ctx.globalAlpha = 1;

        // Draw demo blocks
        const demoTypes = ['I', 'T', 'S', 'O', 'Z'];
        const demoSize = Math.max(12, titleSize * 0.4);
        demoTypes.forEach((type, i) => {
            const shape = SHAPES[type];
            const colors = PIECE_COLORS[type];
            const cx = W() / 2 + (i - 2) * (demoSize * 4 + 12);
            const cy = H() * 0.62;

            const float = Math.sin(Date.now() * 0.002 + i * 1.3) * 6;

            shape.forEach(([sx, sy]) => {
                const bx = cx + sx * demoSize;
                const by = cy + sy * demoSize + float;
                ctx.shadowColor = colors.glow;
                ctx.shadowBlur = 6;
                ctx.fillStyle = colors.main;
                roundRect(ctx, bx, by, demoSize - 1, demoSize - 1, 2, true);
                ctx.shadowBlur = 0;
            });
        });
    }

    // ===== Drawing: Game Over Screen =====
    function drawOverScreen() {
        ctx.fillStyle = 'rgba(12,12,29,0.7)';
        ctx.fillRect(0, 0, W(), H());

        const titleSize = Math.max(22, Math.min(W(), H()) * 0.045);

        ctx.font = `800 ${titleSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.accentPink;
        ctx.fillText('GAME OVER', W() / 2, H() * 0.28);

        const scoreSize = Math.max(32, titleSize * 1.5);
        ctx.font = `800 ${scoreSize}px 'Inter', sans-serif`;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(score.toLocaleString(), W() / 2, H() * 0.40);

        const labelSize = Math.max(10, titleSize * 0.4);
        ctx.font = `500 ${labelSize}px 'Pretendard Variable', sans-serif`;
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText('점수', W() / 2, H() * 0.34);

        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText(`레벨 ${level}  |  ${lines}줄  |  최고 ${bestScore.toLocaleString()}`, W() / 2, H() * 0.49);

        const hintSize = Math.max(10, titleSize * 0.35);
        ctx.font = `600 ${hintSize}px 'Pretendard Variable', sans-serif`;
        const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = COLORS.accent;

        const isMobile = 'ontouchstart' in window;
        ctx.fillText(isMobile ? '탭하여 다시 시작' : 'Enter / 클릭으로 다시 시작', W() / 2, H() * 0.58);
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
            drawStartScreen();
            drawHomeBtn();
        } else if (state === 'PLAY') {
            update(dt);
            drawBoard();
            drawCurrentPiece();
            drawNextPreview();
            drawScorePanel();
            drawHomeBtn();
        } else if (state === 'OVER') {
            drawBoard();
            drawOverScreen();
            drawHomeBtn();
        }

        requestAnimationFrame(loop);
    }

    // ===== Input: Keyboard =====
    let dasTimer = 0;
    let dasDirection = null;
    const DAS_DELAY = 0.17;
    const DAS_RATE = 0.05;

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (e.key === ' ' && state === 'PLAY' && clearingLines.length === 0) { hardDrop(); return; }
            if (state === 'START') { initGame(); state = 'PLAY'; showTouchControls(true); return; }
            if (state === 'OVER') { initGame(); state = 'PLAY'; showTouchControls(true); return; }
        }

        if (state !== 'PLAY') return;
        if (clearingLines.length > 0) return; // block input during clear animation

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                moveLeft();
                break;
            case 'ArrowRight':
                e.preventDefault();
                moveRight();
                break;
            case 'ArrowDown':
                e.preventDefault();
                moveDown();
                score += 1;
                break;
            case 'ArrowUp':
            case 'z':
            case 'Z':
                e.preventDefault();
                rotate();
                break;
            case 'Escape':
                window.location.href = '../../index.html';
                break;
        }
    });

    // ===== Input: Touch Controls =====
    const touchControls = document.getElementById('touchControls');
    const touchBtns = document.querySelectorAll('.touch-btn');

    function showTouchControls(visible) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile && visible && state === 'PLAY') {
            touchControls.classList.remove('hidden');
        } else {
            touchControls.classList.add('hidden');
        }
    }

    // Action repeat for held buttons
    let touchRepeatId = null;

    touchBtns.forEach(btn => {
        const action = btn.dataset.action;

        function doAction() {
            if (state !== 'PLAY') return;
            if (clearingLines.length > 0) return; // block input during clear animation
            switch (action) {
                case 'left': moveLeft(); break;
                case 'right': moveRight(); break;
                case 'down': moveDown(); score += 1; break;
                case 'rotate': rotate(); break;
                case 'harddrop': hardDrop(); break;
            }
        }

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            doAction();

            // Repeat for directional buttons
            if (['left', 'right', 'down'].includes(action)) {
                clearInterval(touchRepeatId);
                touchRepeatId = setInterval(doAction, 80);
            }
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            clearInterval(touchRepeatId);
            touchRepeatId = null;
        }, { passive: false });

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    // ===== Input: Canvas click (for start/restart) =====
    canvas.addEventListener('click', (e) => {
        if (isHomeClick(e.clientX, e.clientY)) {
            window.location.href = '../../index.html';
            return;
        }
        if (state === 'START') { initGame(); state = 'PLAY'; showTouchControls(true); return; }
        if (state === 'OVER') { initGame(); state = 'PLAY'; showTouchControls(true); return; }
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        if (isHomeClick(t.clientX, t.clientY)) {
            window.location.href = '../../index.html';
            return;
        }
        if (state === 'START') { initGame(); state = 'PLAY'; showTouchControls(true); return; }
        if (state === 'OVER') { initGame(); state = 'PLAY'; showTouchControls(true); return; }
    }, { passive: false });

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
