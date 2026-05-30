/**
 * util.js
 * 共用小工具。
 */

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * 跳脫 HTML 特殊字元，供需要以 innerHTML 內插字串時使用，
 * 讓渲染「結構上安全」，而非僅依賴資料來源乾淨。
 * @param {*} value - 任意值（會先轉成字串）
 * @returns {string}
 */
export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ESC_MAP[ch]);
}
