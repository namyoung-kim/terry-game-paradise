// ===== 수박게임 (Suika Game) =====
(() => {
    'use strict';

    // ===== Canvas Setup =====
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    function W() { return canvas.width; }
    function H() { return canvas.height; }

    // ===== Colors (from theme) =====
    const COLORS = {
        bg: '#0c0c1d',
        text: '#f0f0f5',
        textSecondary: 'rgba(240,240,245,0.6)',
        textMuted: 'rgba(240,240,245,0.35)',
        accent: '#a78bfa',
        accentPink: '#f472b6',
        accentBlue: '#60a5fa',
        wall: 'rgba(255,255,255,0.12)',
        wallBorder: 'rgba(255,255,255,0.2)',
        dangerLine: 'rgba(244,114,182,0.4)',
        dangerLinePulse: 'rgba(244,114,182,0.7)',
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

    // ===== 원작 과일 진화 체계 (11단계) =====
    // 체리 → 딸기 → 포도 → 데코폰 → 감 → 사과 → 배 → 복숭아 → 파인애플 → 멜론 → 수박
    const FRUITS = [
        { name: '체리', emoji: '🍒', radius: 12, color: '#e74c3c', glow: 'rgba(231,76,60,0.4)', score: 1 },
        { name: '딸기', emoji: '🍓', radius: 16, color: '#e84393', glow: 'rgba(232,67,147,0.4)', score: 3 },
        { name: '포도', emoji: '🍇', radius: 21, color: '#6c5ce7', glow: 'rgba(108,92,231,0.4)', score: 6 },
        { name: '데코폰', emoji: '🍊', radius: 26, color: '#e67e22', glow: 'rgba(230,126,34,0.4)', score: 10 },
        { name: '감', emoji: '🥝', radius: 32, color: '#d35400', glow: 'rgba(211,84,0,0.4)', score: 15 },
        { name: '사과', emoji: '🍎', radius: 38, color: '#c0392b', glow: 'rgba(192,57,43,0.4)', score: 21 },
        { name: '배', emoji: '🍐', radius: 45, color: '#a8d84e', glow: 'rgba(168,216,78,0.4)', score: 28 },
        { name: '복숭아', emoji: '🍑', radius: 52, color: '#fd79a8', glow: 'rgba(253,121,168,0.4)', score: 36 },
        { name: '파인애플', emoji: '🍍', radius: 60, color: '#fdcb6e', glow: 'rgba(253,203,110,0.4)', score: 45 },
        { name: '멜론', emoji: '🍈', radius: 70, color: '#00b894', glow: 'rgba(0,184,148,0.4)', score: 55 },
        { name: '수박', emoji: '🍉', radius: 82, color: '#27ae60', glow: 'rgba(39,174,96,0.4)', score: 66 },
    ];

    // 드롭 가능 과일: 1~5단계만 (체리 ~ 감)
    const DROP_MAX_LEVEL = 5;

    // ===== 게임 컨테이너 (원작 비율) =====
    // 원작은 세로로 긴 박스 안에서 과일을 떨어뜨림
    function getContainer() {
        // NEXT 박스 크기를 고려해 우측 여백 확보
        const nextBoxReserve = Math.max(55, W() * 0.14);
        const maxW = Math.min(W() - nextBoxReserve * 2, 420);
        const ratio = 1.3; // height / width 비율 (원작 기준)
        const containerH = Math.min(maxW * ratio, H() * 0.78);
        const containerW = containerH / ratio;
        // 컨테이너를 약간 왼쪽으로 치우쳐 NEXT 공간 확보
        const x = (W() - containerW - nextBoxReserve) / 2 + 4;
        const y = H() - containerH - H() * 0.04;
        return { x, y, w: containerW, h: containerH };
    }

    function fruitRadius(level) {
        const c = getContainer();
        // 컨테이너 너비 420px 기준으로 스케일링
        const scale = c.w / 420;
        return FRUITS[level].radius * scale;
    }

    // ===== 물리 상수 =====
    const PHYSICS = {
        gravity: 5400,       // 3x faster falling speed
        friction: 0.3,         // 마찰 계수
        restitution: 0.2,      // 반발 계수 (낮을수록 적게 튕김)
        damping: 0.98,         // 속도 감쇠
        maxVelocity: 1200,
        substeps: 8,           // 충돌 정확도를 위한 서브스텝
        positionCorrection: 0.6, // 겹침 보정 비율
    };

    // ===== 게임 상태 =====
    let state = 'START'; // START, PLAY, OVER
    let fruits = [];
    let particles = [];
    let score = 0;
    let bestScore = parseInt(localStorage.getItem('suika_best') || '0');
    let currentFruit = 0;      // 현재 드롭할 과일 레벨
    let nextFruit = 0;         // 다음 과일 레벨
    let dropX = 0.5;           // 드롭 X 위치 (컨테이너 기준 0~1 비율)
    let canDrop = true;
    let dropCooldown = 0;
    let gameOverTimer = 0;     // 과일이 데드라인 위에 있는 시간
    const GAMEOVER_THRESHOLD = 2.0; // 2초 이상 넘으면 게임 오버

    // 마우스/터치 상태
    let pointerX = 0;
    let pointerActive = false;

    function randomDropFruit() {
        return Math.floor(Math.random() * DROP_MAX_LEVEL);
    }

    function initGame() {
        fruits = [];
        particles = [];
        score = 0;
        currentFruit = randomDropFruit();
        nextFruit = randomDropFruit();
        const c = getContainer();
        dropX = 0.5;
        pointerX = c.x + c.w * 0.5;
        canDrop = true;
        dropCooldown = 0;
        gameOverTimer = 0;
    }

    // ===== 과일 오브젝트 =====
    function createFruit(level, x, y, vx, vy) {
        return {
            level,
            x, y,
            vx: vx || 0,
            vy: vy || 0,
            r: fruitRadius(level),
            merged: false,
            justDropped: true,    // 방금 드롭됨 (게임오버 판정 제외용)
            dropTimer: 0,
        };
    }

    // ===== 드롭 =====
    function dropFruitAction() {
        if (!canDrop || state !== 'PLAY') return;

        const c = getContainer();
        const r = fruitRadius(currentFruit);
        const x = Math.max(c.x + r, Math.min(c.x + c.w - r, pointerX));
        const y = c.y + r + 5;

        fruits.push(createFruit(currentFruit, x, y, 0, 0));
        currentFruit = nextFruit;
        nextFruit = randomDropFruit();
        canDrop = false;
        dropCooldown = 0.5; // 0.5초 쿨타임
    }

    // ===== 파티클 시스템 =====
    function spawnMergeParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = 80 + Math.random() * 150;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                life: 0.6 + Math.random() * 0.3,
                maxLife: 0.6 + Math.random() * 0.3,
                r: 2 + Math.random() * 4,
                color,
            });
        }
    }

    // ===== 물리 업데이트 =====
    function updatePhysics(dt) {
        const c = getContainer();
        const subDt = dt / PHYSICS.substeps;

        for (let step = 0; step < PHYSICS.substeps; step++) {
            // 중력 적용
            for (const f of fruits) {
                f.vy += PHYSICS.gravity * subDt;

                // 속도 제한
                const speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
                if (speed > PHYSICS.maxVelocity) {
                    f.vx = (f.vx / speed) * PHYSICS.maxVelocity;
                    f.vy = (f.vy / speed) * PHYSICS.maxVelocity;
                }

                // 위치 업데이트
                f.x += f.vx * subDt;
                f.y += f.vy * subDt;

                // 속도 감쇠
                f.vx *= PHYSICS.damping;
                f.vy *= PHYSICS.damping;
            }

            // 벽 충돌
            for (const f of fruits) {
                // 좌벽
                if (f.x - f.r < c.x) {
                    f.x = c.x + f.r;
                    f.vx = Math.abs(f.vx) * PHYSICS.restitution;
                }
                // 우벽
                if (f.x + f.r > c.x + c.w) {
                    f.x = c.x + c.w - f.r;
                    f.vx = -Math.abs(f.vx) * PHYSICS.restitution;
                }
                // 바닥
                if (f.y + f.r > c.y + c.h) {
                    f.y = c.y + c.h - f.r;
                    f.vy = -Math.abs(f.vy) * PHYSICS.restitution;
                    f.vx *= (1 - PHYSICS.friction * subDt * 30);
                }
            }

            // 과일 간 충돌
            for (let i = 0; i < fruits.length; i++) {
                for (let j = i + 1; j < fruits.length; j++) {
                    const a = fruits[i];
                    const b = fruits[j];
                    if (a.merged || b.merged) continue;

                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = a.r + b.r;

                    if (dist < minDist && dist > 0.001) {
                        const nx = dx / dist;
                        const ny = dy / dist;

                        // 같은 레벨이면 합체!
                        if (a.level === b.level && a.level < FRUITS.length - 1) {
                            // 합체 처리
                            const newLevel = a.level + 1;
                            const mx = (a.x + b.x) / 2;
                            const my = (a.y + b.y) / 2;

                            a.merged = true;
                            b.merged = true;

                            const newFruit = createFruit(newLevel, mx, my, 0, -30);
                            newFruit.justDropped = false;
                            newFruit.dropTimer = 10;
                            fruits.push(newFruit);

                            score += FRUITS[newLevel].score;

                            // 파티클 효과
                            spawnMergeParticles(mx, my, FRUITS[newLevel].color, 12 + newLevel * 2);
                        } else {
                            // 반발 처리
                            const overlap = minDist - dist;

                            // 위치 보정
                            const totalMass = a.r + b.r;
                            const ratioA = b.r / totalMass;
                            const ratioB = a.r / totalMass;

                            a.x -= nx * overlap * ratioA * PHYSICS.positionCorrection;
                            a.y -= ny * overlap * ratioA * PHYSICS.positionCorrection;
                            b.x += nx * overlap * ratioB * PHYSICS.positionCorrection;
                            b.y += ny * overlap * ratioB * PHYSICS.positionCorrection;

                            // 상대 속도
                            const dvx = a.vx - b.vx;
                            const dvy = a.vy - b.vy;
                            const dvn = dvx * nx + dvy * ny;

                            if (dvn > 0) {
                                const impulse = dvn * (1 + PHYSICS.restitution) / 2;
                                a.vx -= impulse * nx * ratioA;
                                a.vy -= impulse * ny * ratioA;
                                b.vx += impulse * nx * ratioB;
                                b.vy += impulse * ny * ratioB;
                            }
                        }
                    }
                }
            }
        }

        // 합체된 과일 제거
        fruits = fruits.filter(f => !f.merged);

        // 드롭 타이머 업데이트
        for (const f of fruits) {
            if (f.justDropped) {
                f.dropTimer += dt;
                if (f.dropTimer > 0.8) {
                    f.justDropped = false;
                }
            }
        }

        // 게임 오버 체크: 데드라인 위에 과일이 있는지
        const deadlineY = c.y + c.h * 0.08;
        let aboveLine = false;
        for (const f of fruits) {
            if (!f.justDropped && f.y - f.r < deadlineY) {
                aboveLine = true;
                break;
            }
        }

        if (aboveLine) {
            gameOverTimer += dt;
            if (gameOverTimer >= GAMEOVER_THRESHOLD) {
                gameOver();
            }
        } else {
            gameOverTimer = Math.max(0, gameOverTimer - dt * 2);
        }

        // 파티클 업데이트
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.vy += 300 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }

        // 드롭 쿨타임
        if (!canDrop) {
            dropCooldown -= dt;
            if (dropCooldown <= 0) {
                canDrop = true;
            }
        }
    }

    // ===== 게임 오버 =====
    function gameOver() {
        state = 'OVER';
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('suika_best', bestScore.toString());
        }
    }

    // ===== 그리기: 컨테이너 =====
    function drawContainer() {
        const c = getContainer();

        // 컨테이너 배경
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(c.x, c.y, c.w, c.h);

        // 컨테이너 벽 (좌, 우, 하)
        ctx.strokeStyle = COLORS.wallBorder;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x, c.y + c.h);
        ctx.lineTo(c.x + c.w, c.y + c.h);
        ctx.lineTo(c.x + c.w, c.y);
        ctx.stroke();

        // 데드라인 (상단 가이드라인)
        const deadlineY = c.y + c.h * 0.08;
        const pulse = Math.sin(Date.now() * 0.004) * 0.5 + 0.5;
        const lineColor = gameOverTimer > 0
            ? `rgba(244,114,182,${0.4 + pulse * 0.4})`
            : COLORS.dangerLine;

        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.x, deadlineY);
        ctx.lineTo(c.x + c.w, deadlineY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 경고 시 텍스트
        if (gameOverTimer > 0.5) {
            const warningAlpha = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;
            ctx.globalAlpha = warningAlpha;
            const warnSize = Math.max(10, c.w * 0.035);
            ctx.font = `600 ${warnSize}px 'Pretendard Variable', sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = COLORS.accentPink;
            ctx.fillText('⚠ 위험!', c.x + c.w / 2, deadlineY - 8);
            ctx.globalAlpha = 1;
        }
    }

    // ===== 그리기: 과일 =====
    function drawFruit(f) {
        const fruit = FRUITS[f.level];

        // 글로우 효과
        const glow = ctx.createRadialGradient(f.x, f.y, f.r * 0.3, f.x, f.y, f.r * 1.8);
        glow.addColorStop(0, fruit.glow);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(f.x - f.r * 2, f.y - f.r * 2, f.r * 4, f.r * 4);

        // 과일 원형 배경
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
            f.x - f.r * 0.3, f.y - f.r * 0.3, 0,
            f.x, f.y, f.r
        );
        grad.addColorStop(0, lightenColor(fruit.color, 30));
        grad.addColorStop(1, fruit.color);
        ctx.fillStyle = grad;
        ctx.fill();

        // 테두리
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 하이라이트
        ctx.beginPath();
        ctx.arc(f.x - f.r * 0.25, f.y - f.r * 0.25, f.r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fill();

        // 이모지
        const emojiSize = f.r * 1.2;
        ctx.font = `${emojiSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fruit.emoji, f.x, f.y + 1);
    }

    // 색상 밝게
    function lightenColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, (num >> 16) + amount);
        const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
        const b = Math.min(255, (num & 0x0000FF) + amount);
        return `rgb(${r},${g},${b})`;
    }

    // ===== 그리기: 드롭 가이드 =====
    function drawDropGuide() {
        if (!canDrop || state !== 'PLAY') return;

        const c = getContainer();
        const r = fruitRadius(currentFruit);
        const x = Math.max(c.x + r, Math.min(c.x + c.w - r, pointerX));
        const y = c.y + r + 5;

        // 점선 가이드 라인
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.lineTo(x, c.y + c.h);
        ctx.stroke();
        ctx.setLineDash([]);

        // 미리보기 과일
        const fruit = FRUITS[currentFruit];
        ctx.globalAlpha = 0.7;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = fruit.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const emojiSize = r * 1.2;
        ctx.font = `${emojiSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fruit.emoji, x, y + 1);

        ctx.globalAlpha = 1;
    }

    // ===== 그리기: 다음 과일 =====
    function drawNextFruit() {
        const c = getContainer();
        const boxSize = Math.max(40, c.w * 0.15);
        const bx = c.x + c.w + 12;
        const by = c.y;

        // 라벨
        const labelSize = Math.max(9, boxSize * 0.25);
        ctx.font = `600 ${labelSize}px 'Pretendard Variable', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText('NEXT', bx + boxSize / 2, by - 6);

        // 박스
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.strokeStyle = COLORS.wallBorder;
        ctx.lineWidth = 1;
        roundRect(ctx, bx, by, boxSize, boxSize, 10, true);
        roundRect(ctx, bx, by, boxSize, boxSize, 10, false, true);

        // 다음 과일 이모지
        const fruit = FRUITS[nextFruit];
        const emojiSize = boxSize * 0.55;
        ctx.font = `${emojiSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fruit.emoji, bx + boxSize / 2, by + boxSize / 2);
    }

    // ===== 그리기: 점수 =====
    function drawScore() {
        const c = getContainer();

        // 점수 배경 박스
        const boxW = c.w;
        const boxH = Math.max(40, c.w * 0.12);
        const bx = c.x;
        const by = c.y - boxH - 8;

        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.strokeStyle = COLORS.wallBorder;
        ctx.lineWidth = 1;
        roundRect(ctx, bx, by, boxW, boxH, 10, true);
        roundRect(ctx, bx, by, boxW, boxH, 10, false, true);

        // 점수 텍스트
        const scoreSize = Math.max(16, boxH * 0.5);
        ctx.font = `800 ${scoreSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(167,139,250,0.5)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(score, bx + boxW / 2, by + boxH / 2);
        ctx.shadowBlur = 0;

        // 라벨
        const labelSize = Math.max(8, scoreSize * 0.35);
        ctx.font = `600 ${labelSize}px 'Pretendard Variable', sans-serif`;
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText('SCORE', bx + boxW / 2, by - 6);
    }

    // ===== 그리기: 파티클 =====
    function drawParticles() {
        for (const p of particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ===== 시작 화면 =====
    function drawStartScreen() {
        const titleSize = Math.max(24, Math.min(W(), H()) * 0.05);
        ctx.font = `800 ${titleSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.text;
        ctx.fillText('🍉 수박게임', W() / 2, H() * 0.30);

        const subSize = Math.max(12, titleSize * 0.4);
        ctx.font = `500 ${subSize}px 'Pretendard Variable', sans-serif`;
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText('같은 과일을 합쳐 수박을 만들자!', W() / 2, H() * 0.38);

        // 과일 미리보기
        const previewY = H() * 0.50;
        const spacing = Math.min(W() * 0.065, 40);
        const startX = W() / 2 - (FRUITS.length - 1) * spacing / 2;

        for (let i = 0; i < FRUITS.length; i++) {
            const x = startX + i * spacing;
            const size = Math.max(12, spacing * 0.6);
            ctx.font = `${size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 작은 바운스 애니메이션
            const bounce = Math.sin(Date.now() * 0.003 + i * 0.5) * 4;
            ctx.fillText(FRUITS[i].emoji, x, previewY + bounce);
        }

        // 화살표
        const arrowY = previewY + spacing * 0.7;
        const arrowSize = Math.max(8, spacing * 0.25);
        ctx.font = `${arrowSize}px sans-serif`;
        ctx.fillStyle = COLORS.textMuted;
        for (let i = 0; i < FRUITS.length - 1; i++) {
            const x = startX + i * spacing + spacing / 2;
            ctx.fillText('→', x, arrowY);
        }

        // 시작 안내
        const hintSize = Math.max(10, titleSize * 0.32);
        ctx.font = `600 ${hintSize}px 'Pretendard Variable', sans-serif`;
        ctx.fillStyle = COLORS.textMuted;

        const isMobile = 'ontouchstart' in window;
        const msg = isMobile ? '화면을 탭하여 시작' : '클릭하여 시작';

        const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        ctx.fillText(msg, W() / 2, H() * 0.65);
        ctx.globalAlpha = 1;

        // 최고 기록
        if (bestScore > 0) {
            ctx.font = `500 ${Math.max(10, hintSize * 0.9)}px 'Pretendard Variable', sans-serif`;
            ctx.fillStyle = COLORS.textMuted;
            ctx.fillText(`최고 기록: ${bestScore}`, W() / 2, H() * 0.72);
        }
    }

    // ===== 게임 오버 화면 =====
    function drawOverScreen() {
        // 딤 오버레이
        ctx.fillStyle = 'rgba(12,12,29,0.70)';
        ctx.fillRect(0, 0, W(), H());

        const titleSize = Math.max(22, Math.min(W(), H()) * 0.045);

        ctx.font = `800 ${titleSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.accentPink;
        ctx.fillText('GAME OVER', W() / 2, H() * 0.30);

        // 점수 라벨
        const labelSize = Math.max(10, titleSize * 0.4);
        ctx.font = `500 ${labelSize}px 'Pretendard Variable', sans-serif`;
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText('점수', W() / 2, H() * 0.37);

        // 점수
        const scoreSize = Math.max(32, titleSize * 1.5);
        ctx.font = `800 ${scoreSize}px 'Inter', sans-serif`;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(score, W() / 2, H() * 0.44);

        // 최고 기록
        ctx.font = `500 ${labelSize}px 'Pretendard Variable', sans-serif`;
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText(`최고 기록: ${bestScore}`, W() / 2, H() * 0.53);

        // 재시작 안내
        const hintSize = Math.max(10, titleSize * 0.35);
        ctx.font = `600 ${hintSize}px 'Pretendard Variable', sans-serif`;

        const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = COLORS.accent;

        const isMobile = 'ontouchstart' in window;
        ctx.fillText(isMobile ? '탭하여 다시 시작' : '클릭하여 다시 시작', W() / 2, H() * 0.62);
        ctx.globalAlpha = 1;
    }

    // ===== 홈 버튼 =====
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

    // ===== 헬퍼: roundRect =====
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

    // ===== 메인 루프 =====
    let lastTime = 0;

    function loop(ts) {
        const dt = Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;

        // 배경
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, W(), H());
        drawOrbs();

        if (state === 'START') {
            drawStartScreen();
            drawHomeBtn();
        } else if (state === 'PLAY') {
            updatePhysics(dt);
            drawContainer();
            drawDropGuide();

            // 과일 그리기 (레벨 순으로 정렬해서 큰 과일이 아래에)
            const sorted = [...fruits].sort((a, b) => a.level - b.level);
            for (const f of sorted) {
                drawFruit(f);
            }

            drawParticles();
            drawScore();
            drawNextFruit();
            drawHomeBtn();
        } else if (state === 'OVER') {
            drawContainer();

            const sorted = [...fruits].sort((a, b) => a.level - b.level);
            for (const f of sorted) {
                drawFruit(f);
            }

            drawScore();
            drawNextFruit();
            drawOverScreen();
            drawHomeBtn();
        }

        requestAnimationFrame(loop);
    }

    // ===== 입력: 포인터 위치 업데이트 =====
    function updatePointer(clientX) {
        pointerX = clientX;
    }

    // ===== 입력: 마우스 =====
    canvas.addEventListener('mousemove', (e) => {
        if (state === 'PLAY') {
            updatePointer(e.clientX);
        }
    });

    canvas.addEventListener('click', (e) => {
        if (isHomeClick(e.clientX, e.clientY)) {
            window.location.href = '../../index.html';
            return;
        }
        if (state === 'START') {
            initGame();
            state = 'PLAY';
            return;
        }
        if (state === 'OVER') {
            initGame();
            state = 'PLAY';
            return;
        }
        if (state === 'PLAY') {
            updatePointer(e.clientX);
            dropFruitAction();
        }
    });

    // ===== 입력: 터치 =====
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.touches[0];

        if (isHomeClick(t.clientX, t.clientY)) {
            window.location.href = '../../index.html';
            return;
        }
        if (state === 'START') {
            initGame();
            state = 'PLAY';
            return;
        }
        if (state === 'OVER') {
            initGame();
            state = 'PLAY';
            return;
        }
        if (state === 'PLAY') {
            updatePointer(t.clientX);
            // 짧은 딜레이 후 드롭 (위치 업데이트 후)
            setTimeout(() => dropFruitAction(), 50);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (state === 'PLAY' && canDrop) {
            const t = e.touches[0];
            updatePointer(t.clientX);
        }
    }, { passive: false });

    // ===== 입력: 키보드 =====
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.location.href = '../../index.html';
            return;
        }
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (state === 'START') { initGame(); state = 'PLAY'; return; }
            if (state === 'OVER') { initGame(); state = 'PLAY'; return; }
            if (state === 'PLAY') { dropFruitAction(); }
        }
        if (state === 'PLAY' && canDrop) {
            const c = getContainer();
            const step = c.w * 0.03;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                pointerX = Math.max(c.x + fruitRadius(currentFruit), pointerX - step);
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                pointerX = Math.min(c.x + c.w - fruitRadius(currentFruit), pointerX + step);
            }
        }
    });

    // 기본 스크롤 방지
    window.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });

    // ===== 초기화 =====
    initGame();
    requestAnimationFrame(loop);
})();
