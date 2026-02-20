// ===== 보석 매치 (Match-3 Puzzle) =====
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

    // 장애물: ice(1~2겹), box(인접 매칭으로 파괴), chain(스왑불가, 인접 매칭으로 해제), stone(영구)
    const OBS = { NONE: 0, ICE1: 1, ICE2: 2, BOX: 3, CHAIN: 4, STONE: 5 };

    // ===== 30 스테이지 =====
    const STAGES = [];
    (function buildStages() {
        const colors = [0, 1, 2, 3, 4, 5];

        function randPositions(count, exclude) {
            const positions = [];
            const excludeSet = new Set(exclude ? exclude.map(e => `${e.r},${e.c}`) : []);
            while (positions.length < count) {
                const r = Math.floor(Math.random() * ROWS);
                const c = Math.floor(Math.random() * COLS);
                const key = `${r},${c}`;
                if (!excludeSet.has(key) && !positions.some(p => p.r === r && p.c === c)) {
                    positions.push({ r, c });
                }
            }
            return positions;
        }

        // 초급 1~5 (장애물 없음)
        for (let i = 0; i < 5; i++) {
            STAGES.push({ moves: 30 - i, goals: [{ type: colors[i % 6], count: 15 + i * 3 }], obstacles: [] });
        }
        // 초중급 6~10 (얼음 등장)
        for (let i = 0; i < 5; i++) {
            const iceCount = 3 + i * 2;
            STAGES.push({
                moves: 25 - i, goals: [
                    { type: colors[i % 6], count: 15 + i * 2 },
                    { type: colors[(i + 2) % 6], count: 15 + i * 2 },
                ],
                obstacleGen() {
                    return randPositions(iceCount, []).map(p => ({ ...p, type: OBS.ICE1 }));
                }
            });
        }
        // 중급 11~15 (얼음2겹 + 상자 등장)
        for (let i = 0; i < 5; i++) {
            const iceCount = 3 + i;
            const boxCount = 2 + i;
            STAGES.push({
                moves: 22 - i, goals: [
                    { type: colors[i % 6], count: 20 + i * 2 },
                    { type: 'score', count: 2000 + i * 500 },
                ],
                obstacleGen() {
                    const ices = randPositions(iceCount, []).map(p => ({ ...p, type: OBS.ICE2 }));
                    const boxes = randPositions(boxCount, ices).map(p => ({ ...p, type: OBS.BOX }));
                    return [...ices, ...boxes];
                }
            });
        }
        // 중상급 16~20 (체인 등장)
        for (let i = 0; i < 5; i++) {
            const chainCount = 3 + i;
            const iceCount = 2 + i;
            STAGES.push({
                moves: 20 - i, goals: [
                    { type: colors[i % 6], count: 18 + i * 2 },
                    { type: colors[(i + 1) % 6], count: 18 + i * 2 },
                    { type: colors[(i + 3) % 6], count: 15 + i * 2 },
                ],
                obstacleGen() {
                    const chains = randPositions(chainCount, []).map(p => ({ ...p, type: OBS.CHAIN }));
                    const ices = randPositions(iceCount, chains).map(p => ({ ...p, type: OBS.ICE1 }));
                    return [...chains, ...ices];
                }
            });
        }
        // 상급 21~25 (돌벽 + 혼합)
        for (let i = 0; i < 5; i++) {
            const stoneCount = 2 + Math.floor(i / 2);
            const chainCount = 2 + i;
            const iceCount = 2 + i;
            STAGES.push({
                moves: 18 - i, goals: [
                    { type: colors[i % 6], count: 25 + i * 3 },
                    { type: colors[(i + 2) % 6], count: 25 + i * 3 },
                ],
                obstacleGen() {
                    const stones = randPositions(stoneCount, []).map(p => ({ ...p, type: OBS.STONE }));
                    const chains = randPositions(chainCount, stones).map(p => ({ ...p, type: OBS.CHAIN }));
                    const ices = randPositions(iceCount, [...stones, ...chains]).map(p => ({ ...p, type: OBS.ICE2 }));
                    return [...stones, ...chains, ...ices];
                }
            });
        }
        // 최상급 26~30 (전체 혼합)
        for (let i = 0; i < 5; i++) {
            const stoneCount = 3 + Math.floor(i / 2);
            const boxCount = 2 + i;
            const chainCount = 2 + i;
            STAGES.push({
                moves: 15 - i, goals: [
                    { type: colors[i % 6], count: 30 + i * 3 },
                    { type: colors[(i + 1) % 6], count: 25 + i * 3 },
                    { type: 'score', count: 5000 + i * 1000 },
                ],
                obstacleGen() {
                    const stones = randPositions(stoneCount, []).map(p => ({ ...p, type: OBS.STONE }));
                    const boxes = randPositions(boxCount, stones).map(p => ({ ...p, type: OBS.BOX }));
                    const chains = randPositions(chainCount, [...stones, ...boxes]).map(p => ({ ...p, type: OBS.CHAIN }));
                    return [...stones, ...boxes, ...chains];
                }
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
    let grid = [];       // grid[r][c] = { type, special, obs }
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
                grid[r][c] = { type, special: SPECIAL.NONE, obs: OBS.NONE };
            }
        }
        // 장애물 배치
        const sd = STAGES[stage % STAGES.length];
        const obstacles = sd.obstacleGen ? sd.obstacleGen() : (sd.obstacles || []);
        obstacles.forEach(o => {
            if (o.type === OBS.STONE) {
                grid[o.r][o.c] = { type: -1, special: SPECIAL.NONE, obs: OBS.STONE };
            } else if (o.type === OBS.BOX) {
                grid[o.r][o.c] = { type: -1, special: SPECIAL.NONE, obs: OBS.BOX };
            } else {
                grid[o.r][o.c].obs = o.type;
            }
        });
    }

    function randType() {
        return Math.floor(Math.random() * GEM_TYPES.length);
    }

    function wouldMatch(r, c, type) {
        if (c >= 2 && grid[r][c - 1] && grid[r][c - 2] &&
            grid[r][c - 1].type === type && grid[r][c - 2].type === type) return true;
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
                    const data = grid[r][c];
                    if (data.obs === OBS.STONE) {
                        cell.classList.add('obs-stone');
                        cell.innerHTML = '<div class="gem obs-gem">🪨</div>';
                    } else if (data.obs === OBS.BOX) {
                        cell.classList.add('obs-box');
                        cell.innerHTML = '<div class="gem obs-gem">📦</div>';
                    } else {
                        const gem = createGemEl(data);
                        cell.appendChild(gem);
                        if (data.obs === OBS.ICE1) cell.classList.add('obs-ice1');
                        if (data.obs === OBS.ICE2) cell.classList.add('obs-ice2');
                        if (data.obs === OBS.CHAIN) cell.classList.add('obs-chain');
                    }
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
            if (gt) {
                gem.style.background = gt.color;
                gem.textContent = gt.emoji;
            }

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
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        if (grid[r][c]) {
            const data = grid[r][c];
            if (data.obs === OBS.STONE) {
                cell.classList.add('obs-stone');
                cell.innerHTML = '<div class="gem obs-gem">🪨</div>';
            } else if (data.obs === OBS.BOX) {
                cell.classList.add('obs-box');
                cell.innerHTML = '<div class="gem obs-gem">📦</div>';
            } else {
                const gem = createGemEl(data);
                cell.appendChild(gem);
                if (data.obs === OBS.ICE1) cell.classList.add('obs-ice1');
                if (data.obs === OBS.ICE2) cell.classList.add('obs-ice2');
                if (data.obs === OBS.CHAIN) cell.classList.add('obs-chain');
            }
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

        // 초기 보드에서 가능한 스왑이 없으면 셔플
        setTimeout(() => checkAndShuffle(), 300);
    }

    // ===== 클릭/터치 =====
    let touchStartPos = null;

    function onCellClick(r, c) {
        if (animating) return;
        if (!grid[r][c]) return;
        if (grid[r][c].obs === OBS.STONE || grid[r][c].obs === OBS.BOX) return;
        if (grid[r][c].obs === OBS.CHAIN) return;

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

    // ===== 스왑 애니메이션 헬퍼 =====
    function getCellEl(r, c) {
        return boardEl.children[r * COLS + c];
    }

    function getGemEl(r, c) {
        const cell = getCellEl(r, c);
        return cell ? cell.querySelector('.gem') : null;
    }

    async function animateSwap(r1, c1, r2, c2) {
        const cell1 = getCellEl(r1, c1);
        const cell2 = getCellEl(r2, c2);
        if (!cell1 || !cell2) return;

        const gem1 = cell1.querySelector('.gem');
        const gem2 = cell2.querySelector('.gem');
        if (!gem1 || !gem2) return;

        const dr = r2 - r1;
        const dc = c2 - c1;

        // 셀 하나 크기 계산
        const cellRect = cell1.getBoundingClientRect();
        const cellSize = cellRect.width + 3; // gap 포함

        const tx = dc * cellSize;
        const ty = dr * cellSize;

        gem1.style.transition = 'transform 0.25s cubic-bezier(.34,1.56,.64,1)';
        gem2.style.transition = 'transform 0.25s cubic-bezier(.34,1.56,.64,1)';
        gem1.style.transform = `translate(${tx}px, ${ty}px)`;
        gem2.style.transform = `translate(${-tx}px, ${-ty}px)`;
        gem1.style.zIndex = '10';
        gem2.style.zIndex = '10';

        await delay(260);

        gem1.style.transition = '';
        gem1.style.transform = '';
        gem1.style.zIndex = '';
        gem2.style.transition = '';
        gem2.style.transform = '';
        gem2.style.zIndex = '';
    }

    // ===== 매칭 제거 애니메이션 =====
    async function animateRemoval(cellKeys) {
        cellKeys.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const gem = getGemEl(r, c);
            if (gem) {
                gem.classList.add('matched');
                // 파티클 스폰
                spawnDomParticles(r, c);
            }
        });
        await delay(700);
    }

    // ===== DOM 파티클 효과 =====
    function spawnDomParticles(r, c) {
        const cell = getCellEl(r, c);
        if (!cell) return;
        const data = grid[r][c];
        const color = data && data.type >= 0 && GEM_TYPES[data.type] ? GEM_TYPES[data.type].color : '#a78bfa';

        for (let i = 0; i < 6; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const angle = (Math.PI * 2 / 6) * i;
            const dist = 20 + Math.random() * 25;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            p.style.setProperty('--tx', `${tx}px`);
            p.style.setProperty('--ty', `${ty}px`);
            p.style.background = color;
            cell.appendChild(p);
            setTimeout(() => p.remove(), 500);
        }
    }

    // ===== 낙하 애니메이션 =====
    function animateFalling(fallInfo) {
        if (!fallInfo || fallInfo.length === 0) return;
        // 먼저 낙하 전 위치로 gem을 오프셋
        fallInfo.forEach(info => {
            const gem = getGemEl(info.toR, info.toC);
            if (gem) {
                const cellEl = getCellEl(info.toR, info.toC);
                const cellH = cellEl ? cellEl.getBoundingClientRect().height + 3 : 50;
                const distance = (info.toR - info.fromR) * cellH;
                gem.style.transition = 'none';
                gem.style.transform = `translateY(${-distance}px)`;
                if (info.isNew) gem.style.opacity = '0.3';
            }
        });
        // force reflow
        boardEl.offsetHeight;
        // 그 다음 transition으로 원래 위치로 슬라이드
        fallInfo.forEach(info => {
            const gem = getGemEl(info.toR, info.toC);
            if (gem) {
                gem.classList.add('falling');
                gem.style.transform = 'translateY(0)';
                gem.style.opacity = '1';
            }
        });
        // transition 끝나면 클래스 제거
        setTimeout(() => {
            fallInfo.forEach(info => {
                const gem = getGemEl(info.toR, info.toC);
                if (gem) {
                    gem.classList.remove('falling');
                    gem.style.transition = '';
                    gem.style.transform = '';
                    gem.style.opacity = '';
                }
            });
        }, 370);
    }

    // ===== 특수 아이템 이펙트 =====
    function showSpecialEffect(type, r, c) {
        const effectEl = document.createElement('div');
        effectEl.className = 'special-effect';

        if (type === 'stripe_h') {
            effectEl.classList.add('effect-stripe-h');
            effectEl.style.top = `${(r / ROWS) * 100}%`;
        } else if (type === 'stripe_v') {
            effectEl.classList.add('effect-stripe-v');
            effectEl.style.left = `${(c / COLS) * 100}%`;
        } else if (type === 'bomb') {
            effectEl.classList.add('effect-bomb');
            const cell = getCellEl(r, c);
            if (cell) {
                const rect = cell.getBoundingClientRect();
                const boardRect = boardEl.getBoundingClientRect();
                effectEl.style.left = `${rect.left - boardRect.left + rect.width / 2}px`;
                effectEl.style.top = `${rect.top - boardRect.top + rect.height / 2}px`;
            }
        } else if (type === 'rainbow') {
            effectEl.classList.add('effect-rainbow');
        }

        boardEl.appendChild(effectEl);
        setTimeout(() => effectEl.remove(), 600);
    }

    // ===== 보드 플래시 효과 =====
    function flashBoard() {
        boardEl.classList.add('board-flash');
        setTimeout(() => boardEl.classList.remove('board-flash'), 400);
    }

    // ===== 스왑 =====
    async function trySwap(r1, c1, r2, c2) {
        if (animating) return;
        animating = true;

        const a = grid[r1][c1], b = grid[r2][c2];

        // ===== 무지개 + 일반 블록 (또는 무지개 + 특수) 처리 =====
        if (a && b) {
            const aIsRainbow = a.special === SPECIAL.RAINBOW;
            const bIsRainbow = b.special === SPECIAL.RAINBOW;

            // 양쪽 모두 특수 아이템 (둘 다 특수)
            if (a.special !== SPECIAL.NONE && b.special !== SPECIAL.NONE) {
                await animateSwap(r1, c1, r2, c2);
                swap(r1, c1, r2, c2);
                moves--;
                renderBoard();
                renderHUD();

                // 특수+특수 조합 이펙트
                flashBoard();
                await handleSpecialCombo(r1, c1, r2, c2, grid[r1][c1], grid[r2][c2]);
                renderBoard();
                renderHUD();
                comboCount = 0;
                await cascadeLoop();
                checkEndCondition();
                animating = false;
                return;
            }

            // 한쪽만 무지개 + 다른쪽 일반 블록
            if (aIsRainbow || bIsRainbow) {
                const rainbowR = aIsRainbow ? r1 : r2;
                const rainbowC = aIsRainbow ? c1 : c2;
                const otherR = aIsRainbow ? r2 : r1;
                const otherC = aIsRainbow ? c2 : c1;
                const targetType = grid[otherR][otherC].type;

                await animateSwap(r1, c1, r2, c2);
                swap(r1, c1, r2, c2);
                moves--;

                // 무지개 이펙트 표시
                showSpecialEffect('rainbow');
                flashBoard();

                // 해당 타입 전체 제거 + 무지개 자신도 제거
                const toRemove = new Set();
                toRemove.add(`${rainbowR},${rainbowC}`);
                for (let rr = 0; rr < ROWS; rr++) {
                    for (let cc = 0; cc < COLS; cc++) {
                        if (grid[rr][cc] && grid[rr][cc].type === targetType) {
                            toRemove.add(`${rr},${cc}`);
                        }
                    }
                }

                // 제거 애니메이션
                renderBoard();
                await animateRemoval(toRemove);

                // 점수 및 목표 계산
                comboCount = 1;
                toRemove.forEach(key => {
                    const [rr, cc] = key.split(',').map(Number);
                    if (grid[rr][cc]) {
                        if (grid[rr][cc].type >= 0) {
                            const gKey = `color_${grid[rr][cc].type}`;
                            goalProgress[gKey] = (goalProgress[gKey] || 0) + 1;
                        }
                        score += 50;
                        grid[rr][cc] = null;
                    }
                });
                goalProgress['score'] = score;

                renderBoard();
                renderHUD();
                await cascadeLoop();
                checkEndCondition();
                animating = false;
                return;
            }
        }

        // ===== 일반 스왑 =====
        await animateSwap(r1, c1, r2, c2);
        swap(r1, c1, r2, c2);
        const matches = findAllMatches({ r1, c1, r2, c2 });

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
            await animateSwap(r1, c1, r2, c2);
            // 실제 DOM은 이미 원래 상태이므로 다시 렌더
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
    function findAllMatches(swapPos) {
        const matched = new Set();
        const specials = [];

        // 스와이프 위치 셋
        const swapKeys = new Set();
        if (swapPos) {
            swapKeys.add(`${swapPos.r1},${swapPos.c1}`);
            swapKeys.add(`${swapPos.r2},${swapPos.c2}`);
        }

        // 매치 라인에서 스와이프 위치 찾기 헬퍼
        function findSwapPosInRange(fixedR, fixedC, startIdx, endIdx, isHorizontal) {
            for (let i = startIdx; i < endIdx; i++) {
                const key = isHorizontal ? `${fixedR},${i}` : `${i},${fixedC}`;
                if (swapKeys.has(key)) {
                    return isHorizontal ? { r: fixedR, c: i } : { r: i, c: fixedC };
                }
            }
            return null;
        }

        // 가로 스캔
        for (let r = 0; r < ROWS; r++) {
            let c = 0;
            while (c < COLS) {
                if (!grid[r][c] || grid[r][c].type < 0) { c++; continue; }
                const type = grid[r][c].type;
                let end = c + 1;
                while (end < COLS && grid[r][end] && grid[r][end].type === type) end++;
                const len = end - c;

                if (len >= 3) {
                    for (let i = c; i < end; i++) matched.add(`${r},${i}`);
                    if (len === 4) {
                        const sp = findSwapPosInRange(r, null, c, end, true);
                        const pos = sp || { r, c: c + 1 };
                        specials.push({ r: pos.r, c: pos.c, special: SPECIAL.STRIPE_H, type });
                    } else if (len >= 5) {
                        const sp = findSwapPosInRange(r, null, c, end, true);
                        const pos = sp || { r, c: c + 2 };
                        specials.push({ r: pos.r, c: pos.c, special: SPECIAL.RAINBOW, type });
                    }
                }
                c = end;
            }
        }

        // 세로 스캔
        for (let c = 0; c < COLS; c++) {
            let r = 0;
            while (r < ROWS) {
                if (!grid[r][c] || grid[r][c].type < 0) { r++; continue; }
                const type = grid[r][c].type;
                let end = r + 1;
                while (end < ROWS && grid[end][c] && grid[end][c].type === type) end++;
                const len = end - r;

                if (len >= 3) {
                    for (let i = r; i < end; i++) matched.add(`${i},${c}`);
                    if (len === 4) {
                        const sp = findSwapPosInRange(null, c, r, end, false);
                        const pos = sp || { r: r + 1, c };
                        specials.push({ r: pos.r, c: pos.c, special: SPECIAL.STRIPE_V, type });
                    } else if (len >= 5) {
                        const sp = findSwapPosInRange(null, c, r, end, false);
                        const pos = sp || { r: r + 2, c };
                        specials.push({ r: pos.r, c: pos.c, special: SPECIAL.RAINBOW, type });
                    }
                }
                r = end;
            }
        }

        // L/T형 탐지 (교차 지점)
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (!grid[r][c] || grid[r][c].type < 0) continue;
                const key = `${r},${c}`;
                if (!matched.has(key)) continue;

                const type = grid[r][c].type;
                let hCount = 1, vCount = 1;
                let l = c - 1; while (l >= 0 && grid[r][l] && grid[r][l].type === type) { l--; hCount++; }
                let rr = c + 1; while (rr < COLS && grid[r][rr] && grid[r][rr].type === type) { rr++; hCount++; }
                let u = r - 1; while (u >= 0 && grid[u][c] && grid[u][c].type === type) { u--; vCount++; }
                let d = r + 1; while (d < ROWS && grid[d][c] && grid[d][c].type === type) { d++; vCount++; }

                if (hCount >= 3 && vCount >= 3) {
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

        // 제거 애니메이션 실행
        await animateRemoval(cells);

        // 목표 카운트
        cells.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            if (grid[r][c]) {
                const type = grid[r][c].type;
                if (type >= 0) {
                    const gKey = `color_${type}`;
                    goalProgress[gKey] = (goalProgress[gKey] || 0) + 1;
                }
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
            grid[s.r][s.c] = { type: s.type, special: s.special, obs: OBS.NONE };
        });

        // 특수 아이템 발동 이펙트
        for (const sa of specialActivations) {
            if (sa.special === SPECIAL.STRIPE_H) showSpecialEffect('stripe_h', sa.r, sa.c);
            else if (sa.special === SPECIAL.STRIPE_V) showSpecialEffect('stripe_v', sa.r, sa.c);
            else if (sa.special === SPECIAL.BOMB) showSpecialEffect('bomb', sa.r, sa.c);
            else if (sa.special === SPECIAL.RAINBOW) showSpecialEffect('rainbow', sa.r, sa.c);
            await activateSpecial(sa.r, sa.c, sa.special, sa.type);
        }

        // 인접 장애물 처리
        const processedObs = new Set();
        cells.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            dirs.forEach(([dr, dc]) => {
                const nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
                if (!grid[nr][nc]) return;
                const obsKey = `${nr},${nc}`;
                if (processedObs.has(obsKey)) return;

                const neighbor = grid[nr][nc];
                if (neighbor.obs === OBS.ICE1) {
                    neighbor.obs = OBS.NONE;
                    processedObs.add(obsKey);
                } else if (neighbor.obs === OBS.ICE2) {
                    neighbor.obs = OBS.ICE1;
                    processedObs.add(obsKey);
                } else if (neighbor.obs === OBS.CHAIN) {
                    neighbor.obs = OBS.NONE;
                    processedObs.add(obsKey);
                } else if (neighbor.obs === OBS.BOX) {
                    grid[nr][nc] = null;
                    processedObs.add(obsKey);
                    score += 50;
                }
            });
        });

        renderBoard();
        renderHUD();
        await delay(150);
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

        // 제거 애니메이션
        if (toRemove.size > 0) {
            await animateRemoval(toRemove);
        }

        toRemove.forEach(key => {
            const [rr, cc] = key.split(',').map(Number);
            if (grid[rr][cc]) {
                if (grid[rr][cc].type >= 0) {
                    const gKey = `color_${grid[rr][cc].type}`;
                    goalProgress[gKey] = (goalProgress[gKey] || 0) + 1;
                }
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
            showSpecialEffect('rainbow');
            for (let r = 0; r < ROWS; r++)
                for (let c = 0; c < COLS; c++) toRemove.add(`${r},${c}`);
        } else if (specials.includes(SPECIAL.RAINBOW)) {
            const other = a.special === SPECIAL.RAINBOW ? b : a;
            const rainbowTarget = other.type;
            showSpecialEffect('rainbow');
            if (other.special === SPECIAL.STRIPE_H || other.special === SPECIAL.STRIPE_V) {
                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        if (grid[r][c] && grid[r][c].type === rainbowTarget) {
                            for (let cc = 0; cc < COLS; cc++) toRemove.add(`${r},${cc}`);
                            for (let rr = 0; rr < ROWS; rr++) toRemove.add(`${rr},${c}`);
                        }
                    }
                }
            } else if (other.special === SPECIAL.BOMB) {
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
            showSpecialEffect('bomb', Math.floor((r1 + r2) / 2), Math.floor((c1 + c2) / 2));
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
            showSpecialEffect('stripe_h', cr, cc);
            showSpecialEffect('stripe_v', cr, cc);
            for (let d = -1; d <= 1; d++) {
                for (let i = 0; i < COLS; i++) toRemove.add(`${cr + d},${i}`);
                for (let i = 0; i < ROWS; i++) toRemove.add(`${i},${cc + d}`);
            }
        } else {
            // 🔥+🔥 = 십자
            showSpecialEffect('stripe_h', r1, c1);
            showSpecialEffect('stripe_v', r1, c1);
            for (let i = 0; i < COLS; i++) toRemove.add(`${r1},${i}`);
            for (let i = 0; i < ROWS; i++) toRemove.add(`${i},${c1}`);
            for (let i = 0; i < COLS; i++) toRemove.add(`${r2},${i}`);
            for (let i = 0; i < ROWS; i++) toRemove.add(`${i},${c2}`);
        }

        // 제거 애니메이션
        if (toRemove.size > 0) {
            renderBoard();
            await animateRemoval(toRemove);
        }

        // 제거
        toRemove.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c]) {
                if (grid[r][c].obs === OBS.STONE) return;
                if (grid[r][c].type >= 0) {
                    const gKey = `color_${grid[r][c].type}`;
                    goalProgress[gKey] = (goalProgress[gKey] || 0) + 1;
                }
                score += 30;
                grid[r][c] = null;
            }
        });
        goalProgress['score'] = score;
    }

    // ===== 중력 낙하 + 채우기 =====
    function applyGravity() {
        const fallInfo = [];
        for (let c = 0; c < COLS; c++) {
            let writeRow = ROWS - 1;
            for (let r = ROWS - 1; r >= 0; r--) {
                if (grid[r][c]) {
                    if (grid[r][c].obs === OBS.STONE || grid[r][c].obs === OBS.BOX) {
                        writeRow = r - 1;
                        continue;
                    }
                    if (r !== writeRow) {
                        grid[writeRow][c] = grid[r][c];
                        grid[r][c] = null;
                        fallInfo.push({ fromR: r, toR: writeRow, toC: c, isNew: false });
                    }
                    writeRow--;
                }
            }
            for (let r = writeRow; r >= 0; r--) {
                if (grid[r][c] && (grid[r][c].obs === OBS.STONE || grid[r][c].obs === OBS.BOX)) continue;
                grid[r][c] = { type: randType(), special: SPECIAL.NONE, obs: OBS.NONE };
                // 새 보석은 위에서 떨어지는 것처럼
                fallInfo.push({ fromR: r - (writeRow - r + 1), toR: r, toC: c, isNew: true });
            }
        }
        return fallInfo;
    }

    // ===== 연쇄 루프 =====
    async function cascadeLoop() {
        let cascading = true;
        while (cascading) {
            const fallInfo = applyGravity();
            renderBoard();
            animateFalling(fallInfo);
            await delay(400);

            const matches = findAllMatches();
            if (matches && matches.cells && matches.cells.size > 0) {
                await processMatches(matches);
            } else {
                cascading = false;
            }
        }
        comboCount = 0;

        await checkAndShuffle();
    }

    // ===== 가능한 스왑 체크 =====
    function hasValidMoves() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (!grid[r][c]) continue;
                if (grid[r][c].special !== SPECIAL.NONE) return true;

                if (c + 1 < COLS) {
                    swap(r, c, r, c + 1);
                    const m = findAllMatches();
                    swap(r, c, r, c + 1);
                    if (m && m.cells && m.cells.size > 0) return true;
                }
                if (r + 1 < ROWS) {
                    swap(r, c, r + 1, c);
                    const m = findAllMatches();
                    swap(r, c, r + 1, c);
                    if (m && m.cells && m.cells.size > 0) return true;
                }
            }
        }
        return false;
    }

    // ===== 자동 셔플 =====
    async function checkAndShuffle() {
        let shuffleCount = 0;
        while (!hasValidMoves() && shuffleCount < 10) {
            shuffleCount++;
            showShuffleMessage();
            await delay(800);
            shuffleGrid();
            renderBoard();
            await delay(300);
        }
    }

    function shuffleGrid() {
        const items = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c]) items.push(grid[r][c]);
            }
        }
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
        let idx = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                grid[r][c] = items[idx++];
            }
        }
    }

    function showShuffleMessage() {
        comboText.textContent = '🔀 보드를 섞는 중...';
        comboDisplay.classList.remove('hidden');
        setTimeout(() => comboDisplay.classList.add('hidden'), 700);
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
