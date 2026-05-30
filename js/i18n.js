/**
 * i18n.js
 * 介面語言（中文 / English）：語言狀態、字典、靜態套用與重繪通知。
 * 僅作用於各「面板」UI；地圖本身與浮動 logo / 名稱不受影響。
 */

const STORAGE_KEY = 'lpa-lang';
let lang = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh';
const listeners = [];

// ── UI 字串字典 ───────────────────────────────────────────────
const UI = {
    // 靜態 HTML（data-i18n）
    loc_hint:      { zh: '點擊地圖上任意位置查詢光害資訊', en: 'Click anywhere on the map to check light pollution' },
    basemap:       { zh: '底圖選擇',                     en: 'Base map' },
    street:        { zh: '街道',                         en: 'Street' },
    satellite:     { zh: '衛星',                         en: 'Satellite' },
    lp_layer:      { zh: '光害圖層',                     en: 'Light pollution' },
    bortle_legend: { zh: '波特爾等級圖例',               en: 'Bortle scale legend' },
    darksites:     { zh: '國際暗空地點 (IDA 認證)',       en: 'Intl. Dark Sky Places (IDA)' },
    stargaze:      { zh: '今晚觀星時間',                 en: "Tonight's stargazing" },

    // 「標出全部地點」按鈕
    show_all_sites: { zh: '標出全部地點', en: 'Show all places' },
    hide_all_sites: { zh: '隱藏全部地點', en: 'Hide all places' },

    // 左側位置面板
    loading:          { zh: '載入中...',                              en: 'Loading...' },
    loc_out_of_range: { zh: '此位置超出資料範圍<br>(65°S ~ 75°N)',     en: 'Outside data coverage<br>(65°S – 75°N)' },
    lp_load_fail:     { zh: '⚠ 光害資料載入失敗<br>請確認網路連線後再試', en: '⚠ Failed to load data<br>Check your connection and retry' },
    sqm:              { zh: '天空品質 SQM',                           en: 'Sky quality (SQM)' },
    lp_index:         { zh: '光害指數',                               en: 'Light pollution index' },
    data_year:        { zh: '資料年份',                               en: 'Data year' },
    coords:           { zh: '座標',                                   en: 'Coordinates' },

    // 暗空地點列表 / 浮動面板
    list_loading:        { zh: '載入中…',                          en: 'Loading…' },
    list_load_fail:      { zh: '⚠ 暗空聖地資料載入失敗<br>請重新整理頁面', en: '⚠ Failed to load dark sky data<br>Please refresh the page' },
    site_desc_fallback:  { zh: 'IDA 認證暗天聖地，提供優質黑暗夜空環境。', en: 'An IDA-certified dark sky place offering pristine night skies.' },
    site_bortle_loading: { zh: '載入光害資料…',                     en: 'Loading light data…' },
    site_lp_fail:        { zh: '⚠ 光害資料載入失敗',                en: '⚠ Failed to load light data' },

    // 觀星時間
    select_location: { zh: '請選擇地點',                 en: 'Select a location' },
    calculating:     { zh: '計算中…',                   en: 'Calculating…' },
    polar_night:     { zh: '極夜 — 全天可觀星！',        en: 'Polar night — dark all day!' },
    midnight_sun:    { zh: '極晝 — 今夜無天文黑夜',      en: 'Midnight sun — no astronomical night' },
    sunset:          { zh: '日落',                       en: 'Sunset' },
    civil_end:       { zh: '民用暮光終',                 en: 'Civil dusk' },
    naut_end:        { zh: '航海暮光終',                 en: 'Nautical dusk' },
    astro_start:     { zh: '天文黑夜始',                 en: 'Astro. night begins' },
    not_occur:       { zh: '不發生',                     en: 'N/A' },
    stargaze_none:   { zh: '☁ 今夜無完整天文黑夜，不適合深空觀星', en: '☁ No full astronomical night tonight — poor for deep-sky' },
};

// ── 波特爾等級觀測說明（中／英）────────────────────────────────
const BORTLE_TIPS_I18N = {
    1: { zh: '銀河可在地面投下明顯陰影，黃道光與對日照清晰可見，極限星等 7.6–8.0。', en: 'The Milky Way casts obvious shadows; zodiacal light and gegenschein are visible. Naked-eye limiting magnitude 7.6–8.0.' },
    2: { zh: '夏季銀河結構極為豐富，許多梅西爾天體肉眼可見，極限星等 7.1–7.5。', en: 'The summer Milky Way is highly structured; many Messier objects are visible to the naked eye. Limiting magnitude 7.1–7.5.' },
    3: { zh: '銀河仍具複雜結構，地平線出現些微光害，極限星等 6.6–7.0。', en: 'The Milky Way still shows complex structure; slight light pollution appears near the horizon. Limiting magnitude 6.6–7.0.' },
    4: { zh: '多方向出現光害光丘，天頂銀河壯觀但缺乏細節，極限星等 6.3–6.5。', en: 'Light-pollution domes appear in several directions; the overhead Milky Way is impressive but lacks fine detail. Limiting magnitude 6.3–6.5.' },
    5: { zh: '最佳夜晚僅見黃道光痕跡，銀河天頂淡薄、近地平線消失，極限星等 5.6–6.0。', en: 'Only hints of zodiacal light on the best nights; the Milky Way is washed out overhead and invisible near the horizon. Limiting magnitude 5.6–6.0.' },
    6: { zh: '黃道光消失，地平線方向泛灰白光，銀河僅天頂可見，極限星等 5.1–5.5。', en: 'Zodiacal light is gone; the sky glows grayish-white low down, and the Milky Way shows only near the zenith. Limiting magnitude 5.1–5.5.' },
    7: { zh: '光害使整個天空呈淺灰色，銀河幾乎或完全不可見，極限星等 4.6–5.0。', en: 'Light pollution turns the whole sky light gray; the Milky Way is nearly or totally invisible. Limiting magnitude 4.6–5.0.' },
    8: { zh: '天空呈灰色或橙色、亮到可閱讀，許多熟悉的星座難以辨認，極限星等 4.1–4.5。', en: 'The sky glows gray or orange, bright enough to read by; many familiar constellations are faint or lost. Limiting magnitude 4.1–4.5.' },
    9: { zh: '多數星座不可見，除昴宿星團外肉眼幾乎看不到梅西爾天體，極限星等 4.0 以下。', en: 'Most constellations are invisible and, apart from the Pleiades, no Messier object shows to the naked eye. Limiting magnitude 4.0 or below.' },
};

// ── 光害區帶描述（中 → 英）────────────────────────────────────
const ZONE_DESC_EN = {
    '天空完全黑暗的觀測點':   'Completely dark sky site',
    '典型的真正黑暗的觀測點': 'Typical truly dark site',
    '鄉村的星空':             'Rural sky',
    '鄉村／郊區的過渡帶':     'Rural/suburban transition',
    '郊區的星空':             'Suburban sky',
    '明亮的郊區星空':         'Bright suburban sky',
    '郊區／城市的過渡帶':     'Suburban/urban transition',
    '城市的星空':             'City sky',
    '市中心的星空':           'Inner-city sky',
};

// ── 大洲名稱（中 → 英）────────────────────────────────────────
const CONTINENT_EN = {
    亞洲: 'Asia', 美洲: 'Americas', 歐洲: 'Europe',
    大洋洲: 'Oceania', 非洲: 'Africa', 其他: 'Other',
};

// ── 國家／地區（中 → 英），鍵為 darksites.json 的完整 country 字串 ──
const COUNTRY_EN = {
    '中國・四川省': 'Sichuan, China',
    '中國・廣東省': 'Guangdong, China',
    '丹麥': 'Denmark',
    '以色列・內蓋夫沙漠': 'Negev Desert, Israel',
    '加拿大・亞伯達省': 'Alberta, Canada',
    '加拿大・安大略省': 'Ontario, Canada',
    '加拿大・美國': 'Canada / USA',
    '加拿大・魁北克省': 'Quebec, Canada',
    '匈牙利': 'Hungary',
    '匈牙利・包爾紹德州': 'Borsod, Hungary',
    '南非': 'South Africa',
    '南非・北開普省': 'Northern Cape, South Africa',
    '台灣・南投縣': 'Nantou, Taiwan',
    '希臘・克法利尼亞島': 'Kefalonia, Greece',
    '德國・下薩克森': 'Lower Saxony, Germany',
    '德國・什列斯威': 'Schleswig, Germany',
    '德國・北萊茵-威斯特法倫州': 'North Rhine-Westphalia, Germany',
    '德國・巴伐利亞': 'Bavaria, Germany',
    '德國・巴伐利亞州': 'Bavaria, Germany',
    '德國・布蘭登堡州': 'Brandenburg, Germany',
    '德國・梅克倫堡': 'Mecklenburg, Germany',
    '德國・薩爾蘭': 'Saarland, Germany',
    '愛爾蘭・凱里郡': 'County Kerry, Ireland',
    '愛爾蘭・梅奧縣': 'County Mayo, Ireland',
    '挪威・芬馬克郡': 'Finnmark, Norway',
    '日本・岡山縣': 'Okayama, Japan',
    '日本・東京都': 'Tokyo, Japan',
    '日本・沖繩縣': 'Okinawa, Japan',
    '日本・福井縣': 'Fukui, Japan',
    '智利・科金博大區': 'Coquimbo, Chile',
    '沙烏地阿拉伯': 'Saudi Arabia',
    '法國・奧克西塔尼': 'Occitanie, France',
    '法國・庇里牛斯省': 'Pyrénées, France',
    '法國・濱海阿爾卑斯': 'Alpes-Maritimes, France',
    '澳大利亞・南澳': 'South Australia, Australia',
    '澳大利亞・南澳大利亞州': 'South Australia, Australia',
    '澳大利亞・新南威爾斯州': 'New South Wales, Australia',
    '澳大利亞・昆士蘭州': 'Queensland, Australia',
    '瑞士': 'Switzerland',
    '盧森堡': 'Luxembourg',
    '納米比亞': 'Namibia',
    '紐埃': 'Niue',
    '紐西蘭・坎特伯雷大區': 'Canterbury, New Zealand',
    '紐西蘭・塔斯曼地區': 'Tasman, New Zealand',
    '紐西蘭・奧克蘭大區': 'Auckland, New Zealand',
    '紐西蘭・奧塔哥地區': 'Otago, New Zealand',
    '紐西蘭・惠靈頓大區': 'Wellington, New Zealand',
    '紐西蘭・最南端': 'Southland, New Zealand',
    '美國・亞利桑那州': 'Arizona, USA',
    '美國・伊利諾伊州': 'Illinois, USA',
    '美國・佛羅里達州': 'Florida, USA',
    '美國・俄亥俄州': 'Ohio, USA',
    '美國・俄勒岡州': 'Oregon, USA',
    '美國・內華達州': 'Nevada, USA',
    '美國・加利福尼亞州': 'California, USA',
    '美國・北卡羅來納州': 'North Carolina, USA',
    '美國・北達科他州': 'North Dakota, USA',
    '美國・印第安納州': 'Indiana, USA',
    '美國・喬治亞州': 'Georgia, USA',
    '美國・奧克拉荷馬州': 'Oklahoma, USA',
    '美國・奧勒岡州': 'Oregon, USA',
    '美國・威斯康辛州': 'Wisconsin, USA',
    '美國・密歇根州': 'Michigan, USA',
    '美國・密西根州': 'Michigan, USA',
    '美國・德克薩斯州': 'Texas, USA',
    '美國・愛達荷州': 'Idaho, USA',
    '美國・新墨西哥州': 'New Mexico, USA',
    '美國・明尼蘇達州': 'Minnesota, USA',
    '美國・猶他州': 'Utah, USA',
    '美國・猶他州／科羅拉多州': 'Utah / Colorado, USA',
    '美國・田納西州': 'Tennessee, USA',
    '美國・科羅拉多州': 'Colorado, USA',
    '美國・維吉尼亞州': 'Virginia, USA',
    '美國・緬因州': 'Maine, USA',
    '美國・肯塔基州': 'Kentucky, USA',
    '美國・蒙大拿州': 'Montana, USA',
    '美國・西維吉尼亞州': 'West Virginia, USA',
    '美國・賓夕法尼亞州': 'Pennsylvania, USA',
    '美國・阿肯色州': 'Arkansas, USA',
    '英國・北愛爾蘭': 'Northern Ireland, UK',
    '英國・威爾斯': 'Wales, UK',
    '英國・海峽群島': 'Channel Islands, UK',
    '英國・英格蘭': 'England, UK',
    '英國・蘇格蘭': 'Scotland, UK',
    '英國・蘇格蘭內赫布里底群島': 'Inner Hebrides, Scotland, UK',
    '英國海外領土・南太平洋': 'South Pacific (UK Overseas Territory)',
    '荷蘭': 'Netherlands',
    '韓國・慶尚北道': 'North Gyeongsang, South Korea',
};

// ── 對外 API ──────────────────────────────────────────────────

/** 目前語言（'zh' | 'en'）*/
export function getLang() { return lang; }

/** 切換語言並通知所有監聽者重繪 */
export function setLang(next) {
    if (next !== 'zh' && next !== 'en') return;
    if (next === lang) return;
    lang = next;
    localStorage.setItem(STORAGE_KEY, lang);
    listeners.forEach(fn => fn(lang));
}

/** 註冊語言改變時的重繪回呼 */
export function onLangChange(fn) { listeners.push(fn); }

/** 取 UI 字串 */
export function t(key) {
    const e = UI[key];
    return e ? e[lang] : key;
}

/** 波特爾等級觀測說明 */
export function bortleTip(bortle) {
    const e = BORTLE_TIPS_I18N[bortle];
    return e ? e[lang] : '';
}

/** 光害區帶描述（傳入原中文 desc，英文模式回傳對照英文）*/
export function zoneDesc(zhDesc) {
    if (lang === 'zh') return zhDesc;
    return ZONE_DESC_EN[zhDesc] || zhDesc;
}

/** 大洲名稱 */
export function continentName(zhName) {
    if (lang === 'zh') return zhName;
    return CONTINENT_EN[zhName] || zhName;
}

/** 「IDA 認證 {year}」標題 */
export function idaYear(year) {
    if (lang === 'en') return year ? `IDA certified ${year}` : 'IDA certified';
    return year ? `IDA 認證 ${year}` : 'IDA 認證';
}

/** 「建議從 {time} 開始觀星」整句（含 <strong>）*/
export function bestFrom(time) {
    return lang === 'en'
        ? `⭐ Best viewing from <strong>${time}</strong>`
        : `⭐ 建議從 <strong>${time}</strong> 開始觀星`;
}

/** 地點名稱：英文模式優先用 ename，中文模式優先用 name */
export function siteName(site) {
    return lang === 'en'
        ? (site.ename || site.name || '')
        : (site.name  || site.ename || '');
}

/** 地點副標（中文模式下若有英文名則顯示；英文模式不重複顯示）*/
export function siteSubName(site) {
    if (lang === 'en') return '';
    return (site.ename && site.ename !== site.name) ? site.ename : '';
}

/** 地點國家／地區：英文模式查 COUNTRY_EN 對照表（缺則退回中文）*/
export function siteCountry(site) {
    if (lang === 'en') return COUNTRY_EN[site.country] || site.country || '';
    return site.country || '';
}

/** 地點介紹：英文模式用 desc_en（缺則退回中文 desc，再退回通用 fallback）*/
export function siteDesc(site) {
    if (lang === 'en') return site.desc_en || site.desc || t('site_desc_fallback');
    return site.desc || t('site_desc_fallback');
}

/** 套用所有 data-i18n 靜態字串到 DOM（載入時與語言改變時呼叫）*/
export function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (UI[key]) el.textContent = UI[key][lang];
    });
}
