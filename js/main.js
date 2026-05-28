/**
 * main.js
 * 應用程式進入點：匯入所有模組、處理啟動畫面與全局 UI 互動
 *
 * 注意：此專案使用原生 ES 模組，需透過 HTTP 伺服器開啟（不支援 file:// 協定）
 */

import './map.js';
import './locPanel.js';
import './geolocate.js';
import { initDarkSites, closeSitePanel } from './darkSites.js';
import { renderStargazeInfo }            from './stargazing.js';
import { LP_ZONES }                      from './config.js';

// ── 啟動畫面 ──────────────────────────────────────────────────
window.addEventListener('load', () => {
    const splash = document.getElementById('splash');
    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 800);
    }, 1700);
});

// ── 右側面板收折 ──────────────────────────────────────────────
if (window.innerWidth <= 600) {
    document.getElementById('control-panel').classList.add('hidden');
}
document.getElementById('panel-toggle').addEventListener('click', () => {
    document.getElementById('control-panel').classList.toggle('hidden');
});

// ── 暗空聖地面板關閉按鈕 ─────────────────────────────────────
document.querySelector('.site-panel-close').addEventListener('click', closeSitePanel);

// ── 波特爾等級圖例（由 LP_ZONES 動態產生，不再寫死在 HTML）──
const bortleLegend = document.getElementById('bortle-legend');
LP_ZONES.filter(z => z.legend).forEach(z => {
    const row = document.createElement('div');
    row.className = 'bortle-row';
    row.innerHTML = `
        <span class="bortle-dot"  style="background:${z.color}"></span>
        <span class="bortle-class">${z.bortle}</span>
        <span class="bortle-desc">${z.desc}</span>`;
    bortleLegend.appendChild(row);
});

// ── 預設觀星資訊（桃園）────────────────────────────────────
renderStargazeInfo(24.99, 121.31);

// ── 初始化暗空聖地列表 ────────────────────────────────────────
initDarkSites();
