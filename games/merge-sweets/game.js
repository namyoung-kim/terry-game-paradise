// ===== 머지스위츠 (Merge Sweets) — Strategic Stage Puzzle =====
(() => {
    'use strict';

    // ========== CONSTANTS ==========
    const COLS = 7;
    const ROWS = 9;
    const TOTAL = COLS * ROWS;

    // ========== ITEM CHAINS ==========
    const CHAINS = {
        bread: {
            name: '빵', color: '#fbbf24',
            items: [
                { emoji: '🌾', name: '밀' },
                { emoji: '🫗', name: '반죽' },
                { emoji: '🍞', name: '빵' },
                { emoji: '🥖', name: '바게트' },
                { emoji: '🎂', name: '완성빵' },
            ],
        },
        fruit: {
            name: '과일', color: '#34d399',
            items: [
                { emoji: '🍒', name: '체리' },
                { emoji: '🍓', name: '딸기' },
                { emoji: '🍇', name: '포도' },
                { emoji: '🍋', name: '레몬' },
            ],
        },
    };

    // Special items
    const SPECIAL = {
        scissors: { emoji: '✂️', name: '가위' },
        joker: { emoji: '🃏', name: '조커' },
    };

    // ========== MANAGERS ==========
    const MANAGERS = [
        {
            id: 'patissier',
            name: '수석 파티시에',
            avatar: '👨‍🍳',
            skillName: '차원교환',
            skillEmoji: '🔄',
            desc: '두 아이템의 위치를 교환합니다. AP를 소모하지 않습니다.',
            maxUses: 3,
        },
        {
            id: 'logistics',
            name: '물류 매니저',
            avatar: '📦',
            skillName: '한계압축',
            skillEmoji: '📌',
            desc: 'L1 아이템 2개를 하나의 슬롯에 스택합니다.',
            maxUses: 2,
        },
        {
            id: 'barista',
            name: '바리스타',
            avatar: '☕',
            skillName: '큐 삭제',
            skillEmoji: '🗑️',
            desc: '다음 드롭 큐에서 원치 않는 아이템 1개를 삭제합니다.',
            maxUses: 2,
        },
    ];

    // ========== STAGE DATA ==========
    const STAGES = [
        // ----- Stage 1 (Tutorial) -----
        {
            id: 1,
            ap: 25,
            objective: [{ chain: 'bread', level: 2, count: 1 }], // 빵 1개
            generators: [{ chain: 'bread', emoji: '🏭' }],
            queue: ['bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0',
                'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0',
                'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0'],
            cobwebs: [],
            initialItems: [],
        },
        // ----- Stage 2 -----
        {
            id: 2,
            ap: 30,
            objective: [{ chain: 'bread', level: 2, count: 2 }], // 빵 2개
            generators: [{ chain: 'bread', emoji: '🏭' }],
            queue: ['bread:0', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0',
                'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0',
                'bread:0', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0'],
            cobwebs: [],
            initialItems: [],
        },
        // ----- Stage 3 -----
        {
            id: 3,
            ap: 30,
            objective: [{ chain: 'bread', level: 3, count: 1 }], // 바게트 1개
            generators: [{ chain: 'bread', emoji: '🏭' }],
            queue: ['bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:1',
                'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0',
                'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0'],
            cobwebs: [{ idx: 30, chain: 'bread', level: 1 }], // 중앙에 거미줄(반죽)
            initialItems: [],
        },
        // ----- Stage 4 -----
        {
            id: 4,
            ap: 35,
            objective: [
                { chain: 'bread', level: 2, count: 1 },
                { chain: 'fruit', level: 1, count: 1 },
            ],
            generators: [
                { chain: 'bread', emoji: '🏭' },
                { chain: 'fruit', emoji: '🌳' },
            ],
            queue: ['bread:0', 'bread:0', 'fruit:0', 'bread:0', 'bread:1', 'fruit:0', 'bread:0', 'fruit:0', 'bread:0', 'bread:0',
                'fruit:0', 'bread:1', 'bread:0', 'fruit:0', 'bread:0', 'bread:0', 'fruit:1', 'bread:0', 'bread:0', 'fruit:0',
                'bread:0', 'bread:1', 'fruit:0', 'bread:0', 'bread:0', 'fruit:0', 'bread:0', 'bread:1', 'fruit:0', 'bread:0',
                'bread:0', 'fruit:0', 'bread:0', 'bread:0', 'fruit:1'],
            cobwebs: [],
            initialItems: [],
        },
        // ----- Stage 5 -----
        {
            id: 5,
            ap: 35,
            objective: [
                { chain: 'bread', level: 3, count: 1 },
                { chain: 'fruit', level: 2, count: 1 },
            ],
            generators: [
                { chain: 'bread', emoji: '🏭' },
                { chain: 'fruit', emoji: '🌳' },
            ],
            queue: ['bread:0', 'fruit:0', 'bread:0', 'bread:1', 'fruit:0', 'bread:0', 'fruit:0', 'bread:0', 'bread:1', 'fruit:0',
                'bread:0', 'fruit:0', 'bread:1', 'bread:0', 'fruit:0', 'bread:0', 'fruit:1', 'bread:0', 'bread:1', 'fruit:0',
                'bread:0', 'fruit:0', 'bread:0', 'bread:1', 'fruit:0', 'bread:0', 'fruit:0', 'bread:1', 'bread:0', 'fruit:1',
                'bread:0', 'fruit:0', 'bread:0', 'bread:1', 'fruit:0'],
            cobwebs: [
                { idx: 24, chain: 'bread', level: 0 },
                { idx: 38, chain: 'fruit', level: 0 },
            ],
            initialItems: [],
        },
        // ----- Stage 6 -----
        {
            id: 6,
            ap: 40,
            objective: [
                { chain: 'bread', level: 4, count: 1 },
            ],
            generators: [
                { chain: 'bread', emoji: '🏭' },
            ],
            queue: ['bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:1', 'bread:0',
                'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1',
                'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:1',
                'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0'],
            cobwebs: [
                { idx: 10, chain: 'bread', level: 1 },
                { idx: 52, chain: 'bread', level: 1 },
            ],
            initialItems: [
                { idx: 31, chain: 'bread', level: 0 },
            ],
        },
        // ----- Stage 7 -----
        {
            id: 7,
            ap: 40,
            objective: [
                { chain: 'fruit', level: 3, count: 1 },
                { chain: 'bread', level: 2, count: 2 },
            ],
            generators: [
                { chain: 'bread', emoji: '🏭' },
                { chain: 'fruit', emoji: '🌳' },
            ],
            queue: ['fruit:0', 'bread:0', 'fruit:0', 'bread:0', 'fruit:0', 'bread:1', 'fruit:0', 'bread:0', 'fruit:1', 'bread:0',
                'fruit:0', 'bread:0', 'fruit:0', 'bread:1', 'fruit:0', 'bread:0', 'fruit:1', 'bread:0', 'fruit:0', 'bread:0',
                'fruit:0', 'bread:1', 'fruit:0', 'bread:0', 'fruit:0', 'bread:0', 'fruit:1', 'bread:0', 'fruit:0', 'bread:1',
                'fruit:0', 'bread:0', 'fruit:0', 'bread:0', 'fruit:1', 'bread:0', 'fruit:0', 'bread:0', 'fruit:0', 'bread:1'],
            cobwebs: [
                { idx: 3, chain: 'fruit', level: 0 },
                { idx: 59, chain: 'fruit', level: 0 },
            ],
            initialItems: [],
        },
        // ----- Stage 8 -----
        {
            id: 8,
            ap: 35,
            objective: [
                { chain: 'bread', level: 3, count: 2 },
            ],
            generators: [
                { chain: 'bread', emoji: '🏭' },
            ],
            queue: ['bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:1', 'bread:0',
                'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1',
                'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0', 'bread:0', 'bread:1',
                'bread:0', 'bread:0', 'bread:0', 'bread:1', 'bread:0'],
            cobwebs: [
                { idx: 23, chain: 'bread', level: 0 },
                { idx: 25, chain: 'bread', level: 0 },
                { idx: 37, chain: 'bread', level: 0 },
                { idx: 39, chain: 'bread', level: 0 },
            ],
            initialItems: [
                { idx: 31, chain: 'bread', level: 1 },
            ],
            specialDrops: [{ queueIdx: 15, type: 'scissors' }],
        },
        // ----- Stage 9 -----
        {
            id: 9,
            ap: 45,
            objective: [
                { chain: 'bread', level: 3, count: 1 },
                { chain: 'fruit', level: 3, count: 1 },
            ],
            generators: [
                { chain: 'bread', emoji: '🏭' },
                { chain: 'fruit', emoji: '🌳' },
            ],
            queue: ['bread:0', 'fruit:0', 'bread:0', 'fruit:0', 'bread:1', 'fruit:0', 'bread:0', 'fruit:1', 'bread:0', 'fruit:0',
                'bread:1', 'fruit:0', 'bread:0', 'fruit:0', 'bread:0', 'fruit:1', 'bread:0', 'fruit:0', 'bread:1', 'fruit:0',
                'bread:0', 'fruit:0', 'bread:0', 'fruit:1', 'bread:1', 'fruit:0', 'bread:0', 'fruit:0', 'bread:0', 'fruit:1',
                'bread:0', 'fruit:0', 'bread:1', 'fruit:0', 'bread:0', 'fruit:0', 'bread:0', 'fruit:1', 'bread:0', 'fruit:0',
                'bread:1', 'fruit:0', 'bread:0', 'fruit:0', 'bread:0'],
            cobwebs: [
                { idx: 0, chain: 'bread', level: 0 },
                { idx: 6, chain: 'fruit', level: 0 },
                { idx: 56, chain: 'bread', level: 0 },
                { idx: 62, chain: 'fruit', level: 0 },
            ],
            initialItems: [],
        },
        // ----- Stage 10 (Boss stage) -----
        {
            id: 10,
            ap: 50,
            objective: [
                { chain: 'bread', level: 4, count: 1 },
                { chain: 'fruit', level: 3, count: 1 },
            ],
            generators: [
                { chain: 'bread', emoji: '🏭' },
                { chain: 'fruit', emoji: '🌳' },
            ],
            queue: ['bread:0', 'fruit:0', 'bread:1', 'fruit:0', 'bread:0', 'fruit:0', 'bread:0', 'fruit:1', 'bread:0', 'fruit:0',
                'bread:1', 'fruit:0', 'bread:0', 'fruit:0', 'bread:0', 'fruit:1', 'bread:1', 'fruit:0', 'bread:0', 'fruit:0',
                'bread:0', 'fruit:0', 'bread:1', 'fruit:0', 'bread:0', 'fruit:1', 'bread:0', 'fruit:0', 'bread:1', 'fruit:0',
                'bread:0', 'fruit:0', 'bread:0', 'fruit:1', 'bread:1', 'fruit:0', 'bread:0', 'fruit:0', 'bread:0', 'fruit:0',
                'bread:1', 'fruit:0', 'bread:0', 'fruit:1', 'bread:0', 'fruit:0', 'bread:0', 'fruit:0', 'bread:1', 'fruit:0'],
            cobwebs: [
                { idx: 9, chain: 'bread', level: 1 },
                { idx: 11, chain: 'fruit', level: 0 },
                { idx: 30, chain: 'bread', level: 0 },
                { idx: 32, chain: 'fruit', level: 0 },
                { idx: 51, chain: 'bread', level: 1 },
                { idx: 53, chain: 'fruit', level: 1 },
            ],
            initialItems: [
                { idx: 31, chain: 'bread', level: 0 },
            ],
            specialDrops: [
                { queueIdx: 20, type: 'joker' },
                { queueIdx: 35, type: 'scissors' },
            ],
        },
    ];

    // ========== BOARD GAME MAPS ==========
    const BOARD_GAME_MAPS = [
        // Map 1 (after Stage 1) — easy intro
        {
            tiles: [
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'bread', level: 2 }, emoji: '🍞' },
                { type: 'neutral' },
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
            ],
            deck: [1, 2, 1, 3, 2],
        },
        // Map 2
        {
            tiles: [
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'neutral' },
                { type: 'neutral' },
                { type: 'trap', penalty: 2 },
                { type: 'reward', reward: { chain: 'bread', level: 3 }, emoji: '🥖' },
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'trap', penalty: 1 },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'fruit', level: 1 }, emoji: '🍓' },
            ],
            deck: [2, 1, 3, 1, 2, 1],
        },
        // Map 3
        {
            tiles: [
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'trap', penalty: 1 },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'bread', level: 2 }, emoji: '🍞' },
                { type: 'trap', penalty: 2 },
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { chain: 'bread', level: 3 }, emoji: '🥖' },
                { type: 'neutral' },
            ],
            deck: [3, 1, 2, 2, 1, 3],
        },
        // Map 4
        {
            tiles: [
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { chain: 'fruit', level: 2 }, emoji: '🍇' },
                { type: 'neutral' },
                { type: 'trap', penalty: 2 },
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'trap', penalty: 1 },
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'bread', level: 3 }, emoji: '🥖' },
                { type: 'neutral' },
            ],
            deck: [2, 3, 1, 2, 1, 3, 1],
        },
        // Map 5
        {
            tiles: [
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'trap', penalty: 2 },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'bread', level: 3 }, emoji: '🥖' },
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'trap', penalty: 2 },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'fruit', level: 2 }, emoji: '🍇' },
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
            ],
            deck: [1, 3, 2, 1, 3, 2, 1],
        },
        // Map 6
        {
            tiles: [
                { type: 'neutral' },
                { type: 'trap', penalty: 2 },
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { chain: 'bread', level: 4 }, emoji: '🎂' },
                { type: 'neutral' },
                { type: 'trap', penalty: 2 },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { chain: 'fruit', level: 2 }, emoji: '🍇' },
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'neutral' },
            ],
            deck: [2, 1, 3, 2, 3, 1, 2, 1],
        },
        // Map 7
        {
            tiles: [
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'trap', penalty: 2 },
                { type: 'reward', reward: { chain: 'fruit', level: 3 }, emoji: '🍋' },
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'trap', penalty: 2 },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'bread', level: 3 }, emoji: '🥖' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'neutral' },
            ],
            deck: [3, 1, 2, 3, 1, 2, 1],
        },
        // Map 8
        {
            tiles: [
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'trap', penalty: 2 },
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'neutral' },
                { type: 'trap', penalty: 2 },
                { type: 'reward', reward: { chain: 'bread', level: 4 }, emoji: '🎂' },
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'fruit', level: 3 }, emoji: '🍋' },
                { type: 'neutral' },
            ],
            deck: [1, 2, 3, 1, 3, 2, 1, 2],
        },
        // Map 9
        {
            tiles: [
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'trap', penalty: 2 },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'bread', level: 3 }, emoji: '🥖' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'trap', penalty: 2 },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'fruit', level: 3 }, emoji: '🍋' },
                { type: 'neutral' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'bread', level: 4 }, emoji: '🎂' },
                { type: 'neutral' },
            ],
            deck: [2, 3, 1, 2, 1, 3, 2, 1],
        },
        // Map 10 (Boss reward)
        {
            tiles: [
                { type: 'neutral' },
                { type: 'trap', penalty: 2 },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'trap', penalty: 2 },
                { type: 'neutral' },
                { type: 'reward', reward: { chain: 'bread', level: 4 }, emoji: '🎂' },
                { type: 'trap', penalty: 1 },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'neutral' },
                { type: 'trap', penalty: 2 },
                { type: 'reward', reward: { chain: 'fruit', level: 3 }, emoji: '🍋' },
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'joker' }, emoji: '🃏' },
                { type: 'trap', penalty: 1 },
                { type: 'neutral' },
                { type: 'reward', reward: { special: 'scissors' }, emoji: '✂️' },
                { type: 'reward', reward: { chain: 'bread', level: 4 }, emoji: '🎂' },
            ],
            deck: [3, 2, 1, 3, 1, 2, 3, 1, 2],
        },
    ];

    // ========== STATE ==========
    let progress = JSON.parse(localStorage.getItem('ms_progress') || '{}');
    // progress = { maxCleared: 0, stars: { '1': 3, '2': 2, ... } }
    if (!progress.maxCleared) progress.maxCleared = 0;
    if (!progress.stars) progress.stars = {};

    // Board game inventory (persists between stages)
    let bgInventory = JSON.parse(localStorage.getItem('ms_bg_inventory') || '[]');

    let currentStage = null;
    let ap = 0;
    let grid = []; // array of TOTAL cells. Each: null | { chain, level, special?, stacked? } | 'cobweb' handled via separate array
    let cobwebData = []; // array of TOTAL: null | { chain, level }
    let queuePointer = 0;
    let selectedManagers = [];
    let skillUses = {};
    let objectiveProgress = [];
    let catItems = [null, null, null];
    let catActive = false;
    let catShownThisStage = false;

    // Interaction state
    let dragFrom = -1;
    let dragging = false;
    let dragGhost = null;
    let swapMode = false;
    let swapFirst = -1;
    let feedMode = false; // cat feed mode
    let queueDeleteMode = false;

    // Board game state
    let bgActive = false;
    let bgMap = null;
    let bgPosition = 0;
    let bgDeck = [];
    let bgRewards = [];
    let bgLog = [];
    let bgFromStageId = null;

    // ========== DOM REFS ==========
    const $ = id => document.getElementById(id);
    const stageSelectScreen = $('stageSelectScreen');
    const managerScreen = $('managerScreen');
    const gameScreen = $('gameScreen');
    const boardGameScreen = $('boardGameScreen');
    const stageList = $('stageList');
    const managerGrid = $('managerGrid');
    const pickCount = $('pickCount');
    const startStageBtn = $('startStageBtn');
    const hudStage = $('hudStage');
    const hudAP = $('hudAP');
    const hudObjective = $('hudObjective');
    const queueItemsEl = $('queueItems');
    const boardEl = $('board');
    const genButtonsEl = $('genButtons');
    const skillButtonsEl = $('skillButtons');
    const catPanel = $('catPanel');
    const catSlots = $('catSlots');
    const catAPBtn = $('catAPBtn');
    const catWebBtn = $('catWebBtn');
    const catCancelBtn = $('catCancelBtn');
    const clearOverlay = $('clearOverlay');
    const clearDetail = $('clearDetail');
    const clearStars = $('clearStars');
    const nextStageBtn = $('nextStageBtn');
    const bgEnterBtn = $('bgEnterBtn');
    const failOverlay = $('failOverlay');
    const failReason = $('failReason');
    const retryBtn = $('retryBtn');
    const backToStagesBtn = $('backToStagesBtn');
    const helpOverlay = $('helpOverlay');
    const helpBtn = $('helpBtn');
    const helpClose = $('helpClose');
    const helpOkBtn = $('helpOkBtn');
    // Board Game DOM refs
    const bgBoardEl = $('bgBoard');
    const bgDeckEl = $('bgDeck');
    const bgRewardsEl = $('bgRewards');
    const bgLogEl = $('bgLog');
    const bgFinishBtn = $('bgFinishBtn');
    const bgInvCount = $('bgInvCount');

    // ========== UTILITIES ==========
    function idxToRC(idx) { return { r: Math.floor(idx / COLS), c: idx % COLS }; }
    function rcToIdx(r, c) { return r * COLS + c; }
    function getAdjacent(idx) {
        const { r, c } = idxToRC(idx);
        const adj = [];
        if (r > 0) adj.push(rcToIdx(r - 1, c));
        if (r < ROWS - 1) adj.push(rcToIdx(r + 1, c));
        if (c > 0) adj.push(rcToIdx(r, c - 1));
        if (c < COLS - 1) adj.push(rcToIdx(r, c + 1));
        return adj;
    }
    function isEmpty(idx) { return grid[idx] === null && !cobwebData[idx]; }
    function hasItem(idx) { return grid[idx] !== null && !grid[idx].cobweb; }
    function isCobweb(idx) { return !!cobwebData[idx]; }
    function getEmptyCells() { return Array.from({ length: TOTAL }, (_, i) => i).filter(i => isEmpty(i)); }

    function parseQueueItem(str) {
        if (str.startsWith('special:')) return { special: str.split(':')[1] };
        const [chain, lvlStr] = str.split(':');
        return { chain, level: parseInt(lvlStr) };
    }

    function getItemEmoji(item) {
        if (!item) return '';
        if (item.special === 'scissors') return SPECIAL.scissors.emoji;
        if (item.special === 'joker') return SPECIAL.joker.emoji;
        return CHAINS[item.chain]?.items[item.level]?.emoji || '?';
    }

    function canMerge(a, b) {
        if (!a || !b) return false;
        if (a.special || b.special) return false; // specials handled differently
        if (a.chain !== b.chain) return false;
        if (a.level !== b.level) return false;
        if (a.level >= CHAINS[a.chain].items.length - 1) return false; // max level
        return true;
    }

    function saveProgress() {
        localStorage.setItem('ms_progress', JSON.stringify(progress));
    }

    // ========== SCREEN MANAGEMENT ==========
    function showScreen(screenEl) {
        [stageSelectScreen, managerScreen, gameScreen, boardGameScreen].forEach(s => s.classList.remove('active'));
        screenEl.classList.add('active');
    }

    // ========== STAGE SELECT ==========
    function renderStageSelect() {
        stageList.innerHTML = '';
        STAGES.forEach((stage, i) => {
            const btn = document.createElement('button');
            btn.className = 'stage-btn';
            const unlocked = i === 0 || progress.maxCleared >= i;
            if (!unlocked) btn.classList.add('locked');
            if (progress.maxCleared === i) btn.classList.add('current');
            if (progress.stars[stage.id]) btn.classList.add('cleared');

            const stars = progress.stars[stage.id] || 0;
            let starsStr = '';
            if (stars > 0) {
                for (let s = 0; s < 3; s++) starsStr += s < stars ? '⭐' : '☆';
            }

            btn.innerHTML = `${stage.id}<div class="stage-stars">${starsStr}</div>`;

            if (unlocked) {
                btn.addEventListener('click', () => openManagerSelect(stage));
            }
            stageList.appendChild(btn);
        });

        // Update inventory badge
        if (bgInvCount) {
            bgInvCount.textContent = bgInventory.length > 0 ? bgInventory.length : '';
            bgInvCount.style.display = bgInventory.length > 0 ? 'inline-flex' : 'none';
        }
    }

    // ========== MANAGER SELECT ==========
    function openManagerSelect(stage) {
        currentStage = stage;
        selectedManagers = [];
        renderManagerGrid();
        showScreen(managerScreen);
    }

    function renderManagerGrid() {
        managerGrid.innerHTML = '';
        MANAGERS.forEach(m => {
            const card = document.createElement('div');
            card.className = 'manager-card';
            if (selectedManagers.includes(m.id)) card.classList.add('selected');

            card.innerHTML = `
                <div class="manager-avatar">${m.avatar}</div>
                <div class="manager-info">
                    <div class="manager-name">${m.name}</div>
                    <div class="manager-skill">${m.skillEmoji} ${m.skillName} (${m.maxUses}회)</div>
                    <div class="manager-desc">${m.desc}</div>
                </div>
            `;

            card.addEventListener('click', () => {
                if (selectedManagers.includes(m.id)) {
                    selectedManagers = selectedManagers.filter(id => id !== m.id);
                } else if (selectedManagers.length < 2) {
                    selectedManagers.push(m.id);
                }
                renderManagerGrid();
            });

            managerGrid.appendChild(card);
        });

        pickCount.textContent = `(${selectedManagers.length}/2)`;
        startStageBtn.disabled = selectedManagers.length !== 2;
    }

    startStageBtn.addEventListener('click', () => {
        if (selectedManagers.length === 2 && currentStage) {
            startStage(currentStage);
        }
    });

    // ========== START STAGE ==========
    function startStage(stage) {
        currentStage = stage;
        ap = stage.ap;

        // Apply board game AP penalty if any
        const bgPenalty = JSON.parse(localStorage.getItem('ms_bg_penalty') || '0');
        if (bgPenalty > 0) {
            ap = Math.max(1, ap - bgPenalty);
            localStorage.setItem('ms_bg_penalty', '0');
        }

        queuePointer = 0;
        catShownThisStage = false;
        catActive = false;
        catItems = [null, null, null];
        swapMode = false;
        swapFirst = -1;
        feedMode = false;
        queueDeleteMode = false;

        // Build the full queue (inject special drops)
        const fullQueue = stage.queue.map(q => parseQueueItem(q));
        if (stage.specialDrops) {
            stage.specialDrops.forEach(sd => {
                if (sd.queueIdx < fullQueue.length) {
                    fullQueue[sd.queueIdx] = { special: sd.type };
                }
            });
        }

        // Inject board game inventory rewards into queue
        if (bgInventory.length > 0) {
            bgInventory.forEach(reward => {
                if (reward.special) {
                    fullQueue.push({ special: reward.special });
                } else if (reward.chain) {
                    fullQueue.push({ chain: reward.chain, level: reward.level });
                }
            });
            bgInventory = [];
            localStorage.setItem('ms_bg_inventory', '[]');
        }

        currentStage._parsedQueue = fullQueue;

        // Initialize skill uses
        skillUses = {};
        selectedManagers.forEach(mId => {
            const m = MANAGERS.find(mg => mg.id === mId);
            if (m) skillUses[mId] = m.maxUses;
        });

        // Initialize grid
        grid = new Array(TOTAL).fill(null);
        cobwebData = new Array(TOTAL).fill(null);

        // Place cobwebs
        stage.cobwebs.forEach(cw => {
            cobwebData[cw.idx] = { chain: cw.chain, level: cw.level };
        });

        // Place initial items
        if (stage.initialItems) {
            stage.initialItems.forEach(it => {
                grid[it.idx] = { chain: it.chain, level: it.level };
            });
        }

        // Initialize objective progress
        objectiveProgress = stage.objective.map(obj => ({ ...obj, current: 0 }));
        checkObjectiveProgress();

        showScreen(gameScreen);
        hideCatPanel();
        renderAll();
    }

    // ========== RENDERING ==========
    function renderAll() {
        renderHUD();
        renderQueue();
        renderBoard();
        renderGenerators();
        renderSkills();
    }

    function renderHUD() {
        hudStage.textContent = `Stage ${currentStage.id}`;
        hudAP.textContent = ap;

        // Animate AP color
        const apEl = hudAP.parentElement;
        if (ap <= 5) {
            apEl.style.borderColor = 'rgba(244, 114, 182, 0.5)';
            apEl.style.background = 'rgba(244, 114, 182, 0.12)';
            hudAP.style.color = '#f472b6';
        } else {
            apEl.style.borderColor = '';
            apEl.style.background = '';
            hudAP.style.color = '';
        }

        // Render objective
        let objHtml = '🎯 목표: ';
        objectiveProgress.forEach((op, i) => {
            const emoji = CHAINS[op.chain].items[op.level].emoji;
            const done = op.current >= op.count;
            objHtml += `<span class="obj-item ${done ? 'done' : ''}">${emoji}×${op.current}/${op.count}</span>`;
        });
        hudObjective.innerHTML = objHtml;
    }

    function renderQueue() {
        queueItemsEl.innerHTML = '';
        const queue = currentStage._parsedQueue;
        const showCount = Math.min(10, queue.length - queuePointer);
        for (let i = 0; i < showCount; i++) {
            const qIdx = queuePointer + i;
            if (qIdx >= queue.length) break;
            const item = queue[qIdx];
            const div = document.createElement('div');
            div.className = 'queue-item';
            if (i === 0) div.classList.add('next');
            if (queueDeleteMode && i > 0) {
                div.classList.add('deletable');
                div.addEventListener('click', () => deleteFromQueue(qIdx));
            }
            div.textContent = getItemEmoji(item);
            queueItemsEl.appendChild(div);
        }
    }

    function renderBoard() {
        // Reuse existing cells if possible
        if (boardEl.children.length !== TOTAL) {
            boardEl.innerHTML = '';
            for (let i = 0; i < TOTAL; i++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.idx = i;
                boardEl.appendChild(cell);
            }
            setupBoardEvents();
        }

        for (let i = 0; i < TOTAL; i++) {
            const cell = boardEl.children[i];
            cell.className = 'cell';
            cell.textContent = '';

            if (cobwebData[i]) {
                cell.classList.add('cobweb');
                cell.textContent = getItemEmoji(cobwebData[i]);
            } else if (grid[i]) {
                cell.textContent = getItemEmoji(grid[i]);
                if (grid[i].stacked) cell.classList.add('stacked');
                if (grid[i]._scissorsActive || grid[i]._jokerActive) cell.classList.add('special-active');
            }

            if (swapMode) {
                if (hasItem(i)) cell.classList.add('swap-highlight');
                if (i === swapFirst) {
                    cell.style.outline = '2px solid var(--sweet-purple)';
                } else {
                    cell.style.outline = '';
                }
            } else {
                cell.style.outline = '';
            }

            if (feedMode && hasItem(i)) {
                cell.classList.add('feed-highlight');
            }
        }
    }

    function renderGenerators() {
        genButtonsEl.innerHTML = '';
        currentStage.generators.forEach((gen, i) => {
            const btn = document.createElement('button');
            btn.className = 'gen-btn';
            const queueExhausted = queuePointer >= currentStage._parsedQueue.length;
            const noAP = ap <= 0;
            const noSpace = getEmptyCells().length === 0;
            btn.disabled = queueExhausted || noAP || noSpace;
            btn.innerHTML = `
                <span class="gen-emoji">${gen.emoji}</span>
                <span class="gen-name">${CHAINS[gen.chain].name}</span>
            `;
            btn.addEventListener('click', () => generateItem(i));
            genButtonsEl.appendChild(btn);
        });
    }

    function renderSkills() {
        skillButtonsEl.innerHTML = '';
        selectedManagers.forEach(mId => {
            const m = MANAGERS.find(mg => mg.id === mId);
            if (!m) return;
            const btn = document.createElement('button');
            btn.className = 'skill-btn';
            const uses = skillUses[mId] || 0;
            btn.disabled = uses <= 0;
            if (swapMode && mId === 'patissier') btn.classList.add('active-skill');
            if (queueDeleteMode && mId === 'barista') btn.classList.add('active-skill');

            btn.innerHTML = `
                <span class="skill-emoji">${m.skillEmoji}</span>
                <span class="skill-name">${m.skillName}</span>
                <span class="skill-uses">${uses}</span>
            `;
            btn.addEventListener('click', () => activateSkill(mId));
            skillButtonsEl.appendChild(btn);
        });

        // Cat button (shows when AP is low)
        if (ap <= 15 && !catShownThisStage) {
            const catBtn = document.createElement('button');
            catBtn.className = 'skill-btn';
            catBtn.innerHTML = `<span class="skill-emoji">🐱</span><span class="skill-name">고양이</span>`;
            catBtn.addEventListener('click', () => showCatPanel());
            skillButtonsEl.appendChild(catBtn);
        }
    }

    // ========== GENERATE ITEM ==========
    function generateItem(genIdx) {
        if (ap <= 0) return;
        const queue = currentStage._parsedQueue;
        if (queuePointer >= queue.length) return;
        clearSpecialActivations();
        const empties = getEmptyCells();
        if (empties.length === 0) return;

        const item = { ...queue[queuePointer] };
        queuePointer++;
        ap--;

        // Place on a random empty cell
        const targetIdx = empties[Math.floor(Math.random() * empties.length)];
        grid[targetIdx] = item;

        renderAll();

        // Flash
        const cell = boardEl.children[targetIdx];
        cell.classList.add('merge-flash');
        setTimeout(() => cell.classList.remove('merge-flash'), 350);

        checkObjectiveProgress();
        checkEndConditions();
    }

    // ========== BOARD INTERACTION (DRAG & DROP / TAP) ==========
    function setupBoardEvents() {
        // Pointer events for drag
        boardEl.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    }

    function onPointerDown(e) {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        const idx = parseInt(cell.dataset.idx);

        // Cat feed mode
        if (feedMode) {
            if (hasItem(idx)) {
                addToCatSlot(idx);
            }
            return;
        }

        // Swap mode
        if (swapMode) {
            if (hasItem(idx)) {
                handleSwapClick(idx);
            }
            return;
        }

        // Normal drag
        if (!hasItem(idx)) return;
        e.preventDefault();

        dragFrom = idx;
        dragging = false;

        // Create ghost after small threshold
        const startX = e.clientX;
        const startY = e.clientY;

        const moveFn = (me) => {
            const dx = me.clientX - startX;
            const dy = me.clientY - startY;
            if (!dragging && (Math.abs(dx) + Math.abs(dy)) > 8) {
                dragging = true;
                const item = grid[dragFrom];
                dragGhost = document.createElement('div');
                dragGhost.className = 'drag-ghost';
                dragGhost.textContent = getItemEmoji(item);
                document.body.appendChild(dragGhost);
                boardEl.children[dragFrom].classList.add('drag-source');
            }
            if (dragging && dragGhost) {
                dragGhost.style.left = me.clientX + 'px';
                dragGhost.style.top = me.clientY + 'px';

                // Highlight drop target
                for (let i = 0; i < TOTAL; i++) {
                    boardEl.children[i].classList.remove('drag-over');
                }
                const target = document.elementFromPoint(me.clientX, me.clientY);
                if (target && target.classList.contains('cell')) {
                    target.classList.add('drag-over');
                }
            }
        };

        const upFn = (ue) => {
            document.removeEventListener('pointermove', moveFn);
            document.removeEventListener('pointerup', upFn);

            // Clean highlight
            for (let i = 0; i < TOTAL; i++) {
                boardEl.children[i].classList.remove('drag-over');
                boardEl.children[i].classList.remove('drag-source');
            }

            if (dragGhost) {
                dragGhost.remove();
                dragGhost = null;
            }

            if (!dragging) {
                // Tap — handle special items
                handleTap(dragFrom);
                dragFrom = -1;
                return;
            }

            // Find drop target
            const target = document.elementFromPoint(ue.clientX, ue.clientY);
            if (target && target.classList.contains('cell')) {
                const toIdx = parseInt(target.dataset.idx);
                handleDrop(dragFrom, toIdx);
            }
            dragFrom = -1;
            dragging = false;
        };

        document.addEventListener('pointermove', moveFn);
        document.addEventListener('pointerup', upFn);
    }

    function onPointerMove(e) { /* handled inline */ }
    function onPointerUp(e) { /* handled inline */ }

    function handleTap(idx) {
        const item = grid[idx];
        if (!item) return;

        // Scissors: tap scissors then tap target
        if (item.special === 'scissors') {
            // Enter scissors mode - will handle on next tap
            grid[idx]._scissorsActive = true;
            renderBoard();
            return;
        }

        // Check if any scissors is active
        for (let i = 0; i < TOTAL; i++) {
            if (grid[i] && grid[i]._scissorsActive && i !== idx) {
                // Use scissors on tapped item
                useScissors(i, idx);
                return;
            }
        }

        // Joker: tap joker then tap target
        if (item.special === 'joker') {
            grid[idx]._jokerActive = true;
            renderBoard();
            return;
        }

        // Check if any joker is active
        for (let i = 0; i < TOTAL; i++) {
            if (grid[i] && grid[i]._jokerActive && i !== idx) {
                useJoker(i, idx);
                return;
            }
        }
    }

    function handleDrop(fromIdx, toIdx) {
        if (fromIdx === toIdx) return;
        const fromItem = grid[fromIdx];
        if (!fromItem) return;
        clearSpecialActivations();

        // Drop on cobweb: check if matching for unlock
        if (cobwebData[toIdx]) {
            const cw = cobwebData[toIdx];
            if (fromItem.chain === cw.chain && fromItem.level === cw.level) {
                // Unlock cobweb by merging
                const nextLevel = cw.level + 1;
                if (nextLevel < CHAINS[cw.chain].items.length) {
                    grid[fromIdx] = null;
                    cobwebData[toIdx] = null;
                    grid[toIdx] = { chain: cw.chain, level: nextLevel };
                    ap--; // move costs 1 AP
                    flashCell(toIdx, 'merge-flash');
                    flashCell(fromIdx, 'destroy-flash');
                } else {
                    // Max level reached — free the cobweb item, leave drag item in place
                    cobwebData[toIdx] = null;
                    grid[toIdx] = { chain: cw.chain, level: cw.level };
                    // fromItem stays where it is (not consumed)
                }
                renderAll();
                checkObjectiveProgress();
                checkEndConditions();
                return;
            }
            // Can't drop on non-matching cobweb
            return;
        }

        // Drop on empty cell: move
        if (isEmpty(toIdx)) {
            grid[toIdx] = fromItem;
            grid[fromIdx] = null;
            ap--; // move costs 1 AP
            renderAll();
            checkEndConditions();
            return;
        }

        // Drop on another item
        const toItem = grid[toIdx];
        if (!toItem) return;

        // Joker interaction
        if (fromItem.special === 'joker' && !toItem.special) {
            grid[fromIdx] = null;
            if (toItem.level < CHAINS[toItem.chain].items.length - 1) {
                grid[toIdx] = { chain: toItem.chain, level: toItem.level + 1 };
            }
            ap--;
            flashCell(toIdx, 'merge-flash');
            renderAll();
            checkObjectiveProgress();
            checkEndConditions();
            return;
        }

        if (toItem.special === 'joker' && !fromItem.special) {
            grid[toIdx] = null;
            if (fromItem.level < CHAINS[fromItem.chain].items.length - 1) {
                grid[fromIdx] = { chain: fromItem.chain, level: fromItem.level + 1 };
            }
            ap--;
            flashCell(fromIdx, 'merge-flash');
            renderAll();
            checkObjectiveProgress();
            checkEndConditions();
            return;
        }

        // Normal merge
        if (canMerge(fromItem, toItem)) {
            grid[fromIdx] = null;
            grid[toIdx] = { chain: fromItem.chain, level: fromItem.level + 1 };
            ap--; // merge = move cost
            flashCell(toIdx, 'merge-flash');

            // Check if cobweb adjacent was unlocked
            destroyAdjacentCobwebs(toIdx, grid[toIdx]);

            renderAll();
            checkObjectiveProgress();
            checkEndConditions();
            return;
        }

        // Non-matching: bounce back (no AP cost)
    }

    function destroyAdjacentCobwebs(idx, mergedItem) {
        // If a merge happens adjacent to a cobweb containing same item, destroy it
        const adj = getAdjacent(idx);
        adj.forEach(adjIdx => {
            const cw = cobwebData[adjIdx];
            if (cw && cw.chain === mergedItem.chain && cw.level === mergedItem.level) {
                cobwebData[adjIdx] = null;
                // The cobweb item disappears (already absorbed into merge chain)
                flashCell(adjIdx, 'destroy-flash');
            }
        });
    }

    function clearSpecialActivations() {
        for (let i = 0; i < TOTAL; i++) {
            if (grid[i]) {
                delete grid[i]._scissorsActive;
                delete grid[i]._jokerActive;
            }
        }
    }

    function flashCell(idx, className) {
        const cell = boardEl.children[idx];
        cell.classList.add(className);
        setTimeout(() => cell.classList.remove(className), 400);
    }

    // ========== SPECIAL TOOLS ==========
    function useScissors(scissorsIdx, targetIdx) {
        const target = grid[targetIdx];
        if (!target || target.special) return;
        if (target.level === 0) return; // Can't split L0

        // Split: one level-1 in target, one level-1 in empty cell
        const newLevel = target.level - 1;
        grid[scissorsIdx] = null; // consume scissors
        delete grid[targetIdx]._scissorsActive;
        grid[targetIdx] = { chain: target.chain, level: newLevel };

        const empties = getEmptyCells();
        if (empties.length > 0) {
            const emptyIdx = empties[Math.floor(Math.random() * empties.length)];
            grid[emptyIdx] = { chain: target.chain, level: newLevel };
            flashCell(emptyIdx, 'merge-flash');
        }

        flashCell(targetIdx, 'merge-flash');
        renderAll();
        checkObjectiveProgress();
    }

    function useJoker(jokerIdx, targetIdx) {
        const target = grid[targetIdx];
        if (!target || target.special) return;
        if (target.level >= CHAINS[target.chain].items.length - 1) return; // Max level

        grid[jokerIdx] = null; // consume joker
        grid[targetIdx] = { chain: target.chain, level: target.level + 1 };
        flashCell(targetIdx, 'merge-flash');
        renderAll();
        checkObjectiveProgress();
        checkEndConditions();
    }

    // ========== SKILLS ==========
    function activateSkill(managerId) {
        if (!skillUses[managerId] || skillUses[managerId] <= 0) return;
        clearSpecialActivations();

        if (managerId === 'patissier') {
            // Toggle swap mode
            if (swapMode) {
                swapMode = false;
                swapFirst = -1;
            } else {
                swapMode = true;
                swapFirst = -1;
                queueDeleteMode = false;
                feedMode = false;
            }
            renderAll();
        } else if (managerId === 'barista') {
            // Toggle queue delete mode
            if (queueDeleteMode) {
                queueDeleteMode = false;
            } else {
                queueDeleteMode = true;
                swapMode = false;
                feedMode = false;
            }
            renderAll();
        } else if (managerId === 'logistics') {
            // Stack: find two L1 items of same chain, merge into one slot
            useCompression();
        }
    }

    function handleSwapClick(idx) {
        if (swapFirst === -1) {
            swapFirst = idx;
            renderBoard();
        } else {
            // Swap items (no AP cost)
            const temp = grid[swapFirst];
            grid[swapFirst] = grid[idx];
            grid[idx] = temp;
            swapMode = false;
            skillUses['patissier']--;
            swapFirst = -1;
            flashCell(idx, 'merge-flash');
            renderAll();
        }
    }

    function deleteFromQueue(qIdx) {
        if (!queueDeleteMode) return;
        if (qIdx <= queuePointer) return; // can't delete already used items
        currentStage._parsedQueue.splice(qIdx, 1);
        skillUses['barista']--;
        queueDeleteMode = false;
        renderAll();
    }

    function useCompression() {
        // Find two L1 (level 0) items of same chain
        const l0Items = [];
        for (let i = 0; i < TOTAL; i++) {
            if (grid[i] && !grid[i].special && grid[i].level === 0 && !grid[i].stacked) {
                l0Items.push(i);
            }
        }

        // Group by chain
        const groups = {};
        l0Items.forEach(idx => {
            const chain = grid[idx].chain;
            if (!groups[chain]) groups[chain] = [];
            groups[chain].push(idx);
        });

        // Stack first pair found
        for (const chain in groups) {
            if (groups[chain].length >= 2) {
                const [a, b] = groups[chain];
                grid[a] = { chain, level: 0, stacked: true };
                grid[b] = null;
                skillUses['logistics']--;
                flashCell(a, 'merge-flash');
                renderAll();
                return;
            }
        }
        // No pair found — button should ideally be disabled, but gracefully return
    }

    // ========== WANDERING CAT ==========
    function showCatPanel() {
        catActive = true;
        feedMode = true;
        clearSpecialActivations();
        catItems = [null, null, null];
        swapMode = false;
        queueDeleteMode = false;
        catPanel.classList.remove('hidden');
        updateCatUI();
        renderBoard();
    }

    function hideCatPanel() {
        catActive = false;
        feedMode = false;
        catPanel.classList.add('hidden');
        renderBoard();
    }

    function addToCatSlot(idx) {
        if (!feedMode) return;
        const item = grid[idx];
        if (!item) return;

        // Find empty cat slot
        const emptySlot = catItems.indexOf(null);
        if (emptySlot === -1) return;

        catItems[emptySlot] = { idx, item: { ...item } };
        grid[idx] = null;
        renderBoard();
        updateCatUI();
    }

    function updateCatUI() {
        const slotsEls = catSlots.querySelectorAll('.cat-slot');
        catItems.forEach((ci, i) => {
            slotsEls[i].textContent = ci ? getItemEmoji(ci.item) : '';
            slotsEls[i].className = 'cat-slot' + (ci ? ' filled' : '');
        });

        const allFilled = catItems.every(ci => ci !== null);
        catAPBtn.disabled = !allFilled;
        catWebBtn.disabled = !allFilled || cobwebData.every(cw => cw === null);
    }

    catAPBtn.addEventListener('click', () => {
        if (!catItems.every(ci => ci !== null)) return;
        ap += 1;
        catItems = [null, null, null];
        catShownThisStage = true;
        hideCatPanel();
        renderAll();
    });

    catWebBtn.addEventListener('click', () => {
        if (!catItems.every(ci => ci !== null)) return;
        // Remove first cobweb found — free the trapped item onto the board
        for (let i = 0; i < TOTAL; i++) {
            if (cobwebData[i]) {
                grid[i] = { chain: cobwebData[i].chain, level: cobwebData[i].level };
                cobwebData[i] = null;
                flashCell(i, 'destroy-flash');
                break;
            }
        }
        catItems = [null, null, null];
        catShownThisStage = true;
        hideCatPanel();
        renderAll();
    });

    catCancelBtn.addEventListener('click', () => {
        // Return cat items to board
        catItems.forEach(ci => {
            if (ci) {
                // Try to put back in original position
                if (isEmpty(ci.idx)) {
                    grid[ci.idx] = ci.item;
                } else {
                    // Find any empty cell
                    const empties = getEmptyCells();
                    if (empties.length > 0) {
                        grid[empties[0]] = ci.item;
                    }
                }
            }
        });
        catItems = [null, null, null];
        hideCatPanel();
        renderAll();
    });

    // Click cat slot to return item
    catSlots.addEventListener('click', (e) => {
        const slot = e.target.closest('.cat-slot');
        if (!slot) return;
        const slotIdx = parseInt(slot.dataset.idx);
        if (catItems[slotIdx]) {
            const ci = catItems[slotIdx];
            catItems[slotIdx] = null;
            if (isEmpty(ci.idx)) {
                grid[ci.idx] = ci.item;
            } else {
                const empties = getEmptyCells();
                if (empties.length > 0) grid[empties[0]] = ci.item;
            }
            renderBoard();
            updateCatUI();
        }
    });

    // ========== OBJECTIVE & END CONDITIONS ==========
    function checkObjectiveProgress() {
        objectiveProgress.forEach(op => {
            let count = 0;
            for (let i = 0; i < TOTAL; i++) {
                if (grid[i] && !grid[i].special && grid[i].chain === op.chain && grid[i].level === op.level) {
                    count += grid[i].stacked ? 2 : 1;
                }
            }
            op.current = count;
        });

        // Check win
        const allDone = objectiveProgress.every(op => op.current >= op.count);
        if (allDone) {
            setTimeout(() => stageClear(), 300);
        }
    }

    function checkEndConditions() {
        // Check AP depletion
        if (ap <= 0) {
            // Check if any merges are possible
            const canDoAnything = checkIfMovesExist();
            if (!canDoAnything) {
                setTimeout(() => stageFail('AP가 소진되었습니다!'), 500);
                return;
            }
        }

        // Check gridlock
        if (getEmptyCells().length === 0) {
            if (!checkIfMergesExist()) {
                setTimeout(() => stageFail('보드가 가득 차서 더 이상 합성이 불가합니다!'), 500);
            }
        }
    }

    function checkIfMovesExist() {
        // Any moves or merges available (ignoring AP for merges on board)
        if (getEmptyCells().length > 0 && ap > 0) return true;
        return checkIfMergesExist();
    }

    function checkIfMergesExist() {
        // Check if any drag-merge is possible (not adjacency-restricted)
        const itemMap = new Map();
        for (let i = 0; i < TOTAL; i++) {
            if (!grid[i] || grid[i].special) continue;
            const key = `${grid[i].chain}:${grid[i].level}`;
            if (itemMap.has(key)) return true;
            itemMap.set(key, true);
        }
        // Check if joker or scissors exist
        for (let i = 0; i < TOTAL; i++) {
            if (grid[i] && grid[i].special) return true;
        }
        // Check if skills with uses remaining exist
        for (const mId in skillUses) {
            if (skillUses[mId] > 0) return true;
        }
        return false;
    }

    // ========== STAGE CLEAR / FAIL ==========
    function stageClear() {
        // Calculate stars (based on remaining AP)
        const apPercent = ap / currentStage.ap;
        let stars = 1;
        if (apPercent >= 0.5) stars = 3;
        else if (apPercent >= 0.25) stars = 2;

        // Save progress
        const stageId = currentStage.id;
        const stageIdx = STAGES.findIndex(s => s.id === stageId);
        if (stageIdx >= progress.maxCleared) {
            progress.maxCleared = stageIdx + 1;
        }
        const prevStars = progress.stars[stageId] || 0;
        if (stars > prevStars) {
            progress.stars[stageId] = stars;
        }
        saveProgress();

        // Show clear overlay
        clearDetail.textContent = `남은 AP: ${ap} / ${currentStage.ap}`;
        let starHtml = '';
        for (let i = 0; i < 3; i++) starHtml += i < stars ? '⭐' : '☆';
        clearStars.innerHTML = starHtml;

        // Hide next button if last stage
        nextStageBtn.style.display = stageIdx + 1 < STAGES.length ? 'inline-block' : 'none';

        // Show board game enter button
        const mapIdx = stageIdx;
        if (bgEnterBtn) {
            bgEnterBtn.style.display = mapIdx < BOARD_GAME_MAPS.length ? 'inline-block' : 'none';
            bgEnterBtn.dataset.mapIdx = mapIdx;
            bgEnterBtn.dataset.stageId = stageId;
        }

        clearOverlay.classList.remove('hidden');
    }

    function stageFail(reason) {
        failReason.textContent = reason;
        failOverlay.classList.remove('hidden');
    }

    nextStageBtn.addEventListener('click', () => {
        clearOverlay.classList.add('hidden');
        const nextIdx = STAGES.findIndex(s => s.id === currentStage.id) + 1;
        if (nextIdx < STAGES.length) {
            openManagerSelect(STAGES[nextIdx]);
        } else {
            showScreen(stageSelectScreen);
            renderStageSelect();
        }
    });

    // Board game enter button
    if (bgEnterBtn) {
        bgEnterBtn.addEventListener('click', () => {
            const mapIdx = parseInt(bgEnterBtn.dataset.mapIdx);
            bgFromStageId = parseInt(bgEnterBtn.dataset.stageId);
            clearOverlay.classList.add('hidden');
            startBoardGame(mapIdx);
        });
    }

    retryBtn.addEventListener('click', () => {
        failOverlay.classList.add('hidden');
        openManagerSelect(currentStage);
    });

    backToStagesBtn.addEventListener('click', () => {
        failOverlay.classList.add('hidden');
        showScreen(stageSelectScreen);
        renderStageSelect();
    });

    // ========== BOARD GAME ==========
    function startBoardGame(mapIdx) {
        bgActive = true;
        bgMap = BOARD_GAME_MAPS[mapIdx];
        bgPosition = 0;
        bgDeck = [...bgMap.deck];
        bgRewards = [];
        bgLog = ['🎲 보드게임 구역에 도착! 카드를 선택하여 이동하세요.'];

        showScreen(boardGameScreen);
        renderBoardGame();
    }

    function playCard(cardIdx) {
        if (!bgActive || cardIdx >= bgDeck.length) return;

        const steps = bgDeck[cardIdx];
        bgDeck.splice(cardIdx, 1);

        const prevPos = bgPosition;
        bgPosition = Math.min(bgPosition + steps, bgMap.tiles.length - 1);

        bgLog.push(`🃏 +${steps} 카드 사용 → ${prevPos + 1}칸 ➡ ${bgPosition + 1}칸`);

        // Apply tile effect
        const tile = bgMap.tiles[bgPosition];
        if (tile.type === 'reward') {
            const rewardEmoji = tile.emoji || '🎁';
            bgRewards.push({ ...tile.reward });
            bgLog.push(`✨ 보상 획득! ${rewardEmoji}`);
        } else if (tile.type === 'trap') {
            bgLog.push(`💥 함정! AP -${tile.penalty} 페널티`);
            // Store penalty for next stage (reduces AP at start)
            bgRewards.push({ _penalty: tile.penalty });
        }

        renderBoardGame();

        // Animate pawn movement
        const pawn = bgBoardEl.querySelector('.bg-pawn');
        if (pawn) {
            pawn.classList.add('bg-pawn-move');
            setTimeout(() => pawn.classList.remove('bg-pawn-move'), 400);
        }

        // Auto-end if no cards left
        if (bgDeck.length === 0) {
            bgLog.push('📋 모든 카드를 사용했습니다!');
            renderBoardGame();
            setTimeout(() => endBoardGame(), 800);
        }
    }

    function endBoardGame() {
        bgActive = false;

        // Process rewards: separate actual rewards from penalties
        let apPenalty = 0;
        const actualRewards = [];
        bgRewards.forEach(r => {
            if (r._penalty) {
                apPenalty += r._penalty;
            } else {
                actualRewards.push(r);
            }
        });

        // Save rewards to inventory
        bgInventory = [...bgInventory, ...actualRewards];
        localStorage.setItem('ms_bg_inventory', JSON.stringify(bgInventory));

        // Store AP penalty for next stage (we'll apply it in startStage)
        if (apPenalty > 0) {
            const penalties = JSON.parse(localStorage.getItem('ms_bg_penalty') || '0');
            localStorage.setItem('ms_bg_penalty', JSON.stringify(penalties + apPenalty));
        }

        // Show summary then go to stage select
        bgLog.push(`\n🏁 보드게임 종료! 보상 ${actualRewards.length}개 획득${apPenalty > 0 ? `, AP -${apPenalty} 페널티` : ''}`);
        renderBoardGame();

        setTimeout(() => {
            showScreen(stageSelectScreen);
            renderStageSelect();
        }, 1500);
    }

    function renderBoardGame() {
        if (!bgMap) return;

        // Render board tiles
        bgBoardEl.innerHTML = '';
        bgMap.tiles.forEach((tile, i) => {
            const div = document.createElement('div');
            div.className = 'bg-tile';
            div.classList.add(`bg-tile-${tile.type}`);

            let content = '';
            if (tile.type === 'reward') {
                content = tile.emoji || '🎁';
            } else if (tile.type === 'trap') {
                content = '💥';
            } else {
                content = `${i + 1}`;
            }

            // Mark visited
            if (i < bgPosition) {
                div.classList.add('bg-visited');
            }

            // Pawn
            if (i === bgPosition) {
                div.classList.add('bg-current');
                div.innerHTML = `<span class="bg-tile-content">${content}</span><span class="bg-pawn">🧁</span>`;
            } else {
                div.innerHTML = `<span class="bg-tile-content">${content}</span>`;
            }

            bgBoardEl.appendChild(div);
        });

        // Scroll to current position
        const currentTile = bgBoardEl.querySelector('.bg-current');
        if (currentTile) {
            currentTile.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        // Render deck (cards)
        bgDeckEl.innerHTML = '';
        if (bgDeck.length === 0) {
            bgDeckEl.innerHTML = '<span class="bg-deck-empty">카드를 모두 사용했습니다</span>';
        } else {
            bgDeck.forEach((steps, i) => {
                const card = document.createElement('button');
                card.className = 'bg-card';
                card.innerHTML = `<span class="bg-card-num">+${steps}</span><span class="bg-card-label">이동</span>`;
                card.addEventListener('click', () => playCard(i));
                bgDeckEl.appendChild(card);
            });
        }

        // Render rewards collected
        bgRewardsEl.innerHTML = '';
        const actualOnly = bgRewards.filter(r => !r._penalty);
        if (actualOnly.length > 0) {
            actualOnly.forEach(r => {
                const span = document.createElement('span');
                span.className = 'bg-reward-item';
                if (r.special === 'joker') span.textContent = '🃏';
                else if (r.special === 'scissors') span.textContent = '✂️';
                else span.textContent = getItemEmoji(r);
                bgRewardsEl.appendChild(span);
            });
        } else {
            bgRewardsEl.innerHTML = '<span class="bg-no-rewards">—</span>';
        }

        // Render log
        bgLogEl.innerHTML = '';
        bgLog.forEach(msg => {
            const p = document.createElement('p');
            p.textContent = msg;
            bgLogEl.appendChild(p);
        });
        bgLogEl.scrollTop = bgLogEl.scrollHeight;

        // Finish button
        if (bgFinishBtn) {
            bgFinishBtn.style.display = bgDeck.length > 0 ? 'inline-block' : 'none';
        }
    }

    if (bgFinishBtn) {
        bgFinishBtn.addEventListener('click', () => {
            if (bgActive) endBoardGame();
        });
    }

    // ========== HELP ==========
    helpBtn.addEventListener('click', () => helpOverlay.classList.remove('hidden'));
    helpClose.addEventListener('click', () => helpOverlay.classList.add('hidden'));
    helpOkBtn.addEventListener('click', () => helpOverlay.classList.add('hidden'));
    helpOverlay.addEventListener('click', (e) => {
        if (e.target === helpOverlay) helpOverlay.classList.add('hidden');
    });

    // ========== INIT ==========
    renderStageSelect();
    showScreen(stageSelectScreen);

})();
