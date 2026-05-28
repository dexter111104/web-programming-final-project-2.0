/**
 * config.js
 * 全域常數：光害區帶對照表、波特爾說明、圖層參數
 */

/** 光害亮度比值 → 顏色與波特爾等級對照表 */
export const LP_ZONES = [
    { zone: '0',  maxR: 0.01,     color: '#9bb8ff', bortle: 1, desc: '天空完全黑暗的觀測點',   legend: true  },
    { zone: '1a', maxR: 0.06,     color: '#7fc4ff', bortle: 2, desc: '典型的真正黑暗的觀測點', legend: true  },
    { zone: '1b', maxR: 0.11,     color: '#a0d4ff', bortle: 2, desc: '典型的真正黑暗的觀測點', legend: false },
    { zone: '2a', maxR: 0.19,     color: '#3366cc', bortle: 3, desc: '鄉村的星空',             legend: false },
    { zone: '2b', maxR: 0.33,     color: '#4488ff', bortle: 3, desc: '鄉村的星空',             legend: false },
    { zone: '3a', maxR: 0.58,     color: '#00aa44', bortle: 3, desc: '鄉村的星空',             legend: true  },
    { zone: '3b', maxR: 1.00,     color: '#00dd55', bortle: 4, desc: '鄉村／郊區的過渡帶',     legend: true  },
    { zone: '4a', maxR: 1.73,     color: '#bbbb00', bortle: 4, desc: '鄉村／郊區的過渡帶',     legend: false },
    { zone: '4b', maxR: 3.00,     color: '#eeee00', bortle: 5, desc: '郊區的星空',             legend: true  },
    { zone: '5a', maxR: 5.20,     color: '#ee8800', bortle: 5, desc: '郊區的星空',             legend: false },
    { zone: '5b', maxR: 9.00,     color: '#ffaa44', bortle: 6, desc: '明亮的郊區星空',         legend: true  },
    { zone: '6a', maxR: 15.59,    color: '#ff4444', bortle: 6, desc: '明亮的郊區星空',         legend: false },
    { zone: '6b', maxR: 27.00,    color: '#ff8888', bortle: 7, desc: '郊區／城市的過渡帶',     legend: true  },
    { zone: '7a', maxR: 46.77,    color: '#bbbbbb', bortle: 8, desc: '城市的星空',             legend: true  },
    { zone: '7b', maxR: Infinity, color: '#eeeeee', bortle: 9, desc: '市中心的星空',            legend: true  },
];

/** 波特爾等級對應的觀測詳細說明 */
export const BORTLE_TIPS = {
    1: '銀河可在地面投下陰影，黃道光清晰，極限星等達 7.6–8.0。',
    2: '銀河細節豐富，大氣光沿地平線隱約可見，極限星等 7.1–7.5。',
    3: '銀河結構清晰可辨，地平線有輕微光害跡象，極限星等 6.6–7.0。',
    4: '多方向可見光害，銀河精細結構模糊，極限星等 6.1–6.5。',
    5: '黃道光幾乎消失，銀河僅天頂方向可辨，極限星等 5.6–6.0。',
    6: '銀河僅天頂隱約可見，城市光害明顯，極限星等 5.1–5.5。',
    7: '銀河輪廓模糊，天空呈灰白色，極限星等約 4.5–5.0。',
    8: '天空呈橙灰色，大多數星座難以辨認，極限星等約 4.0。',
    9: '天空呈白橙色，僅剩最亮的少數星可見，極限星等低於 4.0。',
};

/** 光害疊加圖層預設透明度 */
export const LP_OPACITY = 0.7;

/** 預設顯示年份 */
export const DEFAULT_YEAR = '2024';
