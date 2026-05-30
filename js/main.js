/**
 * main.js
 * 應用程式進入點：匯入所有模組、處理啟動畫面與全局 UI 互動
 *
 * 注意：此專案使用原生 ES 模組，需透過 HTTP 伺服器開啟（不支援 file:// 協定）
 */

import './map.js';
import './locPanel.js';
import './geolocate.js';
import './firefly.js';
import { initDarkSites, closeSitePanel } from './darkSites.js';
import { clearStargazeInfo }             from './stargazing.js';
import { LP_ZONES }                      from './config.js';
import { applyStaticI18n, zoneDesc,
         getLang, setLang, onLangChange } from './i18n.js';

// ── 啟動畫面 ──────────────────────────────────────────────────
window.addEventListener('load', () => {
    const splash = document.getElementById('splash');
    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 800);
    }, 1700);
});

// ── 右側面板收折（預設收起，只顯示 ☰ 按鈕，點擊後自選單彈出）──
const controlPanel = document.getElementById('control-panel');
controlPanel.classList.add('hidden');
document.getElementById('panel-toggle').addEventListener('click', () => {
    controlPanel.classList.toggle('hidden');
});

// ── 暗空地點面板關閉按鈕 ─────────────────────────────────────
document.querySelector('.site-panel-close').addEventListener('click', closeSitePanel);

// ── 按 Esc 取消選擇（關閉暗空地點面板並還原視野）──────────────
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('site-panel').classList.contains('open')) {
        closeSitePanel();
    }
});

// ── 波特爾等級圖例（由 LP_ZONES 動態產生，不再寫死在 HTML）──
const bortleLegend = document.getElementById('bortle-legend');
function renderBortleLegend() {
    bortleLegend.innerHTML = '';
    LP_ZONES.filter(z => z.legend).forEach(z => {
        const row = document.createElement('div');
        row.className = 'bortle-row';
        row.innerHTML = `
            <span class="bortle-dot"  style="background:${z.color}"></span>
            <span class="bortle-class">${z.bortle}</span>
            <span class="bortle-desc">${zoneDesc(z.desc)}</span>`;
        bortleLegend.appendChild(row);
    });
}
renderBortleLegend();

// ── 語言切換（面板開關鈕旁的 中/EN 鈕）──────────────────────
const langToggle = document.getElementById('lang-toggle');
function updateLangToggleLabel() {
    // 顯示「可切換到的語言」
    langToggle.textContent = getLang() === 'zh' ? 'EN' : '中';
}
langToggle.addEventListener('click', () => {
    setLang(getLang() === 'zh' ? 'en' : 'zh');
});
onLangChange(() => {
    applyStaticI18n();
    renderBortleLegend();
    updateLangToggleLabel();
});

// 初始套用目前語言
applyStaticI18n();
updateLangToggleLabel();

// ── 預設觀星資訊：未選取地點，顯示提示 ──────────────────────
clearStargazeInfo();

// ── 初始化暗空地點列表 ────────────────────────────────────────
initDarkSites();
