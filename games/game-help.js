// ===== 게임 도움말 공통 시스템 =====
// 각 게임의 HTML에서 <script> 태그 전에 로드
// 사용법: <script>const GAME_HELP = { title: '게임제목', sections: [...] };</script>
//         <script src="../game-help.js"></script>

(function () {
    'use strict';
    if (typeof GAME_HELP === 'undefined') return;

    const { title, sections } = GAME_HELP;

    // --- 스타일 주입 ---
    const style = document.createElement('style');
    style.textContent = `
.gh-help-btn{position:fixed;top:12px;right:12px;z-index:9999;width:44px;height:44px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(255,255,255,0.06);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-size:20px;line-height:44px;text-align:center;cursor:pointer;color:#fff;transition:background .2s,transform .15s;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.gh-help-btn:hover{background:rgba(255,255,255,0.12);transform:scale(1.08)}
.gh-help-btn:active{transform:scale(0.92)}
.gh-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .25s}
.gh-overlay.open{opacity:1;pointer-events:auto}
.gh-modal{position:relative;width:min(90vw,420px);max-height:80vh;overflow-y:auto;background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px 20px 20px;text-align:left;transform:scale(0.9);transition:transform .25s cubic-bezier(.34,1.56,.64,1)}
.gh-overlay.open .gh-modal{transform:scale(1)}
.gh-modal::-webkit-scrollbar{width:4px}
.gh-modal::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px}
.gh-close{position:absolute;top:12px;right:12px;width:32px;height:32px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:rgba(255,255,255,0.5);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.gh-close:hover{background:rgba(255,255,255,0.12)}
.gh-title{font-family:'Inter','Pretendard Variable',sans-serif;font-size:1.2rem;font-weight:800;margin-bottom:14px;text-align:center;color:#fff}
.gh-section{margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06)}
.gh-section:last-of-type{border-bottom:none;margin-bottom:10px}
.gh-section h3{font-size:0.82rem;font-weight:700;color:#a78bfa;margin:0 0 5px 0}
.gh-section p{font-size:0.75rem;color:rgba(255,255,255,0.65);line-height:1.55;margin:0}
.gh-section strong{color:#fff}
.gh-section ul{list-style:none;padding:0;margin:0}
.gh-section ul li{font-size:0.72rem;color:rgba(255,255,255,0.65);line-height:1.6;margin-bottom:3px}
.gh-ok{display:block;width:100%;margin-top:4px;padding:12px;background:linear-gradient(135deg,#a78bfa,#818cf8);border:none;border-radius:12px;color:#fff;font-family:'Inter','Pretendard Variable',sans-serif;font-size:0.85rem;font-weight:700;cursor:pointer;transition:opacity .2s,transform .15s}
.gh-ok:hover{opacity:0.9}
.gh-ok:active{transform:scale(0.97)}
    `;
    document.head.appendChild(style);

    // --- 버튼 생성 ---
    const btn = document.createElement('button');
    btn.className = 'gh-help-btn';
    btn.textContent = '❓';
    btn.setAttribute('aria-label', '게임 도움말');
    document.body.appendChild(btn);

    // --- 모달 생성 ---
    const overlay = document.createElement('div');
    overlay.className = 'gh-overlay';

    let html = `<div class="gh-modal">
        <button class="gh-close">✖</button>
        <h2 class="gh-title">${title}</h2>`;

    sections.forEach(s => {
        html += `<div class="gh-section"><h3>${s.heading}</h3>`;
        if (s.text) {
            html += `<p>${s.text}</p>`;
        }
        if (s.list) {
            html += '<ul>';
            s.list.forEach(li => { html += `<li>${li}</li>`; });
            html += '</ul>';
        }
        html += '</div>';
    });

    html += '<button class="gh-ok">알겠어요!</button></div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // --- 이벤트 ---
    function openHelp() { overlay.classList.add('open'); }
    function closeHelp() { overlay.classList.remove('open'); }

    btn.addEventListener('click', openHelp);
    overlay.querySelector('.gh-close').addEventListener('click', closeHelp);
    overlay.querySelector('.gh-ok').addEventListener('click', closeHelp);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeHelp(); });

    // ESC 키로 닫기
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeHelp();
    });
})();
