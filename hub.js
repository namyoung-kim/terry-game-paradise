// ===== 태리의 게임천국 - 메인 허브 (DOM 기반) =====

// ===== 게임 목록 =====
const GAMES = [
    {
        id: 'infinite-stairs',
        name: '무한의 계단',
        emoji: '🏗️',
        description: '계단을 끝없이 올라가자!',
        path: 'games/infinite-stairs/index.html'
    },
    {
        id: 'ox-quiz',
        name: 'OX 퀴즈',
        emoji: '❓',
        description: 'O일까? X일까?',
        path: 'games/ox-quiz/index.html'
    },
    {
        id: 'math-king',
        name: '암산왕',
        emoji: '🧮',
        description: '암산의 달인에 도전!',
        path: 'games/math-king/index.html'
    },
    {
        id: 'memory-card',
        name: '카드 뒤집기',
        emoji: '🃏',
        description: '같은 그림을 찾아라!',
        path: 'games/memory-card/index.html'
    },
    {
        id: 'claw-machine',
        name: '인형뽑기',
        emoji: '🧸',
        description: '크레인으로 인형을 뽑아라!',
        path: 'games/claw-machine/index.html'
    },
    {
        id: 'whack-a-mole',
        name: '두더지 잡기',
        emoji: '🔨',
        description: '두더지를 잡아라!',
        path: 'games/whack-a-mole/index.html'
    },
    {
        id: 'snake',
        name: '뱀 게임',
        emoji: '🐍',
        description: '먹이를 먹으며 성장하자!',
        path: 'games/snake/index.html'
    },
    {
        id: '2048',
        name: '2048',
        emoji: '🧩',
        description: '타일을 합쳐 2048을 만들어라!',
        path: 'games/2048/index.html'
    },
    {
        id: 'dino-run',
        name: '공룡 점프',
        emoji: '🦖',
        description: '장애물을 피해 달려라!',
        path: 'games/dino-run/index.html'
    },
    {
        id: 'flappy-bird',
        name: '플래피버드',
        emoji: '🐦',
        description: '파이프 사이를 날아가자!',
        path: 'games/flappy-bird/index.html'
    },
    {
        id: 'tetris',
        name: '테트리스',
        emoji: '🧱',
        description: '블록을 쌓아 줄을 완성해라!',
        path: 'games/tetris/index.html'
    },
    {
        id: 'suika',
        name: '수박게임',
        emoji: '🍉',
        description: '같은 과일을 합쳐 수박을 만들자!',
        path: 'games/suika/index.html'
    }
];

// ===== DOM References =====
const titleScreen = document.getElementById('titleScreen');
const selectScreen = document.getElementById('selectScreen');
const startBtn = document.getElementById('startBtn');
const backBtn = document.getElementById('backBtn');
const gameGrid = document.getElementById('gameGrid');
const transitionOverlay = document.getElementById('transitionOverlay');

// ===== State =====
let currentScreen = 'TITLE'; // TITLE, SELECT
let selectedIndex = 0;
let transitioning = false;

// ===== 게임 카드 생성 =====
function createGameCards() {
    gameGrid.innerHTML = '';
    GAMES.forEach((game, index) => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.dataset.game = game.id;
        card.dataset.index = index;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `${game.name} - ${game.description}`);

        card.innerHTML = `
            <div class="card-emoji">${game.emoji}</div>
            <div class="card-info">
                <div class="card-name">${game.name}</div>
                <div class="card-desc">${game.description}</div>
            </div>
            <svg class="card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
            </svg>
        `;

        // 클릭/터치 이벤트
        card.addEventListener('click', () => handleCardClick(index));

        gameGrid.appendChild(card);
    });
    updateSelectedCard();
}

// ===== 화면 전환 =====
function showScreen(screen) {
    if (transitioning) return;

    currentScreen = screen;

    if (screen === 'TITLE') {
        titleScreen.classList.add('active');
        selectScreen.classList.remove('active');
    } else if (screen === 'SELECT') {
        titleScreen.classList.remove('active');
        selectScreen.classList.add('active');
        updateSelectedCard();
    }
}

// ===== 카드 선택 상태 업데이트 =====
function updateSelectedCard() {
    const cards = gameGrid.querySelectorAll('.game-card');
    cards.forEach((card, i) => {
        if (i === selectedIndex) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

// ===== 카드 클릭 핸들러 =====
function handleCardClick(index) {
    if (transitioning) return;

    if (index === selectedIndex) {
        // 이미 선택된 카드 클릭 → 게임 진입
        launchGame(index);
    } else {
        // 다른 카드 클릭 → 선택
        selectedIndex = index;
        updateSelectedCard();
    }
}

// ===== 게임 실행 =====
function launchGame(index) {
    if (transitioning) return;
    transitioning = true;

    const game = GAMES[index];

    // 전환 애니메이션
    transitionOverlay.classList.add('active');
    setTimeout(() => {
        window.location.href = game.path;
    }, 450);
}

// ===== 키보드 입력 =====
document.addEventListener('keydown', (e) => {
    if (transitioning) return;

    if (currentScreen === 'TITLE') {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showScreen('SELECT');
        }
        return;
    }

    if (currentScreen === 'SELECT') {
        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + GAMES.length) % GAMES.length;
                updateSelectedCard();
                scrollToSelected();
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % GAMES.length;
                updateSelectedCard();
                scrollToSelected();
                break;
            case 'Enter':
                e.preventDefault();
                launchGame(selectedIndex);
                break;
            case 'Escape':
                e.preventDefault();
                showScreen('TITLE');
                break;
        }
    }
});

// 기본 스크롤 방지 (방향키)
window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

// ===== 선택된 카드로 스크롤 =====
function scrollToSelected() {
    const cards = gameGrid.querySelectorAll('.game-card');
    if (cards[selectedIndex]) {
        cards[selectedIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
}

// ===== 버튼 이벤트 =====
startBtn.addEventListener('click', () => {
    if (!transitioning) showScreen('SELECT');
});

backBtn.addEventListener('click', () => {
    if (!transitioning) showScreen('TITLE');
});

// ===== 초기화 =====
createGameCards();
