/**
 * map.js
 * Leaflet 地圖初始化、底圖管理、光害圖層建立與切換、年份選擇
 */

import { LP_OPACITY, DEFAULT_YEAR } from './config.js';
import { state } from './state.js';

// ── 地圖初始化 ────────────────────────────────────────────────
export const map = L.map('map', {
    center: [20, 10],
    zoom: 3,
    minZoom: 3,
    zoomControl: false,      // 關掉預設位置（左上），改在下方手動加到左下
    attributionControl: true,
    maxBounds: L.latLngBounds(L.latLng(-85.051, -Infinity), L.latLng(85.051, Infinity)),
    maxBoundsViscosity: 0.9,
    worldCopyJump: false,
    bounceAtZoomLimits: false,
});

// 縮放控件移至左下角
L.control.zoom({ position: 'bottomleft' }).addTo(map);

// ── 底圖圖層 ──────────────────────────────────────────────────
const baseLayers = {
    satellite: L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: '© <a href="https://www.esri.com/">Esri</a>',
            maxZoom: 19,
            className: 'dim-layer',
        }
    ),
    street: L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19,
            className: 'street-layer',
        }
    ),
};

// 衛星底圖的文字標注圖層（獨立，覆蓋在光害圖層之上）
const satLabels = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
    { attribution: '', subdomains: 'abcd', maxZoom: 19, pane: 'shadowPane' }
);

// ── 光害圖層工廠 ──────────────────────────────────────────────
function createLpLayer(year, opacity) {
    return L.tileLayer(
        `https://djlorenz.github.io/astronomy/image_tiles/tiles${year}/tile_{z}_{x}_{y}.png`,
        {
            attribution: '光害資料 © <a href="https://djlorenz.github.io/astronomy/lp/" target="_blank">Light Pollution Atlas</a> (Falchi et al.)',
            minZoom: 2,
            maxNativeZoom: 8,
            maxZoom: 19,
            tileSize: 1024,
            zoomOffset: -2,
            opacity,
            className: 'lp-overlay',
            errorTileUrl: `https://djlorenz.github.io/astronomy/image_tiles/tiles${year}/black.png`,
            updateWhenIdle: true,
            updateWhenZooming: false,
            keepBuffer: 2,
        }
    );
}

// 目前使用的光害圖層（let，年份切換時會重新建立）
let lpOverlay = createLpLayer(DEFAULT_YEAR, LP_OPACITY);

// 載入預設圖層
baseLayers.street.addTo(map);
lpOverlay.addTo(map);

// ── 工具：切換按鈕群組的 active 狀態 ────────────────────────
/**
 * 將指定 CSS 選擇器內的所有按鈕 active 移除，再標記 clickedBtn
 * @param {string}      selector   - querySelectorAll 選擇器
 * @param {HTMLElement} clickedBtn - 被點擊的按鈕
 */
function setActiveBtn(selector, clickedBtn) {
    document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
    clickedBtn.classList.add('active');
}

// ── 底圖切換按鈕（排除年份按鈕列）────────────────────────────
document.querySelectorAll('.layer-btns:not(#yearBtns) .layer-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        setActiveBtn('.layer-btns:not(#yearBtns) .layer-btn', this);

        Object.values(baseLayers).forEach(l => map.removeLayer(l));
        baseLayers[this.dataset.layer].addTo(map);

        if (this.dataset.layer === 'satellite') {
            satLabels.addTo(map);
        } else {
            map.removeLayer(satLabels);
        }

        if (map.hasLayer(lpOverlay)) lpOverlay.bringToFront();
    });
});

// ── 光害圖層開關 ──────────────────────────────────────────────
document.getElementById('lpToggle').addEventListener('change', function () {
    if (this.checked) {
        lpOverlay.addTo(map);
        lpOverlay.setOpacity(LP_OPACITY);
    } else {
        map.removeLayer(lpOverlay);
    }
});

