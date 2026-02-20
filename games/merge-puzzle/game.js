// ===== 머지 스위츠 (Merge Sweets) — v2 =====
(() => {
    'use strict';

    // ===== 상수 =====
    const GRID_COLS = 7;
    const GRID_ROWS = 9;
    const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

    const BASE_MAX_ENERGY = 100;
    const ENERGY_PER_LEVEL = 10;
    const ENERGY_COST = 1;
    const ENERGY_REGEN_INTERVAL = 120; // 2분 (초 단위)
    const MAX_ORDERS = 3;
    const ORDER_RESPAWN_DELAY = 3000; // 3초

    const GENERATOR_COOLDOWN = 3600; // 60분 (초 단위)
    const GENERATOR_MAX_CAPACITY = 5;

    const BUBBLE_LIFETIME = 60; // 60초

    // ===== 아이템 체인 데이터 =====
    const CHAINS = [
        {
            id: 'food', name: '빵',
            items: [
                { emoji: '🌾', name: '밀', sellPrice: 1 },
                { emoji: '🥚', name: '달걀', sellPrice: 2 },
                { emoji: '🍞', name: '빵', sellPrice: 5 },
                { emoji: '🧁', name: '컵케이크', sellPrice: 12 },
                { emoji: '🎂', name: '케이크', sellPrice: 25 },
                { emoji: '🍰', name: '웨딩케이크', sellPrice: 50 },
            ],
            color: '#fbbf24', unlockLevel: 1,
            dropTable: [
                { level: 0, weight: 80 },
                { level: 1, weight: 15 },
            ],
            crossDrop: [{ chainId: 'plant', level: 0, weight: 5 }],
        },
        {
            id: 'plant', name: '식물',
            items: [
                { emoji: '🌱', name: '씨앗', sellPrice: 1 },
                { emoji: '🌿', name: '새싹', sellPrice: 2 },
                { emoji: '🌷', name: '꽃봉오리', sellPrice: 5 },
                { emoji: '🌸', name: '꽃', sellPrice: 12 },
                { emoji: '🌲', name: '나무', sellPrice: 25 },
                { emoji: '🌳', name: '큰나무', sellPrice: 50 },
            ],
            color: '#34d399', unlockLevel: 1,
            dropTable: [
                { level: 0, weight: 80 },
                { level: 1, weight: 15 },
            ],
            crossDrop: [{ chainId: 'food', level: 0, weight: 5 }],
        },
        {
            id: 'building', name: '건물',
            items: [
                { emoji: '🧱', name: '벽돌', sellPrice: 1 },
                { emoji: '🏚️', name: '담벼락', sellPrice: 3 },
                { emoji: '🛖', name: '오두막', sellPrice: 6 },
                { emoji: '🏠', name: '집', sellPrice: 15 },
                { emoji: '🏢', name: '빌딩', sellPrice: 30 },
                { emoji: '🏰', name: '성', sellPrice: 60 },
            ],
            color: '#fb923c', unlockLevel: 2,
            dropTable: [
                { level: 0, weight: 80 },
                { level: 1, weight: 20 },
            ],
            crossDrop: [],
        },
        {
            id: 'gem', name: '보석',
            items: [
                { emoji: '🪨', name: '조약돌', sellPrice: 2 },
                { emoji: '💎', name: '원석', sellPrice: 4 },
                { emoji: '💠', name: '보석', sellPrice: 8 },
                { emoji: '👑', name: '왕관', sellPrice: 20 },
                { emoji: '🏅', name: '메달', sellPrice: 40 },
                { emoji: '🏆', name: '트로피', sellPrice: 80 },
            ],
            color: '#a78bfa', unlockLevel: 3,
            dropTable: [
                { level: 0, weight: 85 },
                { level: 1, weight: 15 },
            ],
            crossDrop: [],
        },
        {
            id: 'magic', name: '마법',
            items: [
                { emoji: '✨', name: '먼지', sellPrice: 2 },
                { emoji: '🔮', name: '구슬', sellPrice: 4 },
                { emoji: '⭐', name: '별', sellPrice: 8 },
                { emoji: '🌙', name: '달', sellPrice: 20 },
                { emoji: '🪄', name: '마법봉', sellPrice: 40 },
                { emoji: '📖', name: '마법서', sellPrice: 80 },
            ],
            color: '#f472b6', unlockLevel: 5,
            dropTable: [
                { level: 0, weight: 85 },
                { level: 1, weight: 15 },
            ],
            crossDrop: [],
        },
    ];

    // 경험치(별) 특수 아이템 — 보상용
    const STAR_ITEM = { emoji: '🌟', name: '경험치별', sellPrice: 3 };

    // ===== 빵집 레벨 데이터 =====
    const SHOP_LEVELS = [
        { name: '낡은 빵집', emoji: '🏚️', upgradeCost: 0, rewardMult: 1.0 },
        { name: '작은 빵집', emoji: '🏠', upgradeCost: 50, rewardMult: 1.0 },
        { name: '동네 빵집', emoji: '🏡', upgradeCost: 150, rewardMult: 1.2 },
        { name: '인기 베이커리', emoji: '🏪', upgradeCost: 400, rewardMult: 1.5 },
        { name: '프랜차이즈', emoji: '🏬', upgradeCost: 800, rewardMult: 1.8 },
        { name: '대형 카페', emoji: '🏢', upgradeCost: 1500, rewardMult: 2.0 },
        { name: '호텔 레스토랑', emoji: '🏨', upgradeCost: 3000, rewardMult: 2.5 },
        { name: '미슐랭 식당', emoji: '⭐', upgradeCost: 5000, rewardMult: 3.0 },
        { name: '왕실 주방', emoji: '👑', upgradeCost: 8000, rewardMult: 3.5 },
        { name: '전설의 빵집', emoji: '🏰', upgradeCost: 15000, rewardMult: 4.0 },
    ];

    // ===== 초기 보드 레이아웃 =====
    // 생성기는 하단 UI 버튼으로 유지하되 보드에도 배치 가능
    function getInitialLayout() {
        // 7x9 (col, row) — 중앙에 생성기, 가장자리에 잠긴 아이템, 코너에 장애물
        const layout = [];

        // 장애물 (나무상자) — 네 귀퉁이 근처
        const obstaclePositions = [
            [0, 0], [6, 0], [0, 8], [6, 8],
            [1, 1], [5, 1], [1, 7], [5, 7],
        ];
        obstaclePositions.forEach(([col, row]) => {
            layout.push({ col, row, type: 'obstacle', hp: 2 });
        });

        // 잠긴 아이템 — 중간 영역에 배치
        const lockedPositions = [
            { col: 2, row: 1, chain: 0, level: 0 },
            { col: 4, row: 1, chain: 0, level: 0 },
            { col: 1, row: 3, chain: 1, level: 0 },
            { col: 5, row: 3, chain: 1, level: 0 },
            { col: 2, row: 5, chain: 0, level: 1 },
            { col: 4, row: 5, chain: 0, level: 1 },
            { col: 1, row: 6, chain: 1, level: 1 },
            { col: 5, row: 6, chain: 1, level: 1 },
        ];
        lockedPositions.forEach(lp => {
            layout.push({ col: lp.col, row: lp.row, type: 'locked', chain: lp.chain, level: lp.level });
        });

        return layout;
    }

    // ===== DOM 참조 =====
    const $ = id => document.getElementById(id);
    const startScreen = $('startScreen');
    const gameContainer = $('gameContainer');
    const overScreen = $('overScreen');
    const board = $('board');
    const generators = $('generators');

    // HUD
    const shopEmoji = $('shopEmoji');
    const shopName = $('shopName');
    const shopLevelNum = $('shopLevelNum');
    const coinNum = $('coinNum');
    const energyFill = $('energyFill');
    const energyText = $('energyText');
    const energyTimerText = $('energyTimerText');
    const ordersContainer = $('ordersContainer');
    const upgradeBtn = $('upgradeBtn');
    const upgradeCostText = $('upgradeCostText');
    const sellModeBtn = $('sellModeBtn');

    // ===== 게임 상태 =====
    let grid = []; // 각 셀: null | {chain, level, locked} | {type:'obstacle', hp} | {type:'star'} | {type:'bubble', chain, level, lifetime}
    let score = 0;
    let bestScore = parseInt(localStorage.getItem('merge2_best') || '0');
    let coins = parseInt(localStorage.getItem('merge2_coins') || '0');
    let shopLevel = parseInt(localStorage.getItem('merge2_shop') || '0');
    let energy = BASE_MAX_ENERGY;
    let orders = [];
    let sellMode = false;
    let totalOrdersCompleted = parseInt(localStorage.getItem('merge2_orders') || '0');

    // 생성기 상태 (하단 버튼 기반)
    let generatorStates = []; // { chainIdx, capacity, maxCapacity, cooldownRemaining }

    // 에너지 회복 타이머 (초 단위)
    let energyRegenCountdown = ENERGY_REGEN_INTERVAL;

    // 게임 루프 타이머
    let gameLoopTimer = null;

    // 드래그 상태
    let dragging = false;
    let dragFrom = -1;
    let dragGhost = null;

    // ===== 유틸리티 =====
    function getMaxEnergy() {
        return BASE_MAX_ENERGY + shopLevel * ENERGY_PER_LEVEL;
    }

    function getUnlockedChainIndices() {
        const indices = [];
        CHAINS.forEach((c, i) => {
            if (c.unlockLevel <= shopLevel + 1) indices.push(i);
        });
        return indices;
    }

    function getRewardMultiplier() {
        return SHOP_LEVELS[shopLevel]?.rewardMult || 1.0;
    }

    function coordToIdx(col, row) {
        return row * GRID_COLS + col;
    }

    function idxToCoord(idx) {
        return { col: idx % GRID_COLS, row: Math.floor(idx / GRID_COLS) };
    }

    function getEmptyCells() {
        const empty = [];
        for (let i = 0; i < TOTAL_CELLS; i++) {
            if (grid[i] === null) empty.push(i);
        }
        return empty;
    }

    function getAdjacentCells(idx) {
        const { col, row } = idxToCoord(idx);
        const adj = [];
        if (row > 0) adj.push(coordToIdx(col, row - 1));
        if (row < GRID_ROWS - 1) adj.push(coordToIdx(col, row + 1));
        if (col > 0) adj.push(coordToIdx(col - 1, row));
        if (col < GRID_COLS - 1) adj.push(coordToIdx(col + 1, row));
        return adj;
    }

    function getSurrounding8(idx) {
        const { col, row } = idxToCoord(idx);
        const cells = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr, nc = col + dc;
                if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
                    cells.push(coordToIdx(nc, nr));
                }
            }
        }
        return cells;
    }

    function isItem(cell) {
        return cell && cell.chain !== undefined && cell.type !== 'obstacle' && cell.type !== 'star' && cell.type !== 'bubble';
    }

    function isOccupied(cell) {
        return isItem(cell) && !cell.locked;
    }

    function isLocked(cell) {
        return isItem(cell) && cell.locked === true;
    }

    function isObstacle(cell) {
        return cell && cell.type === 'obstacle';
    }

    function isStar(cell) {
        return cell && cell.type === 'star';
    }

    function isBubble(cell) {
        return cell && cell.type === 'bubble';
    }

    function canDrag(cell) {
        return isOccupied(cell) || isStar(cell);
    }

    function canMerge(a, b) {
        if (!a || !b) return false;
        if (!isItem(a) || !isItem(b)) return false;
        if (a.chain !== b.chain) return false;
        if (a.level !== b.level) return false;
        if (a.level >= CHAINS[a.chain].items.length - 1) return false;
        return true;
    }

    function findChainIdx(chainId) {
        return CHAINS.findIndex(c => c.id === chainId);
    }

    // ===== 초기화 =====
    function initGame() {
        grid = new Array(TOTAL_CELLS).fill(null);
        score = 0;
        energy = getMaxEnergy();
        orders = [];
        sellMode = false;
        energyRegenCountdown = ENERGY_REGEN_INTERVAL;

        // 초기 레이아웃 배치
        const layout = getInitialLayout();
        layout.forEach(item => {
            const idx = coordToIdx(item.col, item.row);
            if (item.type === 'obstacle') {
                grid[idx] = { type: 'obstacle', hp: item.hp };
            } else if (item.type === 'locked') {
                grid[idx] = { chain: item.chain, level: item.level, locked: true };
            }
        });

        // 초기 빈 칸에 랜덤 아이템 배치
        for (let i = 0; i < 5; i++) {
            placeRandomItem();
        }

        // 생성기 상태 초기화
        initGenerators();

        // 주문 생성
        for (let i = 0; i < MAX_ORDERS; i++) {
            orders.push(generateOrder());
        }

        renderBoard();
        renderHUD();
        renderGenerators();
        renderOrders();
        startGameLoop();
    }

    // ===== 생성기 초기화 =====
    function initGenerators() {
        const unlocked = getUnlockedChainIndices();
        generatorStates = unlocked.map(chainIdx => ({
            chainIdx,
            capacity: GENERATOR_MAX_CAPACITY,
            maxCapacity: GENERATOR_MAX_CAPACITY,
            cooldownRemaining: 0,
        }));
    }

    // ===== 게임 루프 (1초마다) =====
    function startGameLoop() {
        if (gameLoopTimer) clearInterval(gameLoopTimer);
        gameLoopTimer = setInterval(gameTick, 1000);
    }

    function gameTick() {
        // 에너지 자동 회복
        if (energy < getMaxEnergy()) {
            energyRegenCountdown--;
            if (energyRegenCountdown <= 0) {
                energy = Math.min(getMaxEnergy(), energy + 1);
                energyRegenCountdown = ENERGY_REGEN_INTERVAL;
                updateEnergy();
            }
            updateEnergyTimer();
        } else {
            energyRegenCountdown = ENERGY_REGEN_INTERVAL;
            updateEnergyTimer();
        }

        // 생성기 쿨타임 감소
        let genChanged = false;
        generatorStates.forEach(gs => {
            if (gs.cooldownRemaining > 0) {
                gs.cooldownRemaining--;
                if (gs.cooldownRemaining <= 0) {
                    gs.capacity = gs.maxCapacity;
                    gs.cooldownRemaining = 0;
                }
                genChanged = true;
            }
        });
        if (genChanged) renderGenerators();

        // 버블 수명 감소
        let bubbleChanged = false;
        for (let i = 0; i < TOTAL_CELLS; i++) {
            if (isBubble(grid[i])) {
                grid[i].lifetime--;
                if (grid[i].lifetime <= 0) {
                    // 버블 소멸 → 1코인 아이템으로 변환
                    grid[i] = { type: 'star' }; // 별(코인) 아이템으로 변환
                    bubbleChanged = true;
                }
            }
        }
        if (bubbleChanged) renderBoard();
    }

    // ===== 에너지 타이머 UI =====
    function updateEnergyTimer() {
        if (energyTimerText) {
            if (energy >= getMaxEnergy()) {
                energyTimerText.textContent = '';
            } else {
                const min = Math.floor(energyRegenCountdown / 60);
                const sec = energyRegenCountdown % 60;
                energyTimerText.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
            }
        }
    }

    // ===== 주문 생성 =====
    function generateOrder() {
        const unlocked = getUnlockedChainIndices();
        const numGoals = Math.random() < 0.4 ? 2 : 1;
        const goals = [];

        for (let g = 0; g < numGoals; g++) {
            const chainIdx = unlocked[Math.floor(Math.random() * unlocked.length)];
            const chain = CHAINS[chainIdx];
            const minLevel = 1;
            const maxLevel = Math.min(2 + Math.floor(shopLevel / 2), chain.items.length - 1);
            const level = minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
            const count = level <= 2 ? (Math.random() < 0.3 ? 2 : 1) : 1;
            goals.push({ chain: chainIdx, level, count });
        }

        let baseReward = 0;
        goals.forEach(g => {
            baseReward += (g.level + 1) * 8 * g.count;
        });
        const reward = Math.floor(baseReward * getRewardMultiplier());

        return { goals, reward, completed: false };
    }

    // ===== 랜덤 아이템 배치 =====
    function placeRandomItem() {
        const empty = getEmptyCells();
        if (empty.length === 0) return false;

        const unlocked = getUnlockedChainIndices();
        const cellIdx = empty[Math.floor(Math.random() * empty.length)];
        const chainIdx = unlocked[Math.floor(Math.random() * unlocked.length)];
        grid[cellIdx] = { chain: chainIdx, level: 0, locked: false };
        return true;
    }

    // ===== 보드 렌더링 =====
    function renderBoard() {
        board.innerHTML = '';
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if (sellMode) cell.classList.add('sell-mode');
            cell.dataset.index = i;

            const cellData = grid[i];

            if (isObstacle(cellData)) {
                cell.classList.add('obstacle');
                const itemEl = document.createElement('span');
                itemEl.className = 'item';
                itemEl.textContent = '📦';
                cell.appendChild(itemEl);
                const hpEl = document.createElement('span');
                hpEl.className = 'obstacle-hp';
                hpEl.textContent = `HP:${cellData.hp}`;
                cell.appendChild(hpEl);
            } else if (isStar(cellData)) {
                const itemEl = document.createElement('span');
                itemEl.className = 'item star-item';
                itemEl.textContent = STAR_ITEM.emoji;
                cell.appendChild(itemEl);
                if (sellMode) {
                    const priceTag = document.createElement('span');
                    priceTag.className = 'sell-price';
                    priceTag.textContent = `💰${STAR_ITEM.sellPrice}`;
                    cell.appendChild(priceTag);
                }
            } else if (isBubble(cellData)) {
                cell.classList.add('bubble');
                const chainData = CHAINS[cellData.chain];
                const itemData = chainData.items[cellData.level];
                const itemEl = document.createElement('span');
                itemEl.className = 'item bubble-item';
                itemEl.textContent = itemData.emoji;
                cell.appendChild(itemEl);
                const timerEl = document.createElement('span');
                timerEl.className = 'bubble-timer';
                timerEl.textContent = `${cellData.lifetime}s`;
                cell.appendChild(timerEl);
            } else if (isItem(cellData)) {
                const chainData = CHAINS[cellData.chain];
                const itemData = chainData.items[cellData.level];

                if (cellData.locked) {
                    cell.classList.add('locked');
                }

                const itemEl = document.createElement('span');
                itemEl.className = 'item';
                itemEl.textContent = itemData.emoji;

                const levelEl = document.createElement('span');
                levelEl.className = 'item-level';
                levelEl.textContent = `Lv.${cellData.level + 1}`;

                cell.appendChild(itemEl);
                cell.appendChild(levelEl);

                if (sellMode && !cellData.locked) {
                    const priceTag = document.createElement('span');
                    priceTag.className = 'sell-price';
                    priceTag.textContent = `💰${itemData.sellPrice}`;
                    cell.appendChild(priceTag);
                }
            }

            // 이벤트
            cell.addEventListener('mousedown', (e) => onDragStart(e, i));
            cell.addEventListener('touchstart', (e) => onTouchStart(e, i), { passive: false });

            board.appendChild(cell);
        }
    }

    // ===== HUD 렌더링 =====
    function renderHUD() {
        const shopData = SHOP_LEVELS[shopLevel];
        shopEmoji.textContent = shopData.emoji;
        shopName.textContent = shopData.name;
        shopLevelNum.textContent = `Lv.${shopLevel + 1}`;
        coinNum.textContent = coins.toLocaleString();
        updateEnergy();
        updateUpgradeBtn();
        updateEnergyTimer();
    }

    function updateEnergy() {
        const maxE = getMaxEnergy();
        const pct = (energy / maxE) * 100;
        energyFill.style.width = pct + '%';
        energyText.textContent = `${energy}/${maxE}`;

        // 생성기 활성화 상태 업데이트
        document.querySelectorAll('.generator-btn').forEach((btn, idx) => {
            const gs = generatorStates[idx];
            if (!gs) return;
            if (energy < ENERGY_COST || getEmptyCells().length === 0 || gs.capacity <= 0 || gs.cooldownRemaining > 0) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
        });
    }

    function updateUpgradeBtn() {
        if (shopLevel >= SHOP_LEVELS.length - 1) {
            upgradeBtn.classList.add('disabled');
            upgradeCostText.textContent = 'MAX';
            return;
        }
        const cost = SHOP_LEVELS[shopLevel + 1].upgradeCost;
        upgradeCostText.textContent = `💰${cost}`;
        if (coins >= cost) {
            upgradeBtn.classList.remove('disabled');
        } else {
            upgradeBtn.classList.add('disabled');
        }
    }

    // ===== 주문 렌더링 =====
    function renderOrders() {
        ordersContainer.innerHTML = '';
        orders.forEach((order, idx) => {
            const card = document.createElement('div');
            card.className = 'order-card' + (order.completed ? ' completed' : '');

            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'order-items';

            let allGoalsMet = true;

            order.goals.forEach(goal => {
                const current = countItemsOnBoard(goal.chain, goal.level);
                const done = current >= goal.count;
                if (!done) allGoalsMet = false;

                const goalEl = document.createElement('span');
                goalEl.className = 'order-goal' + (done ? ' done' : '');
                const itemData = CHAINS[goal.chain].items[goal.level];
                goalEl.innerHTML = `${itemData.emoji}<small>${Math.min(current, goal.count)}/${goal.count}</small>`;
                itemsDiv.appendChild(goalEl);
            });

            const rewardDiv = document.createElement('div');
            rewardDiv.className = 'order-reward';
            rewardDiv.textContent = `💰${order.reward}`;

            card.appendChild(itemsDiv);
            card.appendChild(rewardDiv);

            // 제출 버튼
            if (!order.completed) {
                const submitBtn = document.createElement('button');
                submitBtn.className = 'order-submit-btn' + (allGoalsMet ? ' active' : '');
                submitBtn.textContent = '제출';
                submitBtn.disabled = !allGoalsMet;
                submitBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (allGoalsMet) submitOrder(idx);
                });
                card.appendChild(submitBtn);
            }

            ordersContainer.appendChild(card);
        });
    }

    function countItemsOnBoard(chainIdx, level) {
        let count = 0;
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const cell = grid[i];
            if (isItem(cell) && cell.chain === chainIdx && cell.level === level) {
                count++;
            }
        }
        return count;
    }

    // ===== 주문 제출 =====
    function submitOrder(orderIdx) {
        const order = orders[orderIdx];
        if (order.completed) return;

        // 보드에서 정확히 일치하는 아이템만 삭제 (좌측 상단부터)
        order.goals.forEach(goal => {
            let remaining = goal.count;
            for (let i = 0; i < TOTAL_CELLS && remaining > 0; i++) {
                if (isItem(grid[i]) && grid[i].chain === goal.chain && grid[i].level === goal.level) {
                    grid[i] = null;
                    remaining--;
                }
            }
        });

        // 보상
        coins += order.reward;
        totalOrdersCompleted++;
        showCoinFloat(order.reward);
        saveProgress();

        order.completed = true;
        renderOrders();
        renderBoard();
        renderHUD();

        // 3초 후 새 주문
        setTimeout(() => {
            orders[orderIdx] = generateOrder();
            renderOrders();
        }, ORDER_RESPAWN_DELAY);
    }

    // ===== 생성기 렌더링 =====
    function renderGenerators() {
        generators.innerHTML = '';

        generatorStates.forEach((gs, idx) => {
            const chain = CHAINS[gs.chainIdx];
            const btn = document.createElement('button');
            btn.className = 'generator-btn';

            const isCooling = gs.cooldownRemaining > 0;
            const isDisabled = energy < ENERGY_COST || getEmptyCells().length === 0 || gs.capacity <= 0 || isCooling;
            if (isDisabled) btn.classList.add('disabled');

            let statusText = '';
            if (isCooling) {
                const min = Math.floor(gs.cooldownRemaining / 60);
                const sec = gs.cooldownRemaining % 60;
                statusText = `⏳${min}:${sec.toString().padStart(2, '0')}`;
            } else {
                statusText = `${gs.capacity}/${gs.maxCapacity}`;
            }

            btn.innerHTML = `
                <span class="generator-emoji">${chain.items[0].emoji}</span>
                <span class="generator-name">${chain.name}</span>
                <span class="generator-cost">⚡${ENERGY_COST}</span>
                <span class="generator-capacity">${statusText}</span>
            `;

            if (isCooling) {
                const coolPct = ((GENERATOR_COOLDOWN - gs.cooldownRemaining) / GENERATOR_COOLDOWN) * 100;
                const coolbar = document.createElement('div');
                coolbar.className = 'cooldown-bar';
                coolbar.style.width = coolPct + '%';
                btn.appendChild(coolbar);
                btn.classList.add('cooling');
            }

            btn.addEventListener('click', () => generateItem(idx));
            generators.appendChild(btn);
        });
    }

    // ===== 아이템 생성 (생성기) =====
    function generateItem(genIdx) {
        if (sellMode) return;
        const gs = generatorStates[genIdx];
        if (!gs) return;
        if (gs.cooldownRemaining > 0) return;
        if (gs.capacity <= 0) return;
        if (energy < ENERGY_COST) return;

        const empty = getEmptyCells();
        if (empty.length === 0) return;

        // 에너지 차감
        energy -= ENERGY_COST;
        // 용량 차감
        gs.capacity--;

        // RNG 드랍 테이블
        const chain = CHAINS[gs.chainIdx];
        const droppedItem = rollDropTable(gs.chainIdx);

        // 배치 위치 결정: 하단 UI에서 생성 → 보드 전체 랜덤
        const cellIdx = empty[Math.floor(Math.random() * empty.length)];
        grid[cellIdx] = { chain: droppedItem.chain, level: droppedItem.level, locked: false };

        renderBoard();
        renderHUD();
        renderOrders();
        renderGenerators();

        // 생성 애니메이션
        const cell = board.children[cellIdx];
        if (cell) {
            cell.classList.add('spawned');
            setTimeout(() => cell.classList.remove('spawned'), 400);
        }

        // 용량 0이면 쿨타임 진입
        if (gs.capacity <= 0) {
            gs.cooldownRemaining = GENERATOR_COOLDOWN;
            renderGenerators();
        }

        checkGameOver();
    }

    function rollDropTable(chainIdx) {
        const chain = CHAINS[chainIdx];
        const table = [];

        // 메인 드랍
        chain.dropTable.forEach(d => {
            table.push({ chain: chainIdx, level: d.level, weight: d.weight });
        });

        // 크로스 드랍
        if (chain.crossDrop) {
            chain.crossDrop.forEach(cd => {
                const ci = findChainIdx(cd.chainId);
                if (ci >= 0) {
                    table.push({ chain: ci, level: cd.level, weight: cd.weight });
                }
            });
        }

        const totalWeight = table.reduce((sum, d) => sum + d.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const entry of table) {
            rand -= entry.weight;
            if (rand <= 0) {
                return { chain: entry.chain, level: entry.level };
            }
        }
        return { chain: chainIdx, level: 0 }; // fallback
    }

    // ===== 합성 (머지) =====
    function merge(fromIdx, toIdx) {
        const a = grid[fromIdx];
        const b = grid[toIdx];

        if (!canMerge(a, b)) return false;

        // 합성!
        const newLevel = a.level + 1;
        grid[toIdx] = { chain: a.chain, level: newLevel, locked: false };
        grid[fromIdx] = null;

        // 점수
        const pts = (newLevel + 1) * 10;
        score += pts;

        // 애니메이션
        renderBoard();
        renderHUD();

        const cell = board.children[toIdx];
        if (cell) {
            cell.classList.add('merged');
            spawnParticles(cell, CHAINS[a.chain].color);
            setTimeout(() => cell.classList.remove('merged'), 500);
        }

        // 1. 보상 드랍: 경험치별 1개 주변 빈 칸에 스폰
        spawnStarReward(toIdx);

        // 2. 장애물 파괴: 상하좌우 4방향
        destroyAdjacentObstacles(toIdx);

        // 3. 주문 체크
        renderOrders();

        // 4. 게임오버 체크
        checkGameOver();

        return true;
    }

    // 경험치별 보상 스폰
    function spawnStarReward(centerIdx) {
        const surrounding = getSurrounding8(centerIdx);
        const emptySurrounding = surrounding.filter(i => grid[i] === null);

        if (emptySurrounding.length > 0) {
            const spawnIdx = emptySurrounding[Math.floor(Math.random() * emptySurrounding.length)];
            grid[spawnIdx] = { type: 'star' };
            renderBoard();
            const spawnCell = board.children[spawnIdx];
            if (spawnCell) {
                spawnCell.classList.add('spawned');
                setTimeout(() => spawnCell.classList.remove('spawned'), 400);
            }
        }
        // 빈 곳 없으면 스킵
    }

    // 인접 장애물 파괴
    function destroyAdjacentObstacles(idx) {
        const adj = getAdjacentCells(idx);
        let destroyed = false;

        adj.forEach(adjIdx => {
            if (isObstacle(grid[adjIdx])) {
                grid[adjIdx].hp--;
                if (grid[adjIdx].hp <= 0) {
                    grid[adjIdx] = null; // 파괴 → 빈 타일
                    destroyed = true;
                }
            }
        });

        if (destroyed) {
            renderBoard();
        }
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

            p.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 },
            ], { duration: 400, easing: 'ease-out', fill: 'forwards' });

            container.appendChild(p);
        }

        cell.appendChild(container);
        setTimeout(() => container.remove(), 500);
    }

    // ===== 코인 플로팅 =====
    function showCoinFloat(amount) {
        const float = document.createElement('div');
        float.className = 'coin-float';
        float.textContent = `+${amount} 💰`;

        const coinDisplay = $('coinDisplay');
        coinDisplay.appendChild(float);

        float.animate([
            { transform: 'translateY(0)', opacity: 1 },
            { transform: 'translateY(-40px)', opacity: 0 },
        ], { duration: 800, easing: 'ease-out', fill: 'forwards' });

        setTimeout(() => float.remove(), 900);
    }

    // ===== 아이템 판매 =====
    function sellItem(idx) {
        const cellData = grid[idx];
        if (!cellData) return;
        if (isLocked(cellData)) return; // 잠긴 아이템 판매 불가
        if (isObstacle(cellData)) return; // 장애물 판매 불가

        let price = 0;
        if (isStar(cellData)) {
            price = STAR_ITEM.sellPrice;
        } else if (isItem(cellData)) {
            price = CHAINS[cellData.chain].items[cellData.level].sellPrice;
        } else {
            return;
        }

        // 판매 애니메이션
        const cell = board.children[idx];
        cell.classList.add('sold');

        coins += price;
        showCoinFloat(price);

        setTimeout(() => {
            grid[idx] = null;
            renderBoard();
            renderHUD();
            renderOrders();
            saveProgress();
        }, 300);
    }

    // ===== 빵집 업그레이드 =====
    function upgradeShop() {
        if (shopLevel >= SHOP_LEVELS.length - 1) return;

        const cost = SHOP_LEVELS[shopLevel + 1].upgradeCost;
        if (coins < cost) return;

        coins -= cost;
        shopLevel++;
        energy = getMaxEnergy();

        // 생성기 재초기화 (새로운 체인이 해금될 수 있음)
        initGenerators();

        saveProgress();
        renderHUD();
        renderGenerators();
        renderOrders();
        renderBoard();

        showUpgradeAnimation();
    }

    function showUpgradeAnimation() {
        const overlay = document.createElement('div');
        overlay.className = 'upgrade-overlay';
        const shopData = SHOP_LEVELS[shopLevel];
        overlay.innerHTML = `
            <div class="upgrade-content">
                <div class="upgrade-emoji">${shopData.emoji}</div>
                <h2 class="upgrade-title">빵집 업그레이드!</h2>
                <p class="upgrade-desc">${shopData.name} (Lv.${shopLevel + 1})</p>
                <p class="upgrade-bonus">에너지 최대치 +${ENERGY_PER_LEVEL} | 보상 ×${shopData.rewardMult}</p>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', () => {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 400);
        });
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 400);
        }, 2500);
    }

    // ===== 게임 오버 체크 =====
    function checkGameOver() {
        if (getEmptyCells().length > 0) return;

        // 합성 가능한 쌍이 있는지 체크
        for (let i = 0; i < TOTAL_CELLS; i++) {
            if (!isItem(grid[i])) continue;
            const adj = getAdjacentCells(i);
            for (const n of adj) {
                if (canMerge(grid[i], grid[n])) {
                    return; // 합성 가능 → 아직 끝 아님
                }
            }
        }

        setTimeout(() => showGameOver(), 300);
    }

    function showGameOver() {
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('merge2_best', bestScore.toString());
        }
        $('overScore').textContent = `점수: ${score}`;
        $('overBest').textContent = `최고 기록: ${bestScore}`;
        $('overOrders').textContent = `완료한 주문: ${totalOrdersCompleted}개`;
        overScreen.classList.remove('hidden');
    }

    // ===== 저장 =====
    function saveProgress() {
        localStorage.setItem('merge2_coins', coins.toString());
        localStorage.setItem('merge2_shop', shopLevel.toString());
        localStorage.setItem('merge2_orders', totalOrdersCompleted.toString());
    }

    // ===== 드래그 & 드롭: 마우스 =====
    function onDragStart(e, idx) {
        if (sellMode) {
            sellItem(idx);
            return;
        }

        const cellData = grid[idx];
        if (!canDrag(cellData)) return;
        e.preventDefault();

        dragging = true;
        dragFrom = idx;

        createDragGhost(idx, e.clientX, e.clientY);

        const cell = board.children[idx];
        cell.classList.add('dragging');
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
        if (sellMode) {
            sellItem(idx);
            return;
        }

        const cellData = grid[idx];
        if (!canDrag(cellData)) return;
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
        const cellData = grid[idx];
        let emoji = '';
        if (isStar(cellData)) {
            emoji = STAR_ITEM.emoji;
        } else if (isItem(cellData)) {
            emoji = CHAINS[cellData.chain].items[cellData.level].emoji;
        }

        dragGhost = document.createElement('div');
        dragGhost.className = 'drag-ghost';
        dragGhost.textContent = emoji;
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
        if (!isItem(fromItem)) return;

        const cells = board.querySelectorAll('.cell');
        for (let i = 0; i < TOTAL_CELLS; i++) {
            if (i === fromIdx) continue;
            if (canMerge(fromItem, grid[i])) {
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

            // 상황 D: 동일 아이템 머지 (잠긴 아이템과도 가능)
            if (canMerge(fromItem, toItem)) {
                merge(dragFrom, targetIdx);
            }
            // 상황 A: 빈 타일로 이동
            else if (toItem === null) {
                grid[targetIdx] = grid[dragFrom];
                grid[dragFrom] = null;
                renderBoard();
                renderHUD();
                renderOrders();
            }
            // 상황 C: 다른 종류/레벨 → 바운스백
            else {
                bounceBack(dragFrom);
            }
        } else {
            // 상황 B: 원래 자리 또는 보드 밖 → 제자리
            bounceBack(dragFrom);
        }

        clearHighlights();
        dragging = false;
        dragFrom = -1;
    }

    function bounceBack(idx) {
        renderBoard();
        const cell = board.children[idx];
        if (cell) {
            cell.classList.add('bounce-back');
            setTimeout(() => cell.classList.remove('bounce-back'), 400);
        }
    }

    // ===== 판매 모드 토글 =====
    function toggleSellMode() {
        sellMode = !sellMode;
        sellModeBtn.classList.toggle('active', sellMode);
        renderBoard();
    }

    // ===== 버튼 이벤트 =====
    $('startBtn').addEventListener('click', () => {
        startScreen.classList.add('hidden');
        gameContainer.style.display = 'flex';
        initGame();
    });

    $('retryBtn').addEventListener('click', () => {
        overScreen.classList.add('hidden');
        initGame();
    });

    upgradeBtn.addEventListener('click', upgradeShop);
    sellModeBtn.addEventListener('click', toggleSellMode);

    // 도움말 모달
    const helpScreen = $('helpScreen');
    $('helpBtn').addEventListener('click', () => {
        helpScreen.classList.remove('hidden');
    });
    $('helpClose').addEventListener('click', () => {
        helpScreen.classList.add('hidden');
    });
    $('helpOkBtn').addEventListener('click', () => {
        helpScreen.classList.add('hidden');
    });
    helpScreen.addEventListener('click', (e) => {
        if (e.target === helpScreen) {
            helpScreen.classList.add('hidden');
        }
    });

    // ===== 초기 상태 =====
    gameContainer.style.display = 'none';

})();
