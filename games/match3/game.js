// ===== 과일 매치 (Match-3 Puzzle) =====
(() => {
    'use strict';

    // ===== 상수 =====
    const ROWS = 8, COLS = 8;
    const GEM_TYPES = [
        { id: 0, color: '#e74c3c', emoji: '🔴', name: '빨강' },
        { id: 1, color: '#f39c12', emoji: '🟠', name: '주황' },
        { id: 2, color: '#27ae60', emoji: '🟢', name: '초록' },
        { id: 3, color: '#3498db', emoji: '🔵', name: '파랑' },
        { id: 4, color: '#9b59b6', emoji: '🟣', name: '보라' },
        { id: 5, color: '#ecf0f1', emoji: '⚪', name: '흰색' },
    ];
    const SPECIAL = { NONE: 0, STRIPE_H: 1, STRIPE_V: 2, BOMB: 3, RAINBOW: 4 };

    // ===== 30 스테이지 =====
    const STAGES = [];
    (function buildStages() {
        const colors = [0, 1, 2, 3, 4, 5];
        // 초급 1~5
        for (let i = 0; i < 5; i++) {
            STAGES.push({ moves: 30 - i, goals: [{ type: colors[i % 6], count: 15 + i * 3 }] });
        }
        // 초중급 6~10
        for (let i = 0; i < 5; i++) {
            STAGES.push({
                moves: 25 - i, goals: [
                    { type: colors[i % 6], count: 15 + i * 2 },
                    { type: colors[(i + 2) % 6], count: 15 + i * 2 },
                ]
            });
        }
        // 중급 11~15
        for (let i = 0; i < 5; i++) {
            STAGES.push({
                moves: 22 - i, goals: [
                    { type: colors[i % 6], count: 20 + i * 2 },
                    { type: 'score', count: 2000 + i * 500 },
                ]
            });
        }
        // 중상급 16~20
        for (let i = 0; i < 5; i++) {
            STAGES.push({
                moves: 20 - i, goals: [
                    { type: colors[i % 6], count: 18 + i * 2 },
                    { type: colors[(i + 1) % 6], count: 18 + i * 2 },
                    { type: colors[(i + 3) % 6], count: 15 + i * 2 },
                ]
            });
        }
        // 상급 21~25
        for (let i = 0; i < 5; i++) {
            STAGES.push({
                moves: 18 - i, goals: [
                    { type: colors[i % 6], count: 25 + i * 3 },
                    { type: colors[(i + 2) % 6], count: 25 + i * 3 },
                ]
            });
        }
        // 최상급 26~30
        for (let i = 0; i < 5; i++) {
            STAGES.push({
                moves: 15 - i, goals: [
                    { type: colors[i % 6], count: 30 + i * 3 },
                    { type: colors[(i + 1) % 6], count: 25 + i * 3 },
                    { type: 'score', count: 5000 + i * 1000 },
                ]
            });
        }
    })();

    // ===== DOM =====
    const $ = id => document.getElementById(id);
    const boardEl = $('board');
    const stageNum = $('stageNum');
    const movesNum = $('movesNum');
    const scoreNum = $('scoreNum');
    const goalDisplay = $('goalDisplay');
    const comboDisplay = $('comboDisplay');
    const comboText = $('comboText');

    // ===== 상태 =====
    let grid = [];       // grid[r][c] = { type, special }
    let score = 0;
    let moves = 0;
    let stage = 0;
    let goalProgress = {};
    let selected = null; // { r, c }
    let animating = false;
    let comboCount = 0;

    // ===== 그리드 초기화 =====
    function createGrid() {
        grid = [];
        for (let r = 0; r < ROWS; r++) {
            grid[r] = [];
            for (let c = 0; c < COLS; c++) {
                let type;
                do {
                    type = randType();
                } while (wouldMatch(r, c, type));
                grid[r][c] = { type, special: SPECIAL.NONE };
            }
        }
    }

    function randType() {
        return Math.floor(Math.random() * GEM_TYPES.length);
    }

    function wouldMatch(r, c, type) {
        // 가로 체크
        if (c >= 2 && grid[r][c - 1] && grid[r][c - 2] &&
            grid[r][c - 1].type === type && grid[r][c - 2].type === type) return true;
        // 세로 체크
        if (r >= 2 && grid[r - 1] && grid[r - 2] &&
            grid[r - 1][c] && grid[r - 2][c] &&
            grid[r - 1][c].type === type && grid[r - 2][c].type === type) return true;
        return false;
    }

    // ===== 렌더링 =====
    function renderBoard() {
        boardEl.innerHTML = '';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.r = r;
                cell.dataset.c = c;

                if (grid[r][c]) {
                    const gem = createGemEl(grid[r][c]);
                    cell.appendChild(gem);
                }

                cell.addEventListener('click', () => onCellClick(r, c));
                cell.addEventListener('touchstart', (e) => onTouchStart(e, r, c), { passive: false });

                boardEl.appendChild(cell);
            }
        }
    }

    function createGemEl(data) {
        const gem = document.createElement('div');
        gem.className = 'gem';

        if (data.special === SPECIAL.RAINBOW) {
            gem.classList.add('special-rainbow');
            gem.textContent = '🌈';
        } else {
            const gt = GEM_TYPES[data.type];
            gem.style.background = gt.color;
            gem.textContent = gt.emoji;

            if (data.special === SPECIAL.STRIPE_H || data.special === SPECIAL.STRIPE_V) {
                gem.classList.add('special-stripe');
            } else if (data.special === SPECIAL.BOMB) {
                gem.classList.add('special-bomb');
            }
        }
        return gem;
    }

    function updateCell(r, c) {
        const idx = r * COLS + c;
        const cell = boardEl.children[idx];
        if (!cell) return;
        cell.innerHTML = '';
        if (grid[r][c]) {
            const gem = createGemEl(grid[r][c]);
            cell.appendChild(gem);
        }
    }

    function renderHUD() {
        const sd = STAGES[stage % STAGES.length];
        stageNum.textContent = stage + 1;
        movesNum.textContent = moves;
        scoreNum.textContent = score;

        goalDisplay.innerHTML = '';
        sd.goals.forEach(g => {
            const tag = document.createElement('div');
            const key = g.type === 'score' ? 'score' : `color_${g.type}`;
            const curr = goalProgress[key] || 0;
            const done = curr >= g.count;
            tag.className = 'goal-tag' + (done ? ' done' : '');

            if (g.type === 'score') {
                tag.innerHTML = `⭐<span class="goal-count">${Math.min(curr, g.count)}/${g.count}</span>`;
            } else {
                const gt = GEM_TYPES[g.type];
                tag.innerHTML = `${gt.emoji}<span class="goal-count">${Math.min(curr, g.count)}/${g.count}</span>`;
            }
            goalDisplay.appendChild(tag);
        });
    }

    // ===== 게임 초기화 =====
    function initStage() {
        const sd = STAGES[stage % STAGES.length];
        moves = sd.moves;
        score = 0;
        goalProgress = {};
        selected = null;
        animating = false;
        comboCount = 0;

        createGrid();
        renderBoard();
        renderHUD();
    }

    // ===== 클릭/터치 =====
    let touchStartPos = null;

    function onCellClick(r, c) {
        if (animating) return;
        if (!grid[r][c]) return;

        if (!selected) {
            selected = { r, c };
            highlightSelected(r, c);
        } else {
            if (selected.r === r && selected.c === c) {
                clearSelection();
                return;
            }
            if (isAdjacent(selected.r, selected.c, r, c)) {
                trySwap(selected.r, selected.c, r, c);
                clearSelection();
            } else {
                clearSelection();
                selected = { r, c };
                highlightSelected(r, c);
            }
        }
    }

    function onTouchStart(e, r, c) {
        if (animating) return;
        e.preventDefault();
        touchStartPos = { r, c, x: e.touches[0].clientX, y: e.touches[0].clientY };

        const onMove = (e2) => {
            if (!touchStartPos) return;
            e2.preventDefault();
            const dx = e2.touches[0].clientX - touchStartPos.x;
            const dy = e2.touches[0].clientY - touchStartPos.y;
            const threshold = 20;

            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                let tr = touchStartPos.r, tc = touchStartPos.c;
                if (Math.abs(dx) > Math.abs(dy)) {
                    tc += dx > 0 ? 1 : -1;
                } else {
                    tr += dy > 0 ? 1 : -1;
                }
                if (tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS) {
                    clearSelection();
                    trySwap(touchStartPos.r, touchStartPos.c, tr, tc);
                }
                touchStartPos = null;
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onEnd);
            }
        };

        const onEnd = () => {
            if (touchStartPos) {
                onCellClick(touchStartPos.r, touchStartPos.c);
            }
            touchStartPos = null;
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    function isAdjacent(r1, c1, r2, c2) {
        return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
    }

    function highlightSelected(r, c) {
        const idx = r * COLS + c;
        boardEl.children[idx]?.classList.add('selected');
    }

    function clearSelection() {
        selected = null;
        document.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));
    }

    // ===== 스왑 =====
    async function trySwap(r1, c1, r2, c2) {
        if (animating) return;
        animating = true;

        // 특수+특수 조합 체크
        const a = grid[r1][c1], b = grid[r2][c2];
        if (a && b && a.special !== SPECIAL.NONE && b.special !== SPECIAL.NONE) {
            swap(r1, c1, r2, c2);
            moves--;
            await handleSpecialCombo(r1, c1, r2, c2, a, b);
            renderBoard();
            renderHUD();
            comboCount = 0;
            await cascadeLoop();
            checkEndCondition();
            animating = false;
            return;
        }

        // 일반 스왑
        swap(r1, c1, r2, c2);
        const matches = findAllMatches();

        if (matches && matches.cells && matches.cells.size > 0) {
            moves--;
            renderBoard();
            renderHUD();
            comboCount = 0;
            await processMatches(matches);
            await cascadeLoop();
            checkEndCondition();
        } else {
            // 되돌리기
            swap(r1, c1, r2, c2);
            renderBoard();
            shakeCell(r1, c1);
            shakeCell(r2, c2);
        }
        animating = false;
    }

    function swap(r1, c1, r2, c2) {
        const temp = grid[r1][c1];
        grid[r1][c1] = grid[r2][c2];
        grid[r2][c2] = temp;
    }

    function shakeCell(r, c) {
        const idx = r * COLS + c;
        const cell = boardEl.children[idx];
        if (cell) {
            cell.classList.add('shake');
            setTimeout(() => cell.classList.remove('shake'), 300);
        }
    }

    // ===== 매칭 탐지 =====
    function findAllMatches() {
        const matched = new Set();
        const specials = []; // { r, c, special }

        // 가로 스캔
        for (let r = 0; r < ROWS; r++) {
            let c = 0;
            while (c < COLS) {
                if (!grid[r][c]) { c++; continue; }
                const type = grid[r][c].type;
                let end = c + 1;
                while (end < COLS && grid[r][end] && grid[r][end].type === type) end++;
                const len = end - c;

                if (len >= 3) {
                    for (let i = c; i < end; i++) matched.add(`${r},${i}`);
                    if (len === 4) {
                        specials.push({ r, c: c + 1, special: SPECIAL.STRIPE_H, type });
                    } else if (len >= 5) {
                        specials.push({ r, c: c + 2, special: SPECIAL.RAINBOW, type });
                    }
                }
                c = end;
            }
        }

        // 세로 스캔
        for (let c = 0; c < COLS; c++) {
            let r = 0;
            while (r < ROWS) {
                if (!grid[r][c]) { r++; continue; }
                const type = grid[r][c].type;
                let end = r + 1;
                while (end < ROWS && grid[end][c] && grid[end][c].type === type) end++;
                const len = end - r;

                if (len >= 3) {
                    for (let i = r; i < end; i++) matched.add(`${i},${c}`);
                    if (len === 4) {
                        specials.push({ r: r + 1, c, special: SPECIAL.STRIPE_V, type });
                    } else if (len >= 5) {
                        specials.push({ r: r + 2, c, special: SPECIAL.RAINBOW, type });
                    }
                }
                r = end;
            }
        }

        // L/T형 탐지 (교차 지점)
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (!grid[r][c]) continue;
                const key = `${r},${c}`;
                if (!matched.has(key)) continue;

                // 이 셀이 가로+세로 모두 3개 이상의 일부인지 확인
                const type = grid[r][c].type;
                let hCount = 1, vCount = 1;
                let l = c - 1; while (l >= 0 && grid[r][l] && grid[r][l].type === type) { l--; hCount++; }
                let rr = c + 1; while (rr < COLS && grid[r][rr] && grid[r][rr].type === type) { rr++; hCount++; }
                let u = r - 1; while (u >= 0 && grid[u][c] && grid[u][c].type === type) { u--; vCount++; }
                let d = r + 1; while (d < ROWS && grid[d][c] && grid[d][c].type === type) { d++; vCount++; }

                if (hCount >= 3 && vCount >= 3) {
                    // L/T형 → 폭탄
                    specials.push({ r, c, special: SPECIAL.BOMB, type });
                }
            }
        }

        return matched.size > 0 ? { cells: matched, specials } : [];
    }

    // ===== 매칭 처리 =====
    async function processMatches(matchResult) {
        if (!matchResult || !matchResult.cells) return;

        comboCount++;
        const { cells, specials } = matchResult;

        // 점수 계산
        const baseScore = cells.size * 50;
        const comboMultiplier = Math.pow(1.5, comboCount - 1);
        const pts = Math.round(baseScore * comboMultiplier);
        score += pts;

        // 콤보 표시
        if (comboCount >= 2) showCombo(comboCount);

        // 목표 카운트
        cells.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            if (grid[r][c]) {
                const type = grid[r][c].type;
                const gKey = `color_${type}`;
                goalProgress[gKey] = (goalProgress[gKey] || 0) + 1;
            }
        });
        goalProgress['score'] = score;

        // 특수 아이템 발동 (매칭에 포함된 특수 아이템)
        const specialActivations = [];
        cells.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            if (grid[r][c] && grid[r][c].special !== SPECIAL.NONE) {
                specialActivations.push({ r, c, special: grid[r][c].special, type: grid[r][c].type });
            }
        });

        // 매칭된 셀 제거 (특수 아이템 생성 위치는 보존)
        const specialPositions = new Set(specials.map(s => `${s.r},${s.c}`));
        cells.forEach(key => {
            if (!specialPositions.has(key)) {
                const [r, c] = key.split(',').map(Number);
                grid[r][c] = null;
            }
        });

        // 특수 아이템 생성
        specials.forEach(s => {
            if (s.special === SPECIAL.RAINBOW) {
                grid[s.r][s.c] = { type: s.type, special: SPECIAL.RAINBOW };
            } else {
                grid[s.r][s.c] = { type: s.type, special: s.special };
            }
        });

        // 특수 아이템 발동
        for (const sa of specialActivations) {
            await activateSpecial(sa.r, sa.c, sa.special, sa.type);
        }

        renderBoard();
        renderHUD();
        await delay(200);
    }

    // ===== 특수 아이템 발동 =====
    async function activateSpecial(r, c, special, type) {
        const toRemove = new Set();

        switch (special) {
            case SPECIAL.STRIPE_H:
                for (let cc = 0; cc < COLS; cc++) toRemove.add(`${r},${cc}`);
                break;
            case SPECIAL.STRIPE_V:
                for (let rr = 0; rr < ROWS; rr++) toRemove.add(`${rr},${c}`);
                break;
            case SPECIAL.BOMB:
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                            toRemove.add(`${nr},${nc}`);
                        }
                    }
                }
                break;
            case SPECIAL.RAINBOW:
                // 같은 종류 모두 제거
                for (let rr = 0; rr < ROWS; rr++) {
                    for (let cc = 0; cc < COLS; cc++) {
                        if (grid[rr][cc] && grid[rr][cc].type === type) {
                            toRemove.add(`${rr},${cc}`);
                        }
                    }
                }
                break;
        }

        toRemove.forEach(key => {
            const [rr, cc] = key.split(',').map(Number);
            if (grid[rr][cc]) {
                const gKey = `color_${grid[rr][cc].type}`;
                goalProgress[gKey] = (goalProgress[gKey] || 0) + 1;
                score += 30;
                grid[rr][cc] = null;
            }
        });
        goalProgress['score'] = score;
    }

    // ===== 특수+특수 조합 =====
    async function handleSpecialCombo(r1, c1, r2, c2, a, b) {
        const specials = [a.special, b.special].sort();
        const toRemove = new Set();

        if (specials[0] === SPECIAL.RAINBOW && specials[1] === SPECIAL.RAINBOW) {
            // 🌈+🌈 = 보드 전체
            for (let r = 0; r < ROWS; r++)
                for (let c = 0; c < COLS; c++) toRemove.add(`${r},${c}`);
        } else if (specials.includes(SPECIAL.RAINBOW)) {
            const other = a.special === SPECIAL.RAINBOW ? b : a;
            const rainbowTarget = other.type;
            if (other.special === SPECIAL.STRIPE_H || other.special === SPECIAL.STRIPE_V) {
                // 🔥+🌈 = 한 종류 모두 줄무늬로 → 폭발
                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        if (grid[r][c] && grid[r][c].type === rainbowTarget) {
                            // 줄 제거
                            for (let cc = 0; cc < COLS; cc++) toRemove.add(`${r},${cc}`);
                            for (let rr = 0; rr < ROWS; rr++) toRemove.add(`${rr},${c}`);
                        }
                    }
                }
            } else if (other.special === SPECIAL.BOMB) {
                // 💣+🌈 = 한 종류 모두 폭탄 → 폭발
                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        if (grid[r][c] && grid[r][c].type === rainbowTarget) {
                            for (let dr = -1; dr <= 1; dr++) {
                                for (let dc = -1; dc <= 1; dc++) {
                                    const nr = r + dr, nc = c + dc;
                                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                                        toRemove.add(`${nr},${nc}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else if (specials[0] === SPECIAL.BOMB && specials[1] === SPECIAL.BOMB) {
            // 💣+💣 = 5×5
            const cr = Math.floor((r1 + r2) / 2), cc = Math.floor((c1 + c2) / 2);
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const nr = cr + dr, nc = cc + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                        toRemove.add(`${nr},${nc}`);
                    }
                }
            }
        } else if ((specials[0] === SPECIAL.STRIPE_H || specials[0] === SPECIAL.STRIPE_V) &&
            specials[1] === SPECIAL.BOMB) {
            // 🔥+💣 = 3줄
            const cr = Math.floor((r1 + r2) / 2), cc = Math.floor((c1 + c2) / 2);
            for (let d = -1; d <= 1; d++) {
                for (let i = 0; i < COLS; i++) toRemove.add(`${cr + d},${i}`);
                for (let i = 0; i < ROWS; i++) toRemove.add(`${i},${cc + d}`);
            }
        } else {
            // 🔥+🔥 = 십자
            for (let i = 0; i < COLS; i++) toRemove.add(`${r1},${i}`);
            for (let i = 0; i < ROWS; i++) toRemove.add(`${i},${c1}`);
            for (let i = 0; i < COLS; i++) toRemove.add(`${r2},${i}`);
            for (let i = 0; i < ROWS; i++) toRemove.add(`${i},${c2}`);
        }

        // 제거
        toRemove.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c]) {
                const gKey = `color_${grid[r][c].type}`;
                goalProgress[gKey] = (goalProgress[gKey] || 0) + 1;
                score += 30;
                grid[r][c] = null;
            }
        });
        goalProgress['score'] = score;
    }

    // ===== 중력 낙하 + 채우기 =====
    function applyGravity() {
        let fell = false;
        for (let c = 0; c < COLS; c++) {
            let writeRow = ROWS - 1;
            for (let r = ROWS - 1; r >= 0; r--) {
                if (grid[r][c]) {
                    if (r !== writeRow) {
                        grid[writeRow][c] = grid[r][c];
                        grid[r][c] = null;
                        fell = true;
                    }
                    writeRow--;
                }
            }
            // 빈 칸 채우기
            for (let r = writeRow; r >= 0; r--) {
                grid[r][c] = { type: randType(), special: SPECIAL.NONE };
                fell = true;
            }
        }
        return fell;
    }

    // ===== 연쇄 루프 =====
    async function cascadeLoop() {
        let cascading = true;
        while (cascading) {
            applyGravity();
            renderBoard();
            await delay(250);

            const matches = findAllMatches();
            if (matches && matches.cells && matches.cells.size > 0) {
                await processMatches(matches);
            } else {
                cascading = false;
            }
        }
        comboCount = 0;
    }

    // ===== 게임 종료 체크 =====
    function checkEndCondition() {
        const sd = STAGES[stage % STAGES.length];
        const allGoalsDone = sd.goals.every(g => {
            const key = g.type === 'score' ? 'score' : `color_${g.type}`;
            return (goalProgress[key] || 0) >= g.count;
        });

        if (allGoalsDone) {
            setTimeout(() => showClear(), 400);
            return;
        }

        if (moves <= 0) {
            setTimeout(() => showGameOver(), 400);
        }
    }

    function showClear() {
        $('clearScore').textContent = `점수: ${score}`;
        const stars = score > 3000 ? '⭐⭐⭐' : score > 1500 ? '⭐⭐' : '⭐';
        $('clearStars').textContent = stars;
        $('clearScreen').classList.remove('hidden');
    }

    function showGameOver() {
        $('overScore').textContent = `점수: ${score}`;
        $('overScreen').classList.remove('hidden');
    }

    // ===== 콤보 표시 =====
    function showCombo(count) {
        comboText.textContent = `${count}× COMBO!`;
        comboDisplay.classList.remove('hidden');
        setTimeout(() => comboDisplay.classList.add('hidden'), 800);
    }

    // ===== 유틸 =====
    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ===== 이벤트 =====
    $('startBtn').addEventListener('click', () => {
        $('startScreen').classList.add('hidden');
        $('gameContainer').classList.remove('hidden');
        initStage();
    });

    $('nextStageBtn').addEventListener('click', () => {
        $('clearScreen').classList.add('hidden');
        stage++;
        initStage();
    });

    $('retryBtn').addEventListener('click', () => {
        $('overScreen').classList.add('hidden');
        initStage();
    });

    // 도움말
    $('helpBtn').addEventListener('click', () => $('helpScreen').classList.remove('hidden'));
    $('helpClose').addEventListener('click', () => $('helpScreen').classList.add('hidden'));
    $('helpOkBtn').addEventListener('click', () => $('helpScreen').classList.add('hidden'));
    $('helpScreen').addEventListener('click', e => {
        if (e.target === $('helpScreen')) $('helpScreen').classList.add('hidden');
    });

})();
