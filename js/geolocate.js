/**
 * geolocate.js
 * 定位按鈕：使用瀏覽器 Geolocation API 跳到使用者所在位置並查詢光害數據
 */

import { map }            from './map.js';
import { queryLocation }  from './locPanel.js';
import { closeSitePanel } from './darkSites.js';
import { state }          from './state.js';

const btn = document.getElementById('geolocate-btn');

btn.addEventListener('click', () => {
    // 瀏覽器不支援
    if (!navigator.geolocation) {
        showGeoError('您的瀏覽器不支援定位功能');
        return;
    }

    // 若暗空聖地面板開啟中，先關閉
    if (state.currentSiteIndex !== -1) closeSitePanel();

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
        onSuccess,
        onError,
        { timeout: 10000, maximumAge: 60000 }
    );
});

// ── 定位成功 ──────────────────────────────────────────────────
function onSuccess(pos) {
    setLoading(false);
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    // 飛行到使用者位置，動畫結束後查詢光害
    map.flyTo([lat, lng], 10, { duration: 1.5 });
    map.once('moveend', () => queryLocation(lat, lng));
}

// ── 定位失敗 ──────────────────────────────────────────────────
function onError(err) {
    setLoading(false);

    const MESSAGES = {
        [GeolocationPositionError.PERMISSION_DENIED]:
            '定位權限被拒絕，請在瀏覽器設定中允許存取位置',
        [GeolocationPositionError.POSITION_UNAVAILABLE]:
            '無法取得位置資訊，請確認裝置 GPS 狀態',
        [GeolocationPositionError.TIMEOUT]:
            '定位請求逾時，請稍後再試',
    };

    showGeoError(MESSAGES[err.code] ?? '定位失敗，請稍後再試');
}

// ── 工具函式 ──────────────────────────────────────────────────

/** 切換按鈕的載入中狀態 */
function setLoading(isLoading) {
    btn.classList.toggle('loading', isLoading);
    btn.disabled = isLoading;
}

/**
 * 在畫面中央顯示錯誤 toast，3.5 秒後自動消失
 * @param {string} msg
 */
function showGeoError(msg) {
    // 同時間只顯示一個 toast
    document.querySelectorAll('.geo-toast').forEach(el => el.remove());

    const toast = document.createElement('div');
    toast.className = 'geo-toast';
    toast.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="13"/>
            <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/>
        </svg>
        <span>${msg}</span>`;
    document.body.appendChild(toast);

    // 下一幀觸發過渡動畫（先 append 再 add class）
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}
