/**
 * darkSites.js
 * 暗空聖地（IDA 認證）：資料載入、列表渲染、地圖標記、浮動資訊面板
 */

import { map }                        from './map.js';
import { getDjlorenzData, ratioToZone } from './lpData.js';
import { state }                      from './state.js';

// 模組私有狀態
let DARK_SITES     = [];
let siteMarker     = null;
let pendingMoveEnd = null;   // 目前等待 moveend 的 listener 參考

// 快取常用 DOM 節點（模組載入時只查詢一次）
const sitePanel = document.getElementById('site-panel');

// ── 資料載入 ──────────────────────────────────────────────────


/** 各類型的通用描述（供無 desc 的聖地使用） */
const TYPE_DESC = {
    P: 'IDA 認證暗天公園。此地擁有優質的黑暗夜空，是天文觀測與感受星空之美的絕佳去處。',
    R: 'IDA 認證暗天保護區。致力於維護大面積自然黑暗環境，保護夜間生態系統不受光害侵擾。',
    C: 'IDA 認證暗天社區。積極推廣負責任照明政策，讓居民與訪客都能仰望繁星點點的夜空。',
    S: 'IDA 認證暗天庇護所。通常設於私人場域，提供遠離光害的絕佳黑暗夜空觀測體驗。',
};

/**
 * 同時載入 darksites.json（精選，含完整資訊）與 allsites.json（全量，僅座標）
 * 合併為統一的顯示列表：精選在前，其餘依類型排序在後
 * @returns {Promise<object[]|null>}
 */
async function loadDarkSites() {
    try {
        return await fetch('data/darksites.json')
            .then(r => { if (!r.ok) throw r; return r.json(); });
    } catch (err) {
        console.error('[darkSites] 暗空聖地資料載入失敗:', err);
        return null;
    }
}

// ── 工具函式 ──────────────────────────────────────────────────

/**
 * 計算離 currentLng 最近的等效經度（處理多副本地圖防止跨界跳躍）
 */
function nearestLng(targetLng, currentLng) {
    const diff = ((targetLng - currentLng) % 360 + 540) % 360 - 180;
    return currentLng + diff;
}

/**
 * 將暗空聖地浮動面板定位在標記旁邊（優先顯示於左側，不足時改右側）
 */
function positionPanel() {
    if (!siteMarker) return;
    const panel = sitePanel;
    const pt    = map.latLngToContainerPoint(siteMarker.getLatLng());
    const mapSz = map.getSize();
    const pw    = panel.offsetWidth  || 360;
    const ph    = panel.offsetHeight || 340;
    const iconHalfW = 75;
    const gap       = 12;

    const controlPanelEl = document.getElementById('control-panel');
    const rightW = controlPanelEl.classList.contains('hidden') ? 0 : (controlPanelEl.offsetWidth || 340);

    let left = pt.x - iconHalfW - pw - gap;
    if (left < 8) left = pt.x + iconHalfW + gap;
    left = Math.max(8, Math.min(left, mapSz.x - rightW - pw - 8));

    let top = pt.y + 10 - ph / 2;
    top = Math.max(56, Math.min(top, mapSz.y - ph - 8));

    panel.style.left   = `${left}px`;
    panel.style.top    = `${top}px`;
    panel.style.bottom = 'auto';
    panel.style.right  = 'auto';
}

// ── 面板操作 ──────────────────────────────────────────────────

/** 關閉暗空聖地浮動面板並移除地圖標記 */
export function closeSitePanel() {
    state.lastSiteIndex    = state.currentSiteIndex;
    state.currentSiteIndex = -1;
    sitePanel.classList.remove('open');
    if (siteMarker) { map.removeLayer(siteMarker); siteMarker = null; }
}

/**
 * 飛行至指定暗空聖地並開啟資訊面板
 * 若點擊已開啟的聖地則關閉面板
 * 所有聖地（精選或非精選）均使用同一套面板邏輯
 */
function flyTo(index) {
    if (state.currentSiteIndex === index) { closeSitePanel(); return; }

    // 關閉位置查詢面板
    document.getElementById('loc-panel').classList.remove('open');
    if (state.clickMarker) {
        map.removeLayer(state.clickMarker);
        state.clickMarker = null;
    }

    state.currentSiteIndex = index;
    const site    = DARK_SITES[index];
    const panel   = sitePanel;
    const wasOpen = panel.classList.contains('open');

    const adjLng = nearestLng(site.lng, map.getCenter().lng);

    panel.classList.remove('open');
    if (siteMarker) { map.removeLayer(siteMarker); siteMarker = null; }

    // 若地圖已在該聖地位置，直接重新開啟面板
    const reopen = index === state.lastSiteIndex
        && map.getZoom() === site.zoom
        && map.getBounds().contains(L.latLng(site.lat, adjLng));

    /** 建立地圖標記並載入面板內容 */
    const showMarkerAndPanel = () => {
        if (state.currentSiteIndex !== index) return;

        siteMarker = L.marker([site.lat, adjLng], {
            icon: L.divIcon({
                className: 'site-marker-icon',
                html: `<div class="site-marker-pin"></div>
                       <div class="site-marker-label">${site.name}</div>`,
                iconSize:  [140, 38],
                iconAnchor:[70, 6],
            }),
            interactive: false,
        }).addTo(map);

        loadSitePanelImage(site);
        fillSitePanel(site);
    };

    if (reopen) {
        showMarkerAndPanel();
        setTimeout(() => { positionPanel(); panel.classList.add('open'); }, 30);
        return;
    }

    map.flyTo([site.lat, adjLng], site.zoom, { duration: 1.8 });
    setTimeout(showMarkerAndPanel, wasOpen ? 260 : 0);

    if (pendingMoveEnd) { map.off('moveend', pendingMoveEnd); }
    pendingMoveEnd = () => {
        pendingMoveEnd = null;
        if (state.currentSiteIndex !== index) return;
        positionPanel();
        panel.classList.add('open');
    };
    map.once('moveend', pendingMoveEnd);
}

/**
 * 更新聖地面板的圖片
 * 無圖片（img 欄位缺失）或載入失敗時顯示夜空 fallback 背景
 */
function loadSitePanelImage(site) {
    const img  = document.getElementById('site-panel-img');
    const wrap = img.parentElement;

    // 重置狀態，避免舊 handler 誤觸
    img.onerror = null;
    img.removeAttribute('src');
    img.style.display = '';
    wrap.classList.remove('img-fallback');

    if (!site.img) {
        wrap.style.display = 'none';
        return;
    }

    wrap.style.display = '';
    img.onerror = function () {
        wrap.style.display = 'none';
    };
    img.src = site.img;
}

/** 填充聖地資訊面板（文字資訊 + 非同步光害數據），全聖地通用 */
function fillSitePanel(site) {
    document.getElementById('site-panel-year').textContent =
        site.year ? `IDA 認證 ${site.year}` : 'IDA 認證';
    document.getElementById('site-panel-name').textContent    = site.name  || site.ename || '';
    document.getElementById('site-panel-ename').textContent   =
        (site.ename && site.ename !== site.name) ? site.ename : '';
    document.getElementById('site-panel-country').textContent = site.country || '';
    document.getElementById('site-panel-desc').textContent    =
        site.desc || TYPE_DESC[site.type] || 'IDA 認證暗天聖地，提供優質黑暗夜空環境。';

    const bortleEl = document.getElementById('site-panel-bortle');
    bortleEl.innerHTML = '<div class="site-bortle-loading">載入光害資料…</div>';

    const snapIndex = state.currentSiteIndex;
    getDjlorenzData(site.lat, site.lng).then(data => {
        if (state.currentSiteIndex !== snapIndex) return; // 已切換聖地，捨棄結果

        if (data?.error === 'network') {
            bortleEl.innerHTML = '<div class="site-bortle-loading">⚠ 光害資料載入失敗</div>';
            return;
        }
        if (data?.error === 'range') {
            bortleEl.innerHTML = '';
            return;
        }

        const z = ratioToZone(data.ratio);
        bortleEl.innerHTML = `
            <hr class="site-bortle-divider">
            <div class="site-bortle-row">
                <span class="site-bortle-dot"   style="background:${z.color}"></span>
                <span class="site-bortle-class" style="color:${z.color}">Bortle ${z.bortle}</span>
                <span class="site-bortle-desc">${z.desc}</span>
            </div>
            <div class="site-bortle-sqm">SQM ${data.sqm.toFixed(2)} mag/arcsec²</div>
        `;
    });
}

/** 顏色對應各類型（Park / Reserve / Community / Sanctuary）*/
const TYPE_COLOR = { P: '#7ec8ff', R: '#a8e6a3', C: '#ffd97d', S: '#ffb3c6' };

// ── 初始化（非同步，由 main.js 呼叫）────────────────────────

/**
 * 載入暗空聖地資料、渲染列表，並綁定地圖事件
 * 需在 DOM 就緒後呼叫
 */
export async function initDarkSites() {
    const darksiteList = document.getElementById('darksite-list');
    darksiteList.innerHTML = `
        <div style="color:#444;font-size:0.75rem;padding:8px 0">載入中…</div>`;

    const sites = await loadDarkSites();

    if (!sites) {
        darksiteList.innerHTML = `
            <div style="color:#c05050;font-size:0.75rem;padding:8px 0;line-height:1.5">
                ⚠ 暗空聖地資料載入失敗<br>請重新整理頁面
            </div>`;
        return;
    }

    DARK_SITES = sites;
    darksiteList.innerHTML = '';

    DARK_SITES.forEach((site, i) => {
        const el = document.createElement('div');
        el.className = 'darksite-item';

        el.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                 style="flex-shrink:0;margin-top:2px;filter:drop-shadow(0 0 3px rgba(255,255,255,0.75))">
                <path d="M7 0L8.77 5.23L14 7L8.77 8.77L7 14L5.23 8.77L0 7L5.23 5.23Z" fill="#ffffff"/>
            </svg>
            <div>
                <div class="darksite-name">${site.name}</div>
                <div class="darksite-loc">${site.country}</div>
            </div>`;
        el.addEventListener('click', () => flyTo(i));
        darksiteList.appendChild(el);
    });

    // 地圖拖動時：同步更新面板位置
    map.on('move', () => {
        if (!siteMarker || state.currentSiteIndex === -1) return;
        if (sitePanel.classList.contains('open')) {
            positionPanel();
        }
    });

    // 地圖拖動結束：標記已離開視窗則自動關閉面板
    map.on('moveend', () => {
        if (!siteMarker || state.currentSiteIndex === -1) return;
        if (!map.getBounds().contains(siteMarker.getLatLng())) closeSitePanel();
    });
}
