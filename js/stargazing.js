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
    const D2R = Math.PI / 180;
    const R2D = 180 / Math.PI;
    const mod360 = x => ((x % 360) + 360) % 360;

    const today   = new Date();
    const utcBase = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const jd0     = utcBase / 86400000 + 2440587.5; // 今日 00:00 UTC 的儒略日

    const phi    = lat * D2R;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    /**
     * 高精度太陽位置（Meeus《Astronomical Algorithms》）
     * 含赤道座標歲差項、章動與光行差修正，赤緯精度約 ±0.01°
     * @param {number} jd - 儒略日（UT）
     * @returns {{ dec: number, eot: number }} 赤緯（弧度）、均時差（分鐘）
     */
    function solar(jd) {
        const T  = (jd - 2451545.0) / 36525.0;               // 儒略世紀
        const L0 = mod360(280.46646 + T * (36000.76983 + 0.0003032 * T)); // 幾何平黃經
        const M  = 357.52911 + T * (35999.05029 - 0.0001537 * T);          // 平近點角
        const e  = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);     // 軌道離心率
        const Mr = M * D2R;

        // 中心差（將平近點角修正為真近點角）
        const C = (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(Mr)
                + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
                + 0.000289 * Math.sin(3 * Mr);

        const trueLong = L0 + C;
        const omega    = 125.04 - 1934.136 * T;                            // 月球升交點（章動）
        const lambda   = (trueLong - 0.00569 - 0.00478 * Math.sin(omega * D2R)) * D2R; // 視黃經

        // 黃赤交角（含章動修正）
        const eps0 = 23 + (26 + (21.448 - T * (46.8150 + T * (0.00059 - 0.001813 * T))) / 60) / 60;
        const eps  = (eps0 + 0.00256 * Math.cos(omega * D2R)) * D2R;

        const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));           // 赤緯

        // 均時差（Meeus 公式，弧度 → 分鐘）
        const y   = Math.tan(eps / 2) ** 2;
        const L0r = L0 * D2R;
        const eot = (y * Math.sin(2 * L0r)
                   - 2 * e * Math.sin(Mr)
                   + 4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r)
                   - 0.5 * y * y * Math.sin(4 * L0r)
                   - 1.25 * e * e * Math.sin(2 * Mr)) * R2D * 4;

        return { dec, eot };
    }

    /**
     * 求今日「傍晚」太陽降到指定高度角的 UTC 時刻（小時）
     * 以 3 次迭代在事件實際時刻重算太陽位置（赤緯整天在變），逼近真值
     * @param {number} altDeg - 目標高度角（度）
     * @returns {number|null|false} UTC 小時 | null（極夜）| false（極晝）
     */
    function eventUTC(altDeg) {
        const sinAlt = Math.sin(altDeg * D2R);
        let t = 12 - lng / 15 + 6; // 初始猜測：當地正午後約 6 小時
        for (let k = 0; k < 3; k++) {
            const { dec, eot } = solar(jd0 + t / 24);
            const cosH = (sinAlt - sinPhi * Math.sin(dec)) / (cosPhi * Math.cos(dec));
            if (cosH >  1) return null;   // 太陽升不到此高度（極夜方向）
            if (cosH < -1) return false;  // 太陽降不到此高度（極晝方向）
            const H       = Math.acos(cosH) * R2D;        // 時角（度）
            const noonUTC = 12 - lng / 15 - eot / 60;      // 太陽過中天的 UTC 時刻
            t = noonUTC + H / 15;                          // 傍晚事件 = 中天 + 時角
        }
        return t;
    }

    // 取得該座標的官方時區；查不到時退回經度估算（每 15° 一時區）
    const tz       = timeZoneOf(lat, lng);
    const tzOffset = Math.round(lng / 15);

    /**
     * 將 UTC 小時數轉為「查詢地點當地時間」字串（HH:MM）
     * 有官方時區則交給 Intl 換算（自動套用 DST），否則手動加經度估算位移。
     */
    const fmt = tz
        ? h => new Date(utcBase + h * 3600000)
            .toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
        : h => new Date(utcBase + (h + tzOffset) * 3600000)
            .toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

    const sunsetT = eventUTC(-0.833); // 日落（大氣折射 + 太陽圓盤修正）
    if (sunsetT === null)  return { type: 'polar-night' };
    if (sunsetT === false) return { type: 'midnight-sun' };

    const civilT = eventUTC(-6);   // 民用暮光終
    const nautT  = eventUTC(-12);  // 航海暮光終
    const astroT = eventUTC(-18);  // 天文暮光終（天文黑夜始）
    const isHour = v => typeof v === 'number';

    return {
        type:     'normal',
        sunset:   fmt(sunsetT),
        civilEnd: isHour(civilT) ? fmt(civilT) : null,
        nautEnd:  isHour(nautT)  ? fmt(nautT)  : null,
        astroEnd: isHour(astroT) ? fmt(astroT) : null,
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
