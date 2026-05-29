/**
 * locPanel.js
 * 左側位置資訊面板：地圖點擊、光害查詢、逆地理編碼、面板渲染
 */

import { map }                          from './map.js';
import { getDjlorenzData, ratioToZone,
         roundRatio }                   from './lpData.js';
import { reverseGeocode }               from './geocode.js';
import { renderStargazeInfo,
         clearStargazeInfo }            from './stargazing.js';
import { BORTLE_TIPS }                  from './config.js';
import { state }                        from './state.js';

const locPanel = document.getElementById('loc-panel');
const locPlace = document.getElementById('loc-place');
const locBody  = document.getElementById('loc-body');

// ── 關閉按鈕 ─────────────────────────────────────────────────
document.getElementById('loc-close').addEventListener('click', () => {
    closeLocPanel(true);
});

/**
 * 關閉左側位置面板，並移除地圖上的點擊標記
 * @param {boolean} [animate=false] - true 時點擊標記以淡出動畫消失
 */
export function closeLocPanel(animate = false) {
    locPanel.classList.remove('open');
    clearStargazeInfo();   // 取消選取地點 → 觀星時間回到「請選擇地點」
    if (!state.clickMarker) return;

    if (animate) {
        const el = state.clickMarker.getElement();
        if (el) {
            el.style.transition = 'opacity 0.2s ease';
            el.style.opacity    = '0';
            setTimeout(() => {
                if (state.clickMarker) {
                    map.removeLayer(state.clickMarker);
                    state.clickMarker = null;
                }
            }, 200);
            return;
        }
    }
    map.removeLayer(state.clickMarker);
    state.clickMarker = null;
}

// ── 位置查詢（地圖點擊與定位按鈕的共用邏輯）─────────────────

/**
 * 查詢指定座標的光害資訊並更新左側面板
 * 由地圖點擊與定位按鈕共同呼叫
 * @param {number} lat
 * @param {number} lng
 */
export async function queryLocation(lat, lng) {
    // lng 可能是捲動到其他世界副本後的等效經度（例如 481°），標記需用此值才能落在當前副本；
    // 但顯示座標、時區與數據查詢一律使用正規化到 [-180, 180) 的經度
    const dispLng = ((lng + 180) % 360 + 360) % 360 - 180;
    const latlng  = L.latLng(lat, lng);

    // 更新或建立點擊標記
    if (state.clickMarker) {
        state.clickMarker.setLatLng(latlng);
    } else {
        state.clickMarker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'click-marker',
                html: '<div class="click-pin"></div>',
                iconSize:  [20, 20],
                iconAnchor:[10, 10],
            }),
            interactive: false,
        }).addTo(map);
    }

    locPanel.classList.add('open');
    locPlace.textContent = `${lat.toFixed(4)}, ${dispLng.toFixed(4)}`;
    locBody.innerHTML    = `<div class="loc-loading">載入中...</div>`;
    renderStargazeInfo(lat, dispLng);

    // 並行查詢光害數據與地名
    const [data, place] = await Promise.all([
        getDjlorenzData(lat, dispLng),
        reverseGeocode(lat, dispLng),
    ]);

    if (place) locPlace.textContent = place;
    renderLocBody(data, lat, dispLng);
}

// ── 地圖點擊事件 ──────────────────────────────────────────────
map.on('click', (e) => {
    // 暗空聖地面板開啟中時，不響應地圖點擊
    if (state.currentSiteIndex !== -1) return;
    const { lat, lng } = e.latlng;
    queryLocation(lat, lng);
});

// ── 面板內容渲染 ──────────────────────────────────────────────

/**
 * 依查詢結果渲染左側面板主體
 * @param {object} data - getDjlorenzData 的回傳值
 * @param {number} lat
 * @param {number} lng
 */
function renderLocBody(data, lat, lng) {
    if (data?.error === 'range') {
        locBody.innerHTML = `
            <div class="loc-loading">
                此位置超出資料範圍<br>(65°S ~ 75°N)
            </div>`;
        return;
    }

    if (data?.error === 'network') {
        locBody.innerHTML = `
            <div class="loc-error">
                ⚠ 光害資料載入失敗<br>請確認網路連線後再試
            </div>`;
        return;
    }

    const z   = ratioToZone(data.ratio);
    const tip = BORTLE_TIPS[z.bortle] ?? '';

    locBody.innerHTML = `
        <div class="loc-class-num"   style="color:${z.color}">Class ${z.bortle}</div>
        <div class="loc-class-label" style="color:${z.color}">${z.desc}</div>
        <div class="loc-class-tip">${tip}</div>
        <hr class="loc-divider">
        <div class="loc-row">
            <span class="loc-key">天空品質 SQM</span>
            <span class="loc-val">${data.sqm.toFixed(2)} <small>mag/arcsec²</small></span>
        </div>
        <div class="loc-row">
            <span class="loc-key">光害指數</span>
            <span class="loc-val">${roundRatio(data.ratio)}</span>
        </div>
        <div class="loc-row">
            <span class="loc-key">資料年份</span>
            <span class="loc-val">${state.currentYear}</span>
        </div>
        <div class="loc-row">
            <span class="loc-key">座標</span>
            <span class="loc-val">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
        </div>
    `;
}
