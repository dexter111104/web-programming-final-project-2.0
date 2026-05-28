/**
 * geocode.js
 * 逆地理編碼：依經緯度查詢地名（Nominatim OpenStreetMap）
 */

/**
 * 依經緯度反查在地化地名
 * 網路失敗或查無結果時靜默回傳 null（呼叫端顯示座標數字即可）
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>}
 */
export async function reverseGeocode(lat, lng) {
    try {
        const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
            { headers: { 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' } }
        );
        if (!resp.ok) return null;

        const d = await resp.json();
        const a = d.address ?? {};
        return (
            a.city    ??
            a.town    ??
            a.village ??
            a.suburb  ??
            a.county  ??
            d.display_name?.split(',')[0] ??
            null
        );
    } catch {
        return null;
    }
}
