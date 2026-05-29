/**
 * stargazing.js
 * 天文計算：日落、各段暮光、天文黑夜開始時間
 */

// 經緯度 → IANA 時區查詢（離線資料庫，海上回傳 Etc/GMT±X）
import tzlookup from 'https://esm.sh/tz-lookup@6.1.25';

/**
 * 取得座標所屬的官方時區（IANA 名稱）；查詢失敗時回傳 null
 * @param {number} lat
 * @param {number} lng
 * @returns {string|null}
 */
function timeZoneOf(lat, lng) {
    try { return tzlookup(lat, lng); }
    catch { return null; }
}

/**
 * 計算指定座標今日的日落與各段暮光時間（UTC 太陽位置近似算法）
 *
 * @param {number} lat - 緯度（度）
 * @param {number} lng - 經度（度）
 * @returns {{
 *   type: 'polar-night' | 'midnight-sun' | 'normal',
 *   sunset?:   string,
 *   civilEnd?: string,
 *   nautEnd?:  string,
 *   astroEnd?: string,
 * }}
 */
export function calcSunTimes(lat, lng) {
    const today = new Date();
    const jd    = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12) / 86400000 + 2440587.5;
    const n     = jd - 2451545.0;

    // 太陽黃經（近似）
    const L   = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
    const g   = (((357.528 + 0.9856003 * n) % 360 + 360) % 360) * Math.PI / 180;
    const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;

    // 赤緯與時差
    const eps    = 23.4397 * Math.PI / 180;
    const sinDec = Math.sin(eps) * Math.sin(lam);
    const cosDec = Math.sqrt(1 - sinDec * sinDec);
    const RA     = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    const EoT    = (L * Math.PI / 180 - RA) / (2 * Math.PI) * 24;
    const noonUTC = 12 - lng / 15 - EoT;

    const phi     = lat * Math.PI / 180;
    const sinPhi  = Math.sin(phi);
    const cosPhi  = Math.cos(phi);
    const utcBase = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

    // 取得該座標的官方時區；查不到時退回經度估算（每 15° 一時區）
    const tz       = timeZoneOf(lat, lng);
    const tzOffset = Math.round(lng / 15);

    /**
     * 將 UTC 小時數轉為「查詢地點當地時間」字串（HH:MM）
     * h 為 UTC 小時，utcBase 為今日 UTC 0 時，故 (utcBase + h小時) 為正確 UTC 瞬間；
     * 有官方時區則交給 Intl 換算（自動套用 DST），否則手動加經度估算位移。
     */
    const fmt = tz
        ? h => new Date(utcBase + h * 3600000)
            .toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
        : h => new Date(utcBase + (h + tzOffset) * 3600000)
            .toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

    /**
     * 計算太陽位於指定高度角時的時角偏移（小時）
     * @returns {number|null|false} 時角 | null（極夜）| false（極晝）
     */
    function hourAngle(altDeg) {
        const c = (Math.sin(altDeg * Math.PI / 180) - sinPhi * sinDec) / (cosPhi * cosDec);
        if (c >  1) return null;   // 極夜：太陽永不升至此高度
        if (c < -1) return false;  // 極晝：太陽永不降至此高度
        return Math.acos(c) * 12 / Math.PI;
    }

    const Hs = hourAngle(-0.833); // 日出／日落（大氣折射修正）
    if (Hs === null)  return { type: 'polar-night' };
    if (Hs === false) return { type: 'midnight-sun' };

    const Hc = hourAngle(-6);   // 民用暮光
    const Hn = hourAngle(-12);  // 航海暮光
    const Ha = hourAngle(-18);  // 天文暮光

    return {
        type:     'normal',
        sunset:   fmt(noonUTC + Hs),
        civilEnd: (Hc && Hc !== false) ? fmt(noonUTC + Hc) : null,
        nautEnd:  (Hn && Hn !== false) ? fmt(noonUTC + Hn) : null,
        astroEnd: (Ha && Ha !== false) ? fmt(noonUTC + Ha) : null,
    };
}

/**
 * 清空「今晚觀星時間」區塊，回到「請選擇地點」提示（未選取任何地點時）
 */
export function clearStargazeInfo() {
    document.getElementById('stargazeLoc').textContent = '';
    const el = document.getElementById('stargazeInfo');
    el.className = 'stargaze-loading';
    el.innerHTML = '請選擇地點';
}

/**
 * 更新右側面板「今晚觀星時間」區塊的顯示內容
 * @param {number} lat
 * @param {number} lng
 */
export function renderStargazeInfo(lat, lng) {
    document.getElementById('stargazeLoc').textContent = `${lat.toFixed(1)}°, ${lng.toFixed(1)}°`;

    const el  = document.getElementById('stargazeInfo');
    const sun = calcSunTimes(lat, lng);

    if (sun.type === 'polar-night') {
        el.className = 'stargaze-loading';
        el.innerHTML = '極夜 — 全天可觀星！';
        return;
    }
    if (sun.type === 'midnight-sun') {
        el.className = 'stargaze-loading';
        el.innerHTML = '極晝 — 今夜無天文黑夜';
        return;
    }

    el.className = 'stargaze-info';
    el.innerHTML = `
        <div class="stargaze-row">
            <span class="stargaze-key">日落</span>
            <span class="stargaze-val">${sun.sunset}</span>
        </div>
        ${sun.civilEnd ? `
        <div class="stargaze-row">
            <span class="stargaze-key">民用暮光終</span>
            <span class="stargaze-val">${sun.civilEnd}</span>
        </div>` : ''}
        ${sun.nautEnd ? `
        <div class="stargaze-row">
            <span class="stargaze-key">航海暮光終</span>
            <span class="stargaze-val">${sun.nautEnd}</span>
        </div>` : ''}
        <div class="stargaze-row" style="border-bottom:none">
            <span class="stargaze-key">天文黑夜始</span>
            <span class="stargaze-val" style="color:#fff">${sun.astroEnd ?? '不發生'}</span>
        </div>
        ${sun.astroEnd ? `
        <div class="stargaze-best">
            ⭐ 建議從 <strong>${sun.astroEnd}</strong> 開始觀星
        </div>` : `
        <div class="stargaze-best stargaze-best-none">
            ☁ 今夜無完整天文黑夜，不適合深空觀星
        </div>`}
    `;
}
