// ===== 머지 스위츠 (Merge Sweets) =====
(() => {
    'use strict';

    // ===== 아이템 체인 데이터 =====
    const CHAINS = [
        {
            id: 'food',
            name: '빵',
            items: [
                { emoji: '🌾', name: '밀', sellPrice: 1 },
                { emoji: '🥚', name: '달걀', sellPrice: 2 },
                { emoji: '🍞', name: '빵', sellPrice: 5 },
                { emoji: '🧁', name: '컵케이크', sellPrice: 12 },
                { emoji: '🎂', name: '케이크', sellPrice: 25 },
                { emoji: '🍰', name: '웨딩케이크', sellPrice: 50 },
            ],
            color: '#fbbf24',
            unlockLevel: 1,
        },
        {
            id: 'plant',
            name: '식물',
            items: [
                { emoji: '🌱', name: '씨앗', sellPrice: 1 },
                { emoji: '🌿', name: '새싹', sellPrice: 2 },
                { emoji: '🌷', name: '꽃봉오리', sellPrice: 5 },
                { emoji: '🌸', name: '꽃', sellPrice: 12 },
                { emoji: '🌲', name: '나무', sellPrice: 25 },
                { emoji: '🌳', name: '큰나무', sellPrice: 50 },
            ],
            color: '#34d399',
            unlockLevel: 1,
        },
        {
            id: 'building',
            name: '건물',
            items: [
                { emoji: '🧱', name: '벽돌', sellPrice: 1 },
                { emoji: '🏚️', name: '담벼락', sellPrice: 3 },
                { emoji: '🛖', name: '오두막', sellPrice: 6 },
                { emoji: '🏠', name: '집', sellPrice: 15 },
                { emoji: '🏢', name: '빌딩', sellPrice: 30 },
                { emoji: '🏰', name: '성', sellPrice: 60 },
            ],
            color: '#fb923c',
            unlockLevel: 2,
        },
        {
            id: 'gem',
            name: '보석',
            items: [
                { emoji: '🪨', name: '조약돌', sellPrice: 2 },
                { emoji: '💎', name: '원석', sellPrice: 4 },
                { emoji: '💠', name: '보석', sellPrice: 8 },
                { emoji: '👑', name: '왕관', sellPrice: 20 },
                { emoji: '🏅', name: '메달', sellPrice: 40 },
                { emoji: '🏆', name: '트로피', sellPrice: 80 },
            ],
            color: '#a78bfa',
            unlockLevel: 3,
        },
        {
            id: 'magic',
            name: '마법',
            items: [
                { emoji: '✨', name: '먼지', sellPrice: 2 },
                { emoji: '🔮', name: '구슬', sellPrice: 4 },
                { emoji: '⭐', name: '별', sellPrice: 8 },
                { emoji: '🌙', name: '달', sellPrice: 20 },
                { emoji: '🪄', name: '마법봉', sellPrice: 40 },
                { emoji: '📖', name: '마법서', sellPrice: 80 },
            ],
            color: '#f472b6',
            unlockLevel: 5,
        },
    ];

    const GRID_SIZE = 5;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
    const BASE_MAX_ENERGY = 20;
    const ENERGY_PER_LEVEL = 5;
    const ENERGY_COST = 1;
    const ENERGY_MERGE_REWARD = 1;
    const ENERGY_REGEN_INTERVAL = 30000; // 30초
    const MAX_ORDERS = 3;

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
    const ordersContainer = $('ordersContainer');
    const upgradeBtn = $('upgradeBtn');
    const upgradeCostText = $('upgradeCostText');
    const sellModeBtn = $('sellModeBtn');

    // ===== 게임 상태 =====
    let grid = [];
    let score = 0;
    let bestScore = parseInt(localStorage.getItem('merge_best') || '0');
    let coins = parseInt(localStorage.getItem('merge_coins') || '0');
    let shopLevel = parseInt(localStorage.getItem('merge_shop') || '0');
    let energy = BASE_MAX_ENERGY;
    let orders = [];
    let sellMode = false;
    let energyTimer = null;
    let totalOrdersCompleted = parseInt(localStorage.getItem('merge_orders') || '0');

    // 드래그 상태
    let dragging = false;
    let dragFrom = -1;
    let dragGhost = null;

    // ===== 유틸리티 =====
    function getMaxEnergy() {
        return BASE_MAX_ENERGY + shopLevel * ENERGY_PER_LEVEL;
    }

    function getUnlockedChains() {
        return CHAINS.filter(c => c.unlockLevel <= shopLevel + 1);
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

    // ===== 초기화 =====
    function initGame() {
        grid = new Array(TOTAL_CELLS).fill(null);
        score = 0;
        energy = getMaxEnergy();
        orders = [];
        sellMode = false;

        // 초기 아이템 배치
        placeRandomItem();
        placeRandomItem();
        placeRandomItem();

        // 주문 생성
        for (let i = 0; i < MAX_ORDERS; i++) {
            orders.push(generateOrder());
        }

        renderBoard();
        renderHUD();
        renderGenerators();
        renderOrders();
        startEnergyRegen();
    }

    // ===== 에너지 자동 회복 =====
    function startEnergyRegen() {
        if (energyTimer) clearInterval(energyTimer);
        energyTimer = setInterval(() => {
            if (energy < getMaxEnergy()) {
                energy++;
                updateEnergy();
            }
        }, ENERGY_REGEN_INTERVAL);
    }

    // ===== 주문 생성 =====
    function generateOrder() {
        const unlocked = getUnlockedChainIndices();
        const numGoals = Math.random() < 0.4 ? 2 : 1;
        const goals = [];

        for (let g = 0; g < numGoals; g++) {
            const chainIdx = unlocked[Math.floor(Math.random() * unlocked.length)];
            const chain = CHAINS[chainIdx];
            // 요구 레벨: 빵집 레벨에 따라 증가 (최소 1, 최대 chain.items.length - 1)
            const minLevel = 1;
            const maxLevel = Math.min(2 + Math.floor(shopLevel / 2), chain.items.length - 1);
            const level = minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
            const count = level <= 2 ? (Math.random() < 0.3 ? 2 : 1) : 1;

            goals.push({ chain: chainIdx, level, count });
        }

        // 보상 계산: 레벨에 따라 기본 보상
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
            if (sellMode) cell.classList.add('sell-mode');
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

                if (sellMode) {
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
    }

    function updateEnergy() {
        const maxE = getMaxEnergy();
        const pct = (energy / maxE) * 100;
        energyFill.style.width = pct + '%';
        energyText.textContent = `${energy}/${maxE}`;

        // 생성기 활성화 상태 업데이트
        document.querySelectorAll('.generator-btn').forEach(btn => {
            if (energy < ENERGY_COST || getEmptyCells().length === 0) {
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

            order.goals.forEach(goal => {
                const current = grid.filter(cell =>
                    cell && cell.chain === goal.chain && cell.level >= goal.level
                ).length;
                const done = current >= goal.count;

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
            ordersContainer.appendChild(card);
        });
    }

    // ===== 생성기 렌더링 =====
    function renderGenerators() {
        generators.innerHTML = '';
        const unlocked = getUnlockedChainIndices();

        unlocked.forEach(chainIdx => {
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
        if (sellMode) return;
        if (energy < ENERGY_COST) return;

        const empty = getEmptyCells();
        if (empty.length === 0) return;

        energy -= ENERGY_COST;

        const cellIdx = empty[Math.floor(Math.random() * empty.length)];
        grid[cellIdx] = { chain: chainIdx, level: 0 };

        renderBoard();
        renderHUD();
        renderOrders();

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
        if (a.level >= CHAINS[a.chain].items.length - 1) return false;

        // 합성!
        const newLevel = a.level + 1;
        grid[toIdx] = { chain: a.chain, level: newLevel };
        grid[fromIdx] = null;

        // 점수
        const pts = (newLevel + 1) * 10;
        score += pts;

        // 에너지 보상
        energy = Math.min(getMaxEnergy(), energy + ENERGY_MERGE_REWARD);

        // 애니메이션
        renderBoard();
        renderHUD();

        const cell = board.children[toIdx];
        cell.classList.add('merged');
        spawnParticles(cell, CHAINS[a.chain].color);
        setTimeout(() => cell.classList.remove('merged'), 500);

        // 주문 체크
        checkOrders();

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

            p.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 },
            ], { duration: 400, easing: 'ease-out', fill: 'forwards' });

            container.appendChild(p);
        }

        cell.appendChild(container);
        setTimeout(() => container.remove(), 500);
    }

    // ===== 코인 플로팅 애니메이션 =====
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

    // ===== 주문 체크 =====
    function checkOrders() {
        let anyCompleted = false;

        orders.forEach((order, idx) => {
            if (order.completed) return;

            const allDone = order.goals.every(goal => {
                const count = grid.filter(cell =>
                    cell && cell.chain === goal.chain && cell.level >= goal.level
                ).length;
                return count >= goal.count;
            });

            if (allDone) {
                order.completed = true;
                anyCompleted = true;

                // 주문에 사용된 아이템 소비 (가장 레벨이 낮은 것부터)
                order.goals.forEach(goal => {
                    let remaining = goal.count;
                    // 정확히 해당 레벨인 아이템을 우선 소비
                    for (let i = 0; i < TOTAL_CELLS && remaining > 0; i++) {
                        if (grid[i] && grid[i].chain === goal.chain && grid[i].level === goal.level) {
                            grid[i] = null;
                            remaining--;
                        }
                    }
                    // 부족하면 더 높은 레벨 소비
                    for (let i = 0; i < TOTAL_CELLS && remaining > 0; i++) {
                        if (grid[i] && grid[i].chain === goal.chain && grid[i].level > goal.level) {
                            grid[i] = null;
                            remaining--;
                        }
                    }
                });

                // 코인 보상
                coins += order.reward;
                totalOrdersCompleted++;
                showCoinFloat(order.reward);
                saveProgress();

                // 새 주문으로 교체 (딜레이)
                setTimeout(() => {
                    orders[idx] = generateOrder();
                    renderOrders();
                    renderBoard();
                    renderHUD();
                }, 1200);
            }
        });

        if (anyCompleted) {
            renderOrders();
            renderBoard();
            renderHUD();
        } else {
            renderOrders();
        }
    }

    // ===== 아이템 판매 =====
    function sellItem(idx) {
        if (!grid[idx]) return;

        const item = grid[idx];
        const chainData = CHAINS[item.chain];
        const itemData = chainData.items[item.level];
        const price = itemData.sellPrice;

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
        energy = getMaxEnergy(); // 업그레이드 시 에너지 충전

        saveProgress();
        renderHUD();
        renderGenerators();
        renderOrders();
        renderBoard();

        // 축하 애니메이션
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

        if (row > 0) neighbors.push(idx - GRID_SIZE);
        if (row < GRID_SIZE - 1) neighbors.push(idx + GRID_SIZE);
        if (col > 0) neighbors.push(idx - 1);
        if (col < GRID_SIZE - 1) neighbors.push(idx + 1);

        return neighbors;
    }

    function showGameOver() {
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('merge_best', bestScore.toString());
        }
        $('overScore').textContent = `점수: ${score}`;
        $('overBest').textContent = `최고 기록: ${bestScore}`;
        $('overOrders').textContent = `완료한 주문: ${totalOrdersCompleted}개`;
        overScreen.classList.remove('hidden');
    }

    // ===== 저장 =====
    function saveProgress() {
        localStorage.setItem('merge_coins', coins.toString());
        localStorage.setItem('merge_shop', shopLevel.toString());
        localStorage.setItem('merge_orders', totalOrdersCompleted.toString());
    }

    // ===== 드래그 & 드롭: 마우스 =====
    function onDragStart(e, idx) {
        // 판매 모드에서는 클릭으로 판매
        if (sellMode) {
            sellItem(idx);
            return;
        }

        if (!grid[idx]) return;
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
                merge(dragFrom, targetIdx);
            } else if (!toItem) {
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
