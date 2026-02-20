// ===== 머지 퍼즐 (Merge Puzzle) =====
(() => {
    'use strict';

    // ===== 아이템 체인 데이터 =====
    const CHAINS = [
        {
            id: 'plant',
            name: '식물',
            items: [
                { emoji: '🌱', name: '씨앗' },
                { emoji: '🌿', name: '새싹' },
                { emoji: '🌷', name: '꽃봉오리' },
                { emoji: '🌸', name: '꽃' },
                { emoji: '🌲', name: '나무' },
                { emoji: '🌳', name: '큰나무' },
            ],
            color: '#34d399',
        },
        {
            id: 'building',
            name: '건물',
            items: [
                { emoji: '🧱', name: '벽돌' },
                { emoji: '🏚️', name: '담벼락' },
                { emoji: '🛖', name: '오두막' },
                { emoji: '🏠', name: '집' },
                { emoji: '🏢', name: '빌딩' },
                { emoji: '🏰', name: '성' },
            ],
            color: '#fb923c',
        },
        {
            id: 'gem',
            name: '보석',
            items: [
                { emoji: '🪨', name: '조약돌' },
                { emoji: '💎', name: '원석' },
                { emoji: '💠', name: '보석' },
                { emoji: '👑', name: '왕관' },
                { emoji: '🏅', name: '메달' },
                { emoji: '🏆', name: '트로피' },
            ],
            color: '#a78bfa',
        },
        {
            id: 'food',
            name: '음식',
            items: [
                { emoji: '🌾', name: '밀' },
                { emoji: '🥚', name: '달걀' },
                { emoji: '🍞', name: '빵' },
                { emoji: '🧁', name: '컵케이크' },
                { emoji: '🎂', name: '케이크' },
                { emoji: '🍰', name: '웨딩케이크' },
            ],
            color: '#fbbf24',
        },
        {
            id: 'magic',
            name: '마법',
            items: [
                { emoji: '✨', name: '먼지' },
                { emoji: '🔮', name: '구슬' },
                { emoji: '⭐', name: '별' },
                { emoji: '🌙', name: '달' },
                { emoji: '🪄', name: '마법봉' },
                { emoji: '📖', name: '마법서' },
            ],
            color: '#f472b6',
        },
    ];

    const GRID_SIZE = 5;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
    const MAX_ENERGY = 20;
    const ENERGY_COST = 1;
    const ENERGY_MERGE_REWARD = 1;

    // ===== 스테이지 데이터 =====
    const STAGES = [
        { goals: [{ chain: 0, level: 2, count: 1 }], label: '꽃봉오리 1개 만들기' },
        { goals: [{ chain: 1, level: 2, count: 1 }], label: '오두막 1개 만들기' },
        { goals: [{ chain: 0, level: 3, count: 1 }, { chain: 1, level: 2, count: 1 }], label: '꽃 + 오두막 만들기' },
        { goals: [{ chain: 2, level: 3, count: 1 }], label: '왕관 1개 만들기' },
        { goals: [{ chain: 3, level: 3, count: 1 }], label: '컵케이크 1개 만들기' },
        { goals: [{ chain: 4, level: 3, count: 1 }], label: '달 1개 만들기' },
        { goals: [{ chain: 0, level: 4, count: 1 }], label: '나무 1개 만들기' },
        { goals: [{ chain: 1, level: 4, count: 1 }], label: '빌딩 1개 만들기' },
        { goals: [{ chain: 2, level: 4, count: 1 }], label: '메달 1개 만들기' },
        { goals: [{ chain: 0, level: 5, count: 1 }], label: '큰나무 1개 만들기' },
        { goals: [{ chain: 1, level: 5, count: 1 }], label: '성 1개 만들기' },
        { goals: [{ chain: 2, level: 5, count: 1 }], label: '트로피 1개 만들기' },
        { goals: [{ chain: 3, level: 5, count: 1 }], label: '웨딩케이크 1개 만들기' },
        { goals: [{ chain: 4, level: 5, count: 1 }], label: '마법서 1개 만들기' },
        { goals: [{ chain: 0, level: 5, count: 1 }, { chain: 1, level: 5, count: 1 }, { chain: 2, level: 5, count: 1 }], label: '큰나무 + 성 + 트로피 만들기' },
    ];

    // ===== DOM 참조 =====
    const $ = id => document.getElementById(id);
    const startScreen = $('startScreen');
    const gameContainer = $('gameContainer');
    const clearScreen = $('clearScreen');
    const overScreen = $('overScreen');
    const board = $('board');
    const stageNum = $('stageNum');
    const scoreNum = $('scoreNum');
    const goalItems = $('goalItems');
    const energyFill = $('energyFill');
    const energyText = $('energyText');
    const generators = $('generators');

    // ===== 게임 상태 =====
    let grid = []; // 25칸 배열, null 또는 { chain, level }
    let score = 0;
    let bestScore = parseInt(localStorage.getItem('merge_best') || '0');
    let energy = MAX_ENERGY;
    let stage = 0;
    let goalProgress = [];

    // 드래그 상태
    let dragging = false;
    let dragFrom = -1;
    let dragGhost = null;

    // ===== 초기화 =====
    function initGame() {
        grid = new Array(TOTAL_CELLS).fill(null);
        score = 0;
        energy = MAX_ENERGY;
        stage = 0;
        goalProgress = [];

        // 초기 아이템 배치
        placeRandomItem();
        placeRandomItem();
        placeRandomItem();

        renderBoard();
        renderHUD();
        renderGenerators();
        updateGoals();
    }

    // ===== 랜덤 아이템 배치 =====
    function placeRandomItem() {
        const empty = getEmptyCells();
        if (empty.length === 0) return false;

        const cellIdx = empty[Math.floor(Math.random() * empty.length)];
        const chainIdx = Math.floor(Math.random() * CHAINS.length);
        grid[cellIdx] = { chain: chainIdx, level: 0 };
        return true;
    }

    function getEmptyCells() {
        const empty = [];
        for (let i = 0; i < TOTAL_CELLS; i++) {
            if (grid[i] === null) empty.push(i);
        }
        return empty;
    }

    // ===== 보드 렌더링 =====
    function renderBoard() {
        board.innerHTML = '';
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;

            if (grid[i]) {
                const item = grid[i];
                const chainData = CHAINS[item.chain];
                const itemData = chainData.items[item.level];

                const itemEl = document.createElement('span');
                itemEl.className = 'item';
                itemEl.textContent = itemData.emoji;

                const levelEl = document.createElement('span');
                levelEl.className = 'item-level';
                levelEl.textContent = `Lv.${item.level + 1}`;

                cell.appendChild(itemEl);
                cell.appendChild(levelEl);
            }

            // 이벤트
            cell.addEventListener('mousedown', (e) => onDragStart(e, i));
            cell.addEventListener('touchstart', (e) => onTouchStart(e, i), { passive: false });

            board.appendChild(cell);
        }
    }

    // ===== HUD 렌더링 =====
    function renderHUD() {
        stageNum.textContent = stage + 1;
        scoreNum.textContent = score;
        updateEnergy();
        updateGoals();
    }

    function updateEnergy() {
        const pct = (energy / MAX_ENERGY) * 100;
        energyFill.style.width = pct + '%';
        energyText.textContent = `${energy}/${MAX_ENERGY}`;

        // 생성기 활성화 상태 업데이트
        document.querySelectorAll('.generator-btn').forEach(btn => {
            if (energy < ENERGY_COST || getEmptyCells().length === 0) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
        });
    }

    // ===== 목표 업데이트 =====
    function updateGoals() {
        const stageData = STAGES[stage % STAGES.length];
        goalItems.innerHTML = '';

        // 목표 진행 상태 계산
        goalProgress = stageData.goals.map(goal => {
            const count = grid.filter(cell =>
                cell && cell.chain === goal.chain && cell.level >= goal.level
            ).length;
            return { ...goal, current: Math.min(count, goal.count) };
        });

        goalProgress.forEach(gp => {
            const el = document.createElement('div');
            el.className = 'goal-item' + (gp.current >= gp.count ? ' completed' : '');

            const chainData = CHAINS[gp.chain];
            const itemData = chainData.items[gp.level];
            el.innerHTML = `${itemData.emoji}<span class="goal-count">${gp.current}/${gp.count}</span>`;

            goalItems.appendChild(el);
        });
    }

    // ===== 생성기 렌더링 =====
    function renderGenerators() {
        generators.innerHTML = '';

        // 현재 스테이지에서 필요한 체인들의 생성기
        const stageData = STAGES[stage % STAGES.length];
        const chainSet = new Set(stageData.goals.map(g => g.chain));

        // 항상 최소 3개 체인은 보여줌
        if (chainSet.size < 3) {
            for (let i = 0; i < CHAINS.length && chainSet.size < 3; i++) {
                chainSet.add(i);
            }
        }

        chainSet.forEach(chainIdx => {
            const chain = CHAINS[chainIdx];
            const btn = document.createElement('button');
            btn.className = 'generator-btn';
            if (energy < ENERGY_COST || getEmptyCells().length === 0) {
                btn.classList.add('disabled');
            }

            btn.innerHTML = `
                <span class="generator-emoji">${chain.items[0].emoji}</span>
                <span>${chain.name}</span>
                <span class="generator-cost">⚡${ENERGY_COST}</span>
            `;

            btn.addEventListener('click', () => generateItem(chainIdx));
            generators.appendChild(btn);
        });
    }

    // ===== 아이템 생성 =====
    function generateItem(chainIdx) {
        if (energy < ENERGY_COST) return;

        const empty = getEmptyCells();
        if (empty.length === 0) return;

        energy -= ENERGY_COST;

        const cellIdx = empty[Math.floor(Math.random() * empty.length)];
        grid[cellIdx] = { chain: chainIdx, level: 0 };

        renderBoard();
        renderHUD();

        // 생성 애니메이션
        const cell = board.children[cellIdx];
        cell.classList.add('spawned');
        setTimeout(() => cell.classList.remove('spawned'), 400);

        checkGameOver();
    }

    // ===== 합성 =====
    function merge(fromIdx, toIdx) {
        const a = grid[fromIdx];
        const b = grid[toIdx];

        if (!a || !b) return false;
        if (a.chain !== b.chain) return false;
        if (a.level !== b.level) return false;
        if (a.level >= CHAINS[a.chain].items.length - 1) return false; // 최대 레벨

        // 합성!
        const newLevel = a.level + 1;
        grid[toIdx] = { chain: a.chain, level: newLevel };
        grid[fromIdx] = null;

        // 점수
        const pts = (newLevel + 1) * 10;
        score += pts;

        // 에너지 보상
        energy = Math.min(MAX_ENERGY, energy + ENERGY_MERGE_REWARD);

        // 애니메이션
        renderBoard();
        renderHUD();

        const cell = board.children[toIdx];
        cell.classList.add('merged');
        spawnParticles(cell, CHAINS[a.chain].color);
        setTimeout(() => cell.classList.remove('merged'), 500);

        // 목표 체크
        checkStageGoal();

        return true;
    }

    // ===== 파티클 생성 =====
    function spawnParticles(cell, color) {
        const container = document.createElement('div');
        container.className = 'merge-particles';

        for (let i = 0; i < 8; i++) {
            const p = document.createElement('div');
            p.className = 'merge-particle';
            p.style.background = color;

            const angle = (Math.PI * 2 / 8) * i;
            const dist = 15 + Math.random() * 20;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            p.style.animation = `particle-fly 0.5s ease-out forwards`;
            p.style.transform = `translate(${tx}px, ${ty}px)`;

            // 커스텀 애니메이션 끝점
            p.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 },
            ], { duration: 400, easing: 'ease-out', fill: 'forwards' });

            container.appendChild(p);
        }

        cell.appendChild(container);
        setTimeout(() => container.remove(), 500);
    }

    // ===== 스테이지 목표 체크 =====
    function checkStageGoal() {
        updateGoals();

        const allDone = goalProgress.every(gp => gp.current >= gp.count);
        if (allDone) {
            // 스테이지 클리어!
            setTimeout(() => showClearScreen(), 500);
        }
    }

    function showClearScreen() {
        $('clearScore').textContent = `점수: ${score}`;
        clearScreen.classList.remove('hidden');
    }

    function nextStage() {
        clearScreen.classList.add('hidden');
        stage++;

        // 보드는 유지, 에너지 충전
        energy = MAX_ENERGY;

        renderHUD();
        renderGenerators();
    }

    // ===== 게임 오버 체크 =====
    function checkGameOver() {
        if (getEmptyCells().length > 0) return;

        // 합성 가능한 쌍이 있는지 체크
        for (let i = 0; i < TOTAL_CELLS; i++) {
            if (!grid[i]) continue;
            const neighbors = getNeighbors(i);
            for (const n of neighbors) {
                if (grid[n] &&
                    grid[n].chain === grid[i].chain &&
                    grid[n].level === grid[i].level &&
                    grid[i].level < CHAINS[grid[i].chain].items.length - 1) {
                    return; // 합성 가능 → 아직 안 끝남
                }
            }
        }

        // 진짜 게임 오버
        setTimeout(() => showGameOver(), 300);
    }

    function getNeighbors(idx) {
        const neighbors = [];
        const row = Math.floor(idx / GRID_SIZE);
        const col = idx % GRID_SIZE;

        if (row > 0) neighbors.push(idx - GRID_SIZE);           // 위
        if (row < GRID_SIZE - 1) neighbors.push(idx + GRID_SIZE); // 아래
        if (col > 0) neighbors.push(idx - 1);                    // 왼쪽
        if (col < GRID_SIZE - 1) neighbors.push(idx + 1);        // 오른쪽

        return neighbors;
    }

    function showGameOver() {
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('merge_best', bestScore.toString());
        }
        $('overScore').textContent = `점수: ${score}`;
        $('overBest').textContent = `최고 기록: ${bestScore}`;
        overScreen.classList.remove('hidden');
    }

    // ===== 드래그 & 드롭: 마우스 =====
    function onDragStart(e, idx) {
        if (!grid[idx]) return;
        e.preventDefault();

        dragging = true;
        dragFrom = idx;

        // 고스트 생성
        createDragGhost(idx, e.clientX, e.clientY);

        // 원래 셀 표시
        const cell = board.children[idx];
        cell.classList.add('dragging');

        // 합성 가능 셀 하이라이트
        highlightMergeable(idx);

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
    }

    function onDragMove(e) {
        if (!dragging) return;
        moveDragGhost(e.clientX, e.clientY);
        updateDragOver(e.clientX, e.clientY);
    }

    function onDragEnd(e) {
        if (!dragging) return;

        const target = getCellAtPoint(e.clientX, e.clientY);
        finishDrag(target);

        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
    }

    // ===== 드래그 & 드롭: 터치 =====
    function onTouchStart(e, idx) {
        if (!grid[idx]) return;
        e.preventDefault();

        const t = e.touches[0];
        dragging = true;
        dragFrom = idx;

        createDragGhost(idx, t.clientX, t.clientY);

        const cell = board.children[idx];
        cell.classList.add('dragging');
        highlightMergeable(idx);

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);
    }

    function onTouchMove(e) {
        if (!dragging) return;
        e.preventDefault();
        const t = e.touches[0];
        moveDragGhost(t.clientX, t.clientY);
        updateDragOver(t.clientX, t.clientY);
    }

    function onTouchEnd(e) {
        if (!dragging) return;

        let target = -1;
        if (e.changedTouches && e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            target = getCellAtPoint(t.clientX, t.clientY);
        }

        finishDrag(target);

        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('touchcancel', onTouchEnd);
    }

    // ===== 드래그 헬퍼 =====
    function createDragGhost(idx, x, y) {
        const item = grid[idx];
        const chainData = CHAINS[item.chain];
        const itemData = chainData.items[item.level];

        dragGhost = document.createElement('div');
        dragGhost.className = 'drag-ghost';
        dragGhost.textContent = itemData.emoji;
        dragGhost.style.left = x + 'px';
        dragGhost.style.top = y + 'px';
        document.body.appendChild(dragGhost);
    }

    function moveDragGhost(x, y) {
        if (dragGhost) {
            dragGhost.style.left = x + 'px';
            dragGhost.style.top = y + 'px';
        }
    }

    function removeDragGhost() {
        if (dragGhost) {
            dragGhost.remove();
            dragGhost = null;
        }
    }

    function getCellAtPoint(x, y) {
        const cells = board.querySelectorAll('.cell');
        for (let i = 0; i < cells.length; i++) {
            const rect = cells[i].getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return i;
            }
        }
        return -1;
    }

    function updateDragOver(x, y) {
        const cells = board.querySelectorAll('.cell');
        cells.forEach(c => c.classList.remove('drag-over'));

        const target = getCellAtPoint(x, y);
        if (target >= 0 && target !== dragFrom) {
            cells[target].classList.add('drag-over');
        }
    }

    function highlightMergeable(fromIdx) {
        const fromItem = grid[fromIdx];
        if (!fromItem) return;

        const cells = board.querySelectorAll('.cell');
        for (let i = 0; i < TOTAL_CELLS; i++) {
            if (i === fromIdx) continue;
            if (grid[i] &&
                grid[i].chain === fromItem.chain &&
                grid[i].level === fromItem.level &&
                fromItem.level < CHAINS[fromItem.chain].items.length - 1) {
                cells[i].classList.add('merge-possible');
            }
        }
    }

    function clearHighlights() {
        board.querySelectorAll('.cell').forEach(c => {
            c.classList.remove('dragging', 'drag-over', 'merge-possible');
        });
    }

    function finishDrag(targetIdx) {
        removeDragGhost();

        if (targetIdx >= 0 && targetIdx !== dragFrom) {
            const fromItem = grid[dragFrom];
            const toItem = grid[targetIdx];

            if (toItem && fromItem &&
                fromItem.chain === toItem.chain &&
                fromItem.level === toItem.level &&
                fromItem.level < CHAINS[fromItem.chain].items.length - 1) {
                // 합성!
                merge(dragFrom, targetIdx);
            } else if (!toItem) {
                // 빈 칸으로 이동
                grid[targetIdx] = grid[dragFrom];
                grid[dragFrom] = null;
                renderBoard();
                renderHUD();
            }
        }

        clearHighlights();
        dragging = false;
        dragFrom = -1;
    }

    // ===== 버튼 이벤트 =====
    $('startBtn').addEventListener('click', () => {
        startScreen.classList.add('hidden');
        gameContainer.style.display = 'flex';
        initGame();
    });

    $('nextStageBtn').addEventListener('click', () => {
        nextStage();
    });

    $('retryBtn').addEventListener('click', () => {
        overScreen.classList.add('hidden');
        initGame();
    });

    // ===== 초기 상태 =====
    gameContainer.style.display = 'none';

})();
