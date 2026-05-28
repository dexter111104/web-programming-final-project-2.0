/**
 * lpData.js
 * 光害數值計算：讀取 djlorenz 二進位資料磚、區帶對照、數值格式化
 */

import { LP_ZONES } from './config.js';

// ── 磚快取（key: "tilex_tiley" → Promise<Int8Array>）─────────
// 存 Promise 而非結果：讓同一時間的多個請求共用同一個 fetch，
// 不會因為第一次還沒回來就發出第二次。
const tileCache = new Map();

/**
 * 根據亮度比值取得對應的光害區帶資訊
 * @param {number} r - 亮度比值（相對於自然夜空）
 * @returns {object} LP_ZONES 中的一筆記錄
 */
export function ratioToZone(r) {
    return LP_ZONES.find(z => r < z.maxR) ?? LP_ZONES[LP_ZONES.length - 1];
}

/**
 * 將亮度比值格式化為適合顯示的字串（依大小自動決定小數位數）
 * @param {number} r
 * @returns {string}
 */
export function roundRatio(r) {
    if (r < 0.1) return r.toFixed(3);
    if (r < 3)   return r.toFixed(2);
    return r.toFixed(1);
}

/**
 * 從 djlorenz 二進位資料磚讀取指定座標的光害數據
 *
 * @param {number} lat - 緯度
 * @param {number} lng - 經度
 * @returns {Promise<
 *   { ratio: number, sqm: number } |
 *   { error: 'range' } |
 *   { error: 'network' }
 * >}
 *
 * 回傳值說明：
 *   - { ratio, sqm }    成功，包含亮度比值與天空品質
 *   - { error:'range' } 座標超出資料涵蓋範圍（65°S ~ 75°N）
 *   - { error:'network' } 網路錯誤或解壓縮失敗
 */
export async function getDjlorenzData(lat, lng) {
    const lonFDL = ((lng + 180) % 360 + 360) % 360;
    const latFS  = lat + 65.0;

    if (latFS < 0 || latFS > 140) return { error: 'range' };

    const tilex = Math.floor(lonFDL / 5.0) + 1;
    const tiley = Math.floor(latFS  / 5.0) + 1;
    if (tiley < 1 || tiley > 28) return { error: 'range' };

    const ix = Math.round(120 * (lonFDL - 5 * (tilex - 1) + 1 / 240));
    const iy = Math.round(120 * (latFS  - 5 * (tiley - 1) + 1 / 240));

    const url      = `https://djlorenz.github.io/astronomy/binary_tiles/2024/binary_tile_${tilex}_${tiley}.dat.gz`;
    const cacheKey = `${tilex}_${tiley}`;

    // 若尚未快取，建立 fetch Promise 並存入（同區塊的並發請求會共用此 Promise）
    if (!tileCache.has(cacheKey)) {
        tileCache.set(cacheKey, fetch(url)
            .then(resp => {
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                return resp.arrayBuffer();
            })
            .then(buf => new Int8Array(pako.ungzip(buf)))
            .catch(err => {
                tileCache.delete(cacheKey); // 失敗時移除，讓下次可重試
                throw err;
            })
        );
    }

    try {
        const data  = await tileCache.get(cacheKey);
        const first = 128 * Number(data[0]) + Number(data[1]);

        let change = 0;
        for (let i = 1; i < iy; i++) change += Number(data[600 * i + 1]);
        for (let i = 1; i < ix; i++) change += Number(data[600 * (iy - 1) + 1 + i]);

        const ratio = (5 / 195) * (Math.exp(0.0195 * (first + change)) - 1);
        const sqm   = 22.0 - 5.0 * Math.log(1 + ratio) / Math.log(100);

        return { ratio, sqm };
    } catch (err) {
        console.error('[lpData] 光害資料載入失敗:', err);
        return { error: 'network' };
    }
}
