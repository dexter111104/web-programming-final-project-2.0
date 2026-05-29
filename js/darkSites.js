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
let allSitesActive = false;        // 「標出全部地點」是否開啟
const allSitesCopies = new Map();  // 世界副本偏移 k → 該副本的白點 L.layerGroup
const allSitesParams = [];         // 每個聖地預先算好的白點參數（座標 + 隨機動畫），各副本共用
const itemEls      = [];     // 依原始索引存放列表項目 DOM，用於高亮選取狀態
let preFlyView     = null;   // 點擊聖地前的地圖視野（center + zoom），取消選取時還原

/** 依目前選取的聖地索引，更新列表項目的 active 高亮（星星旋轉 + 框變色）*/
function highlightActiveItem() {
    itemEls.forEach((el, idx) => {
        if (!el) return;
        if (idx === state.currentSiteIndex) {
            el.classList.remove('deselecting');
            el.classList.add('active');
        } else if (el.classList.contains('active')) {
            // 由選取轉為未選取：觸發逆時針轉回動畫
            el.classList.remove('active');
            el.classList.add('deselecting');
        }
    });
}

// 快取常用 DOM 節點（模組載入時只查詢一次）
const sitePanel = document.getElementById('site-panel');

// ── 資料載入 ──────────────────────────────────────────────────


/**
 * 載入 darksites.json（IDA 認證暗空聖地，含座標與完整資訊）
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

// ── 大洲分組 ──────────────────────────────────────────────────

/** 各大洲顯示順序（亞洲在前）；未知國家歸入末端的「其他」 */
const CONTINENT_ORDER = ['亞洲', '美洲', '歐洲', '大洋洲', '非洲', '其他'];

/** 國家前綴 → 大洲 */
const COUNTRY_CONTINENT = {
    日本: '亞洲', 台灣: '亞洲', 韓國: '亞洲', 以色列: '亞洲',
    美國: '美洲', 加拿大: '美洲', 智利: '美洲',
    英國: '歐洲', 德國: '歐洲', 愛爾蘭: '歐洲', 匈牙利: '歐洲',
    法國: '歐洲', 希臘: '歐洲', 挪威: '歐洲', 丹麥: '歐洲',
    紐西蘭: '大洋洲', 澳大利亞: '大洋洲', 紐埃: '大洋洲', 英國海外領土: '大洋洲',
    納米比亞: '非洲', 南非: '非洲',
};

/** 由 country 欄位（格式「國家・地區」）判斷所屬大洲 */
function continentOf(country) {
    const prefix = (country || '').split('・')[0];
    return COUNTRY_CONTINENT[prefix] || '其他';
}

// ── 工具函式 ──────────────────────────────────────────────────

/**
 * 計算離 currentLng 最近的等效經度（處理多副本地圖防止跨界跳躍）
 */
export function nearestLng(targetLng, currentLng) {
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
    highlightActiveItem();

    // 還原至點擊聖地前的視野（縮放 + 中心）
    if (preFlyView) {
        const { center, zoom } = preFlyView;
        preFlyView = null;
        map.flyTo(center, zoom, { duration: 1.2 });
    }
}

/**
 * 飛行至指定暗空聖地並開啟資訊面板
 * 若點擊已開啟的聖地則關閉面板
 * 所有聖地（精選或非精選）均使用同一套面板邏輯
 */
function flyTo(index) {
    if (state.currentSiteIndex === index) { closeSitePanel(); return; }

    // 由「未選取」狀態開始選取時，記錄當前視野，供取消選取時還原
    if (state.currentSiteIndex === -1) {
        preFlyView = { center: map.getCenter(), zoom: map.getZoom() };
    }

    // 點選個別聖地時，自動關閉「標出全部地點」
    hideAllSites();

    // 關閉位置查詢面板
    document.getElementById('loc-panel').classList.remove('open');
    if (state.clickMarker) {
        map.removeLayer(state.clickMarker);
        state.clickMarker = null;
    }

    state.currentSiteIndex = index;
    highlightActiveItem();
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
        site.desc || 'IDA 認證暗天聖地，提供優質黑暗夜空環境。';

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

/** 建立單一白點的 divIcon（圓點中心精準錨在座標上）*/
function dotIcon(p) {
    return L.divIcon({
        className: 'all-site-dot-icon',
        html: `<div class="all-site-dot" style="animation-delay:${p.delay}s;animation-duration:${p.dur}s;--dot-dim:${p.dim}"></div>`,
        iconSize:   [5.3, 5.3],
        iconAnchor: [2.65, 2.65],
    });
}

/** 預先計算每個聖地的白點參數（座標 + 隨機動畫），讓各世界副本共用同一組隨機值 */
function buildAllSitesParams() {
    allSitesParams.length = 0;
    DARK_SITES.forEach(site => {
        allSitesParams.push({
            lat:   site.lat,
            lng:   site.lng,
            delay: (Math.random() * -6).toFixed(2),          // 相位：-6 ~ 0s
            dur:   (1.8 + Math.random() * 3.4).toFixed(2),   // 週期：1.8 ~ 5.2s
            dim:   (0.2 + Math.random() * 0.45).toFixed(2),  // 最暗不透明度：0.2 ~ 0.65
        });
    });
}

/**
 * 依目前可見經度範圍，補齊/移除各世界副本（經度 ±360 倍數）的白點
 * 地圖可無限左右捲動，故需動態渲染目前視野內的副本，避免標記無限增生
 */
function renderAllSitesCopies() {
    if (!allSitesActive) return;

    const bounds = map.getBounds();
    // 聖地經度落在 [-180,180]，第 k 份副本約涵蓋 [-180+360k, 180+360k]
    const kMin = Math.floor((bounds.getWest() - 180) / 360);
    const kMax = Math.ceil((bounds.getEast()  + 180) / 360);

    // 移除已離開視野的副本
    for (const k of [...allSitesCopies.keys()]) {
        if (k < kMin || k > kMax) {
            map.removeLayer(allSitesCopies.get(k));
            allSitesCopies.delete(k);
        }
    }
    // 補上視野內尚未建立的副本
    for (let k = kMin; k <= kMax; k++) {
        if (allSitesCopies.has(k)) continue;
        const offset = k * 360;
        const grp = L.layerGroup();
        allSitesParams.forEach(p => {
            L.marker([p.lat, p.lng + offset], {
                icon: dotIcon(p),
                interactive: false,
                keyboard:    false,
            }).addTo(grp);
        });
        grp.addTo(map);
        allSitesCopies.set(k, grp);
    }
}

/**
 * 切換「標出全部地點」：在地圖上以白色微閃標點顯示全部聖地（再次點擊則隱藏）
 * 標點不可互動，僅作標示用途；可隨地圖無限捲動在各副本顯示
 */
/** 關閉「標出全部地點」並清除所有副本白點（若未開啟則不動作） */
function hideAllSites() {
    if (!allSitesActive) return;
    allSitesActive = false;
    map.off('moveend', renderAllSitesCopies);
    allSitesCopies.forEach(g => map.removeLayer(g));
    allSitesCopies.clear();
    const btn = document.getElementById('toggle-all-sites');
    if (btn) {
        btn.classList.remove('active');
        btn.textContent = '標出全部地點';
    }
}

function toggleAllSites(btn) {
    if (allSitesActive) { hideAllSites(); return; }

    allSitesActive = true;
    buildAllSitesParams();
    renderAllSitesCopies();
    map.on('moveend', renderAllSitesCopies);
    btn.classList.add('active');
    btn.textContent = '隱藏全部地點';
}

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

    // 依國家前綴分組到各大洲，預設全部摺疊（手風琴：一次只開一個）
    const STAR_SVG = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
             style="flex-shrink:0;margin-top:2px;filter:drop-shadow(0 0 3px rgba(255,255,255,0.75))">
            <path d="M7 0L8.77 5.23L14 7L8.77 8.77L7 14L5.23 8.77L0 7L5.23 5.23Z" fill="#ffffff"/>
        </svg>`;

    // 把每個聖地（保留原始索引）歸入對應大洲
    const groups = new Map(CONTINENT_ORDER.map(name => [name, []]));
    DARK_SITES.forEach((site, i) => {
        const continent = continentOf(site.country);
        if (!groups.has(continent)) groups.set(continent, []);
        groups.get(continent).push({ site, i });
    });

    groups.forEach((members, continent) => {
        if (members.length === 0) return;

        const group = document.createElement('div');
        group.className = 'darksite-group collapsed'; // 預設全部摺疊

        const header = document.createElement('div');
        header.className = 'darksite-group-header';
        header.innerHTML = `
            <span class="darksite-group-arrow">▸</span>
            <span class="darksite-group-name">${continent}</span>
            <span class="darksite-group-count">${members.length}</span>`;
        header.addEventListener('click', () => {
            const willOpen = group.classList.contains('collapsed');
            // 手風琴：先把所有分組收起，再展開被點的那一個
            darksiteList.querySelectorAll('.darksite-group')
                .forEach(g => g.classList.add('collapsed'));
            if (willOpen) group.classList.remove('collapsed');
        });

        // 三層結構供高度動畫：
        //   body  → grid-template-rows 0fr↔1fr 動畫外層
        //   clip  → overflow:hidden 裁切層（不可有 padding，否則無法收到 0）
        //   content → 實際 padding 與項目列表
        const body = document.createElement('div');
        body.className = 'darksite-group-body';
        const clip = document.createElement('div');
        clip.className = 'darksite-group-body-clip';
        const content = document.createElement('div');
        content.className = 'darksite-group-body-content';

        members.forEach(({ site, i }) => {
            const el = document.createElement('div');
            el.className = 'darksite-item';
            el.innerHTML = `
                ${STAR_SVG}
                <div>
                    <div class="darksite-name">${site.name}</div>
                    <div class="darksite-loc">${site.country}</div>
                </div>`;
            el.addEventListener('click', () => flyTo(i));
            el.addEventListener('animationend', () => el.classList.remove('deselecting'));
            itemEls[i] = el;
            content.appendChild(el);
        });
        clip.appendChild(content);
        body.appendChild(clip);

        group.appendChild(header);
        group.appendChild(body);
        darksiteList.appendChild(group);
    });

    // 「標出全部地點」切換按鈕
    const toggleBtn = document.getElementById('toggle-all-sites');
    if (toggleBtn) toggleBtn.addEventListener('click', () => toggleAllSites(toggleBtn));

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
