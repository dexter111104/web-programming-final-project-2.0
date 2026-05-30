/**
 * darkSites.js
 * 暗空地點（IDA 認證）：資料載入、列表渲染、地圖標記、浮動資訊面板
 */

import { map }                        from './map.js';
import { getDjlorenzData, ratioToZone } from './lpData.js';
import { state }                      from './state.js';
import { t, zoneDesc, idaYear, continentName,
         siteName, siteSubName, siteCountry, siteDesc,
         onLangChange }               from './i18n.js';
import { escapeHtml }                 from './util.js';

// 模組私有狀態
let DARK_SITES     = [];
let siteMarker     = null;
let pendingMoveEnd = null;   // 目前等待 moveend 的 listener 參考
let allSitesActive = false;        // 「標出全部地點」是否開啟
let allSitesLayer  = null;         // 全部地點白點的 Canvas 圖層實例
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
 * 載入 darksites.json（IDA 認證暗空地點，含座標與完整資訊）
 * @returns {Promise<object[]|null>}
 */
async function loadDarkSites() {
    try {
        // 加上 cache: 'no-cache' 強制向伺服器重新驗證，避免資料更新後仍讀到瀏覽器舊快取
        return await fetch('data/darksites.json', { cache: 'no-cache' })
            .then(r => { if (!r.ok) throw r; return r.json(); });
    } catch (err) {
        console.error('[darkSites] 暗空地點資料載入失敗:', err);
        return null;
    }
}

// ── 大洲分組 ──────────────────────────────────────────────────

/** 各大洲顯示順序（亞洲在前）；未知國家歸入末端的「其他」 */
const CONTINENT_ORDER = ['亞洲', '美洲', '歐洲', '大洋洲', '非洲', '其他'];

/** 國家前綴 → 大洲 */
const COUNTRY_CONTINENT = {
    日本: '亞洲', 台灣: '亞洲', 韓國: '亞洲', 以色列: '亞洲',
    中國: '亞洲', 沙烏地阿拉伯: '亞洲',
    美國: '美洲', 加拿大: '美洲', 智利: '美洲',
    英國: '歐洲', 德國: '歐洲', 愛爾蘭: '歐洲', 匈牙利: '歐洲',
    法國: '歐洲', 希臘: '歐洲', 挪威: '歐洲', 丹麥: '歐洲', 荷蘭: '歐洲',
    盧森堡: '歐洲', 瑞士: '歐洲',
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
 * 將暗空地點浮動面板定位在標記旁邊（優先顯示於左側，不足時改右側）
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

/** 關閉暗空地點浮動面板並移除地圖標記 */
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
 * 供外部模組（如地圖小動物螢火蟲）呼叫：隨機飛往一個暗空地點並開啟面板
 */
export function flyToRandomSite() {
    if (!DARK_SITES.length) return;

    // 反比加權隨機：資料嚴重偏美國（約 59%），若用均勻隨機會一直被帶到美國。
    // 改用 1/√(該國地點數) 當權重——地點多的國家壓低、地點少的國家拉高，
    // 各國機率較平均、但仍保留一點資料比例感（介於均勻與完全均等之間）。
    const countryOf = s => String(s.country).split('・')[0];
    const counts = {};
    DARK_SITES.forEach(s => { const c = countryOf(s); counts[c] = (counts[c] || 0) + 1; });

    // 目前已開啟的地點權重設 0，避免抽到同一個（否則 flyTo 會把它關掉）
    const weights = DARK_SITES.map((s, i) =>
        i === state.currentSiteIndex ? 0 : 1 / Math.sqrt(counts[countryOf(s)]));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return;

    let r = Math.random() * total;
    let idx = weights.length - 1;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) { idx = i; break; }
    }
    flyTo(idx);
}

/**
 * 飛行至指定暗空地點並開啟資訊面板
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
                       <div class="site-marker-label">${escapeHtml(siteName(site))}</div>`,
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
    document.getElementById('site-panel-year').textContent    = idaYear(site.year);
    document.getElementById('site-panel-name').textContent    = siteName(site);
    document.getElementById('site-panel-ename').textContent   = siteSubName(site);
    document.getElementById('site-panel-country').textContent = siteCountry(site);
    document.getElementById('site-panel-desc').textContent    = siteDesc(site);

    const bortleEl = document.getElementById('site-panel-bortle');
    bortleEl.innerHTML = `<div class="site-bortle-loading">${t('site_bortle_loading')}</div>`;

    const snapIndex = state.currentSiteIndex;
    getDjlorenzData(site.lat, site.lng).then(data => {
        if (state.currentSiteIndex !== snapIndex) return; // 已切換聖地，捨棄結果

        if (data?.error === 'network') {
            bortleEl.innerHTML = `<div class="site-bortle-loading">${t('site_lp_fail')}</div>`;
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
                <span class="site-bortle-desc">${zoneDesc(z.desc)}</span>
            </div>
            <div class="site-bortle-sqm">SQM ${data.sqm.toFixed(2)} mag/arcsec²</div>
        `;
    });
}

// ── 「標出全部地點」：Canvas 白點圖層 ──────────────────────────
// 200 個聖地 × 多份世界副本 ≈ 數百個發光白點。改以單一 canvas 繪製，
// 取代數百個會持續重繪 box-shadow/scale 的 DOM 標記，徹底改善拖曳流暢度。

/** 預先計算每個聖地的白點參數（座標 + 隨機相位/週期/最暗值），各世界副本共用 */
function buildAllSitesParams() {
    allSitesParams.length = 0;
    DARK_SITES.forEach(site => {
        allSitesParams.push({
            lat:   site.lat,
            lng:   site.lng,
            phase: Math.random(),               // 起始相位：0 ~ 1
            dur:   1.8 + Math.random() * 3.4,   // 閃爍週期：1.8 ~ 5.2s
            dim:   0.2 + Math.random() * 0.45,  // 最暗不透明度：0.2 ~ 0.65
        });
    });
}

// 預先把「發光點」畫到離屏 canvas（徑向漸層光暈），之後每幀只要 drawImage 貼上，
// 避免每點每幀重算 radial-gradient 或使用昂貴的 shadowBlur
const GLOW_SPRITE = (() => {
    const S = 48;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const r = S / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0,    'rgba(255,255,255,1)');
    grad.addColorStop(0.38, 'rgba(255,255,255,1)');     // 實心核心邊緣（約佔 0.38 半徑）
    grad.addColorStop(0.60, 'rgba(255,255,255,0.28)');
    grad.addColorStop(0.82, 'rgba(255,255,255,0)');     // 光暈提早淡出，避免相鄰點糊在一起
    grad.addColorStop(1,    'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    return c;
})();

// 基準繪製尺寸（含光暈）；核心約佔 0.38 半徑 → 實心點 ≈ 4.4px，光暈收緊不外溢
const DOT_BASE = 11.5;

/**
 * 自訂 Canvas 圖層：把全部聖地白點（含各世界副本）畫在單一 canvas 上。
 * 沿用 L.Canvas 的容器定位／縮放動畫處理，僅覆寫 _draw 並自帶 rAF 閃爍迴圈。
 */
const AllSitesCanvas = L.Canvas.extend({
    options: { padding: 0.2 },   // 加大邊距，拖曳時邊緣較不易露出空白

    onAdd(map) {
        L.Canvas.prototype.onAdd.call(this, map);
        this._raf = L.Util.requestAnimFrame(this._frame, this);
    },

    onRemove(map) {
        if (this._raf) L.Util.cancelAnimFrame(this._raf);
        this._raf = null;
        L.Canvas.prototype.onRemove.call(this, map);
    },

    _frame() {
        if (!this._map) return;
        // 縮放動畫期間容器以 CSS 縮放，座標暫時失準 → 跳過重繪
        if (!this._map._animatingZoom) {
            this._clear();
            this._draw();
        }
        this._raf = L.Util.requestAnimFrame(this._frame, this);
    },

    _draw() {
        const map = this._map;
        if (!map) return;

        const ctx    = this._ctx;
        const bounds = map.getBounds();
        const z      = map.getZoom();
        // 聖地經度落在 [-180,180]，第 k 份副本約涵蓋 [-180+360k, 180+360k]
        const kMin = Math.floor((bounds.getWest() - 180) / 360);
        const kMax = Math.ceil((bounds.getEast()  + 180) / 360);
        // 360° 對應的像素寬（Web Mercator x 與緯度無關，每幀算一次即可）
        const worldPx = map.project([0, 360], z).x - map.project([0, 0], z).x;
        const t = performance.now() / 1000;

        ctx.save();
        for (const p of allSitesParams) {
            // 三角波 0~1：平滑往返閃爍
            const ph  = (t / p.dur + p.phase) % 1;
            const tri = ph < 0.5 ? ph * 2 : (1 - ph) * 2;
            const size = DOT_BASE * (0.8 + 0.35 * tri);
            const half = size / 2;
            ctx.globalAlpha = p.dim + (1 - p.dim) * tri;

            const base = map.latLngToLayerPoint([p.lat, p.lng]);
            for (let k = kMin; k <= kMax; k++) {
                const x = base.x + k * worldPx;
                ctx.drawImage(GLOW_SPRITE, x - half, base.y - half, size, size);
            }
        }
        ctx.restore();
    },
});

/** 關閉「標出全部地點」並移除 Canvas 圖層（若未開啟則不動作） */
function hideAllSites() {
    if (!allSitesActive) return;
    allSitesActive = false;
    if (allSitesLayer) {
        map.removeLayer(allSitesLayer);
        allSitesLayer = null;
    }
    const btn = document.getElementById('toggle-all-sites');
    if (btn) {
        btn.classList.remove('active');
        btn.textContent = t('show_all_sites');
    }
}

/**
 * 切換「標出全部地點」：在地圖上以白色微閃標點顯示全部聖地（再次點擊則隱藏）
 * 標點不可互動，僅作標示用途；以單一 canvas 繪製並隨地圖無限捲動在各副本顯示
 */
function toggleAllSites(btn) {
    if (allSitesActive) { hideAllSites(); return; }

    allSitesActive = true;
    buildAllSitesParams();
    allSitesLayer = new AllSitesCanvas();
    allSitesLayer.addTo(map);
    btn.classList.add('active');
    btn.textContent = t('hide_all_sites');
}

/**
 * 語言切換時就地更新列表文字（大洲名、地點名、國家），
 * 不重建 DOM，保留分組展開狀態、選取高亮與事件綁定
 */
function refreshSiteListLang() {
    document.querySelectorAll('.darksite-group').forEach(g => {
        const zh     = g.dataset.continent;
        const nameEl = g.querySelector('.darksite-group-name');
        if (zh && nameEl) nameEl.textContent = continentName(zh);
    });
    itemEls.forEach((el, i) => {
        if (!el) return;
        const site = DARK_SITES[i];
        const n = el.querySelector('.darksite-name');
        const l = el.querySelector('.darksite-loc');
        if (n) n.textContent = siteName(site);
        if (l) l.textContent = siteCountry(site);
    });
}

// ── 初始化（非同步，由 main.js 呼叫）────────────────────────

/**
 * 載入暗空地點資料、渲染列表，並綁定地圖事件
 * 需在 DOM 就緒後呼叫
 */
export async function initDarkSites() {
    const darksiteList = document.getElementById('darksite-list');
    darksiteList.innerHTML = `
        <div style="color:#444;font-size:0.75rem;padding:8px 0">${t('list_loading')}</div>`;

    const sites = await loadDarkSites();

    if (!sites) {
        darksiteList.innerHTML = `
            <div style="color:#c05050;font-size:0.75rem;padding:8px 0;line-height:1.5">
                ${t('list_load_fail')}
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

        group.dataset.continent = continent;   // 保留中文鍵供語言切換重繪

        const header = document.createElement('div');
        header.className = 'darksite-group-header';
        header.innerHTML = `
            <span class="darksite-group-arrow">▸</span>
            <span class="darksite-group-name">${continentName(continent)}</span>
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
                    <div class="darksite-name">${escapeHtml(siteName(site))}</div>
                    <div class="darksite-loc">${escapeHtml(siteCountry(site))}</div>
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
    if (toggleBtn) {
        toggleBtn.textContent = t('show_all_sites');
        toggleBtn.addEventListener('click', () => toggleAllSites(toggleBtn));
    }

    // 語言切換：就地更新列表/按鈕/開啟中的聖地面板（保留展開與選取狀態）
    onLangChange(() => {
        refreshSiteListLang();
        const btn = document.getElementById('toggle-all-sites');
        if (btn) btn.textContent = allSitesActive ? t('hide_all_sites') : t('show_all_sites');
        if (state.currentSiteIndex !== -1) {
            const site = DARK_SITES[state.currentSiteIndex];
            if (site) {
                fillSitePanel(site);
                if (siteMarker) {
                    const lbl = siteMarker.getElement()?.querySelector('.site-marker-label');
                    if (lbl) lbl.textContent = siteName(site);
                }
            }
        }
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
