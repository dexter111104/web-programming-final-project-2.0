/**
 * state.js
 * 跨模組共享的可變狀態
 * 僅存放「多個模組都需要讀寫」的值；單一模組私有的狀態留在各自模組內。
 */
import { DEFAULT_YEAR } from './config.js';

export const state = {
    /** 目前選中的暗空地點索引（-1 表示未選中） */
    currentSiteIndex: -1,

    /** 前一個選中的暗空地點索引，用於判斷是否重新開啟同一聖地 */
    lastSiteIndex: -1,

    /** 地圖上目前的點擊標記（Leaflet Marker 或 null） */
    clickMarker: null,

    /** 目前顯示的光害資料年份（初始值來自 config.js，避免重複定義） */
    currentYear: DEFAULT_YEAR,
};
