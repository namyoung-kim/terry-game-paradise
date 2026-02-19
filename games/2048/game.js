// ===== 2048 (5×5) =====
(() => {
    'use strict';

    const SIZE = 5;
    const WIN_VALUE = 2048;

    // DOM
    const boardEl = document.getElementById('board');
    const scoreEl = document.getElementById('currentScore');
    const bestEl = document.getElementById('bestScore');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayScore = document.getElementById('overlayScore');
    const restartBtn = document.getElementById('restartBtn');

    // State
    let grid, score, bestScore, won, moved;

    bestScore = parseInt(localStorage.getItem('2048_best_5x5') || '0');
    bestEl.textContent = bestScore;

    // ===== Init =====
    function init() {
        grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        score = 0;
        won = false;
        scoreEl.textContent = '0';
        overlay.classList.add('hidden');
        addRandom();
        addRandom();
        render();
    }

    function addRandom() {
        const empty = [];
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++)
                if (grid[r][c] === 0) empty.push({ r, c });
        if (empty.length === 0) return;
        const cell = empty[Math.floor(Math.random() * empty.length)];
        grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    }

    // ===== Render =====
    function render() {
        boardEl.innerHTML = '';
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const val = grid[r][c];
                const cell = document.createElement('div');
                cell.className = 'cell';
                if (val > 0) {
                    cell.textContent = val;
                    if (val <= 2048) {
                        cell.dataset.value = val;
                    } else {
                        cell.classList.add('high-value');
                    }
                }
                boardEl.appendChild(cell);
            }
        }
    }

    function renderWithAnim(newTiles, mergedTiles) {
        render();
        const cells = boardEl.querySelectorAll('.cell');
        newTiles.forEach(({ r, c }) => {
            cells[r * SIZE + c].classList.add('pop');
        });
        mergedTiles.forEach(({ r, c }) => {
            cells[r * SIZE + c].classList.add('merge');
        });
    }

    // ===== Slide Logic =====
    function slideRow(row) {
        const merged = [];
        // filter zeros
        let arr = row.filter(v => v !== 0);
        const result = [];
        let i = 0;
        while (i < arr.length) {
            if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
                const val = arr[i] * 2;
                result.push(val);
                score += val;
                merged.push(result.length - 1);
                if (val >= WIN_VALUE) won = true;
                i += 2;
            } else {
                result.push(arr[i]);
                i++;
            }
        }
        while (result.length < SIZE) result.push(0);
        return { result, merged };
    }

    function move(dir) {
        moved = false;
        const mergedTiles = [];

        if (dir === 'left' || dir === 'right') {
            for (let r = 0; r < SIZE; r++) {
                let row = [...grid[r]];
                if (dir === 'right') row.reverse();
                const { result, merged } = slideRow(row);
                if (dir === 'right') result.reverse();
                for (let c = 0; c < SIZE; c++) {
                    if (grid[r][c] !== result[c]) moved = true;
                    grid[r][c] = result[c];
                }
                merged.forEach(idx => {
                    const cc = dir === 'right' ? SIZE - 1 - idx : idx;
                    mergedTiles.push({ r, c: cc });
                });
            }
        } else {
            for (let c = 0; c < SIZE; c++) {
                let col = [];
                for (let r = 0; r < SIZE; r++) col.push(grid[r][c]);
                if (dir === 'down') col.reverse();
                const { result, merged } = slideRow(col);
                if (dir === 'down') result.reverse();
                for (let r = 0; r < SIZE; r++) {
                    if (grid[r][c] !== result[r]) moved = true;
                    grid[r][c] = result[r];
                }
                merged.forEach(idx => {
                    const rr = dir === 'down' ? SIZE - 1 - idx : idx;
                    mergedTiles.push({ r: rr, c });
                });
            }
        }

        if (moved) {
            addRandom();
            // find new tile position
            const newTiles = [];
            const cells = boardEl.querySelectorAll('.cell');
            for (let r = 0; r < SIZE; r++)
                for (let c = 0; c < SIZE; c++) {
                    const oldVal = cells[r * SIZE + c]?.textContent || '';
                    if (grid[r][c] !== 0 && oldVal === '') {
                        newTiles.push({ r, c });
                    }
                }

            scoreEl.textContent = score;
            if (score > bestScore) {
                bestScore = score;
                bestEl.textContent = bestScore;
                localStorage.setItem('2048_best_5x5', bestScore);
            }
            renderWithAnim(newTiles, mergedTiles);

            if (won) {
                setTimeout(() => showOverlay('🎉 2048 달성!', true), 300);
            } else if (isGameOver()) {
                setTimeout(() => showOverlay('GAME OVER', false), 300);
            }
        }
    }

    function isGameOver() {
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) return false;
                if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return false;
                if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return false;
            }
        return true;
    }

    function showOverlay(title, isWin) {
        overlayTitle.textContent = title;
        overlayScore.textContent = `SCORE: ${score}`;
        overlay.classList.remove('hidden');
    }

    // ===== Input: Keyboard =====
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft': e.preventDefault(); move('left'); break;
            case 'ArrowRight': e.preventDefault(); move('right'); break;
            case 'ArrowUp': e.preventDefault(); move('up'); break;
            case 'ArrowDown': e.preventDefault(); move('down'); break;
        }
    });

    // ===== Input: Touch Swipe =====
    let touchStartX, touchStartY;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (touchStartX == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        if (Math.max(absDx, absDy) < 30) return;

        if (absDx > absDy) {
            move(dx > 0 ? 'right' : 'left');
        } else {
            move(dy > 0 ? 'down' : 'up');
        }
        touchStartX = null;
    }, { passive: true });

    // ===== Restart =====
    restartBtn.addEventListener('click', init);

    // Default key scroll prevention
    window.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });

    // ===== Start =====
    init();
})();
