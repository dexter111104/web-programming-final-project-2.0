const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/darksites.json');
let sites = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Map ename → IDA type for the 25 existing entries missing type field
const typeMap = {
    'Hehuanshan Dark Sky Park': 'P',
    'Iriomote-Ishigaki National Park': 'P',
    'Kozushima Island': 'C',
    'Death Valley National Park': 'P',
    'Grand Canyon National Park': 'P',
    'Yeongyang Firefly Dark Sky Park': 'P',
    'Warrumbungle National Park': 'P',
    'Kerry International Dark Sky Reserve': 'R',
    'NamibRand Nature Reserve': 'R',
    'Natural Bridges National Monument': 'P',
    'Cherry Springs State Park': 'P',
    'Galloway Forest Park': 'P',
    'Hortobágy National Park': 'P',
    'Big Bend National Park': 'P',
    'Aoraki Mackenzie Dark Sky Reserve': 'R',
    'Brecon Beacons National Park': 'R',
    'Pic du Midi de Bigorre': 'R',
    'Eifel National Park': 'P',
    'Westhavelland Nature Park': 'R',
    'Snowdonia National Park (Eryri)': 'R',
    'Waterton-Glacier International Peace Park': 'P',
    'Makhtesh Ramon (Ramon Crater)': 'P',
    'Joshua Tree National Park': 'P',
    'Craters of the Moon National Monument': 'P',
    'Flagstaff, Arizona': 'C',
};

// Insert type field into existing entries that are missing it
sites = sites.map(site => {
    if (!site.type && site.ename && typeMap[site.ename]) {
        const { name, ename, country, year, lat, lng, zoom, desc, img } = site;
        return { name, ename, country, year, lat, lng, zoom, type: typeMap[site.ename], desc, img };
    }
    return site;
});

// 62 new entries (Parks / Reserves / Communities / Sanctuaries)
const newEntries = [
    // ── Parks (22) ─────────────────────────────────────────────
    {
        name: '大彎牧場州立公園',
        ename: 'Big Bend Ranch State Park',
        country: '美國・德克薩斯州',
        year: 2017,
        lat: 29.44,
        lng: -104.11,
        zoom: 8,
        type: 'P',
        desc: 'IDA 認證暗天公園。緊鄰大彎國家公園，廣袤德州荒野中的偏遠牧場，極低光害帶來壯觀銀河景象，是德州西部最純淨的觀星地之一。',
        img: null
    },
    {
        name: '死馬角州立公園',
        ename: 'Dead Horse Point State Park',
        country: '美國・猶他州',
        year: 2016,
        lat: 38.48,
        lng: -109.74,
        zoom: 9,
        type: 'P',
        desc: 'IDA 認證暗天公園。科羅拉多河蜿蜒於峽谷之中，高台俯瞰視野震撼，無光害的猶他夜空讓這片地貌在銀河映照下更顯壯麗。',
        img: null
    },
    {
        name: '烏帕特基國家保護區',
        ename: 'Wupatki National Monument',
        country: '美國・亞利桑那州',
        year: 2016,
        lat: 35.52,
        lng: -111.37,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。古普韋布洛人石砌遺址，位於弗拉格斯塔夫北部荒原，乾燥透明的亞利桑那夜空與千年古蹟共同構成獨特觀星體驗。',
        img: null
    },
    {
        name: '核桃峽谷國家保護區',
        ename: 'Walnut Canyon National Monument',
        country: '美國・亞利桑那州',
        year: 2016,
        lat: 35.17,
        lng: -111.51,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。辛那瓜人崖居遺址嵌入峽谷壁間，弗拉格斯塔夫暗天生態系的重要成員，夜空清澈，古蹟與星空相得益彰。',
        img: null
    },
    {
        name: '日落火山口國家保護區',
        ename: 'Sunset Crater Volcano National Monument',
        country: '美國・亞利桑那州',
        year: 2016,
        lat: 35.37,
        lng: -111.50,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。約 900 年前的火山噴發遺跡，熔岩地景奇特，是弗拉格斯塔夫暗天保護區域的組成部分，亞利桑那高原夜空透明澄澈。',
        img: null
    },
    {
        name: '紐波特州立公園',
        ename: 'Newport State Park',
        country: '美國・威斯康辛州',
        year: 2017,
        lat: 45.23,
        lng: -86.99,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。威斯康辛州首座暗天公園，多爾半島北端三面環湖，湖面鏡映繁星，夏夜偶可見極光，是五大湖區最受歡迎的觀星地之一。',
        img: null
    },
    {
        name: '中叉河森林保護區',
        ename: 'Middle Fork River Forest Preserve',
        country: '美國・伊利諾伊州',
        year: 2018,
        lat: 40.14,
        lng: -87.95,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。伊利諾伊州農業平原中的濕地保護區，2018 年獲認，是美國中西部城市近郊少見的低光害自然保育地。',
        img: null
    },
    {
        name: '大沙丘國家公園',
        ename: 'Great Sand Dunes National Park',
        country: '美國・科羅拉多州',
        year: 2019,
        lat: 37.73,
        lng: -105.51,
        zoom: 9,
        type: 'P',
        desc: '北美最高沙丘群，高逾 230 公尺，2019 年獲 IDA 認證。聖路易斯河谷超低光害環境讓銀河倒映於沙丘之間，是科羅拉多州最震撼的夜空體驗之一。',
        img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Milky_Way_over_Great_Sand_Dunes_National_Park.jpg/500px-Milky_Way_over_Great_Sand_Dunes_National_Park.jpg'
    },
    {
        name: '埃爾莫羅國家保護區',
        ename: 'El Morro National Monument',
        country: '美國・新墨西哥州',
        year: 2019,
        lat: 35.04,
        lng: -108.35,
        zoom: 11,
        type: 'P',
        desc: 'IDA 認證暗天公園。砂岩巨壁上刻有自西班牙殖民時期至今的千年銘文，新墨西哥高原清澈夜空讓這座歷史巨石在星光下熠熠生輝。',
        img: null
    },
    {
        name: '皮斯加天文研究院',
        ename: 'Pisgah Astronomical Research Institute',
        country: '美國・北卡羅來納州',
        year: 2020,
        lat: 35.20,
        lng: -82.87,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。前 NASA 追蹤站改建而成的天文研究與教育中心，位於北卡阿巴拉契亞山脈，是美東南部重要的暗天天文基地。',
        img: null
    },
    {
        name: '懷伊蒂暗天公園',
        ename: 'Wai-iti Dark Sky Park',
        country: '紐西蘭・塔斯曼地區',
        year: 2020,
        lat: -41.44,
        lng: 173.08,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。紐西蘭南島北部塔斯曼地區的農業山丘，低光害環境帶來清晰可見的南天星座，是南島北部的重要觀星據點。',
        img: null
    },
    {
        name: '魁蒂科省立公園',
        ename: 'Quetico Provincial Park',
        country: '加拿大・安大略省',
        year: 2021,
        lat: 48.0,
        lng: -91.5,
        zoom: 7,
        type: 'P',
        desc: 'IDA 認證暗天公園。加拿大安大略省廣袤的原始荒野，千湖交織、林木蒼翠，極低光害環境下可見壯麗銀河與北極光，是北美最純粹的野外觀星地之一。',
        img: null
    },
    {
        name: '瓦萊斯卡爾德拉國家保護區',
        ename: 'Valles Caldera National Preserve',
        country: '美國・新墨西哥州',
        year: 2021,
        lat: 35.87,
        lng: -106.55,
        zoom: 9,
        type: 'P',
        desc: 'IDA 認證暗天公園。直徑約 22 公里的壯觀古火山破火山口，廣闊高原草地四周無光害，2021 年獲認，是美國西南部最磅礴的暗天景觀之一。',
        img: null
    },
    {
        name: '天空牧場州立公園',
        ename: 'Sky Meadows State Park',
        country: '美國・維吉尼亞州',
        year: 2021,
        lat: 38.97,
        lng: -77.97,
        zoom: 11,
        type: 'P',
        desc: 'IDA 認證暗天公園。維吉尼亞州阿巴拉契亞山麓的牧場公園，2021 年獲認，是大華盛頓地區居民最方便抵達的暗天觀星地之一。',
        img: null
    },
    {
        name: '巨岩城國家保護區',
        ename: 'City of Rocks National Reserve',
        country: '美國・愛達荷州',
        year: 2023,
        lat: 42.07,
        lng: -113.72,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。愛達荷州南部壯觀花崗岩柱群，昔日淘金小道的重要地標，2023 年獲認，巨石剪影在無光害星空下呈現超現實景象。',
        img: null
    },
    {
        name: '埃諾斯國家公園',
        ename: 'Aenos National Park',
        country: '希臘・克法利尼亞島',
        year: 2023,
        lat: 38.12,
        lng: 20.63,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。位於希臘愛奧尼亞海克法利尼亞島的高山國家公園，2023 年獲認，是地中海地區首批暗天認證自然保護地之一。',
        img: null
    },
    {
        name: '特朗布蘭山國家公園',
        ename: 'Mont-Tremblant National Park',
        country: '加拿大・魁北克省',
        year: 2023,
        lat: 46.5,
        lng: -74.5,
        zoom: 8,
        type: 'P',
        desc: 'IDA 認證暗天公園。魁北克省著名的四季度假勝地，2023 年獲認，廣袤勞倫欽高原森林遠離都市光害，提供北美城市近郊罕見的高品質暗天體驗。',
        img: null
    },
    {
        name: '牛津森林保護區',
        ename: 'Oxford Forest Conservation Area',
        country: '紐西蘭・坎特伯雷大區',
        year: 2024,
        lat: -43.3,
        lng: 172.0,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。位於紐西蘭南島坎特伯雷地區，2024 年獲認，是紐西蘭持續推廣暗天保育成果的新一員。',
        img: null
    },
    {
        name: '卡瓦勞吉布斯頓暗天公園',
        ename: 'Kawarau Gibbston Dark Sky Park',
        country: '紐西蘭・奧塔哥地區',
        year: 2024,
        lat: -44.97,
        lng: 169.03,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。紐西蘭南島奧塔哥卡瓦勞峽谷，2024 年獲認，峽谷地形與清澈南半球夜空提供令人難忘的觀星環境。',
        img: null
    },
    {
        name: '上帕斯維克國家公園',
        ename: 'Øvre Pasvik National Park',
        country: '挪威・芬馬克郡',
        year: 2024,
        lat: 69.5,
        lng: 29.5,
        zoom: 8,
        type: 'P',
        desc: 'IDA 認證暗天公園。挪威最北端靠近俄芬邊境的原始荒野，2024 年獲認，是斯堪地納維亞首批 IDA 認證地點之一，極夜期間可觀測壯麗極光。',
        img: null
    },
    {
        name: '卡普洛克峽谷州立公園',
        ename: 'Caprock Canyons State Park',
        country: '美國・德克薩斯州',
        year: 2025,
        lat: 34.11,
        lng: -101.06,
        zoom: 8,
        type: 'P',
        desc: 'IDA 認證暗天公園。德克薩斯州帕納漢德爾南緣的紅砂岩峽谷，2025 年獲認，廣袤高原帶來優質黑暗夜空，是德州西部觀察銀河的絕佳去處。',
        img: null
    },
    {
        name: '雪峽谷州立公園',
        ename: 'Snow Canyon State Park',
        country: '美國・猶他州',
        year: 2025,
        lat: 37.2,
        lng: -113.65,
        zoom: 10,
        type: 'P',
        desc: 'IDA 認證暗天公園。猶他州西南部火成岩峽谷，毗鄰聖喬治市，2025 年獲認，是猶他州南部暗天保育網絡的新成員。',
        img: null
    },

    // ── Reserves (2) ───────────────────────────────────────────
    {
        name: '墨累河國際暗天保護區',
        ename: 'River Murray International Dark Sky Reserve',
        country: '澳大利亞・南澳大利亞州',
        year: 2019,
        lat: -33.5,
        lng: 140.5,
        zoom: 7,
        type: 'R',
        desc: 'IDA 認證暗天保護區。南澳大利亞州墨累河流域廣大暗天區，2019 年獲認，是南半球最重要的 IDA 暗天保護區之一，南十字星高掛廣袤澳洲夜空。',
        img: null
    },
    {
        name: '懷拉拉帕暗天保護區',
        ename: 'Wairarapa Dark Sky Reserve',
        country: '紐西蘭・惠靈頓大區',
        year: 2023,
        lat: -41.0,
        lng: 175.5,
        zoom: 8,
        type: 'R',
        desc: 'IDA 認證暗天保護區。紐西蘭北島南端的農業平原，2023 年獲認，為惠靈頓都會區居民提供絕佳的暗天觀星體驗，南十字星倒映於靜謐田野。',
        img: null
    },

    // ── Communities (20) ────────────────────────────────────────
    {
        name: '荷馬格倫暗天社區',
        ename: 'Homer Glen Dark Sky Community',
        country: '美國・伊利諾伊州',
        year: 2011,
        lat: 41.60,
        lng: -87.94,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。伊利諾伊州芝加哥郊區，2011 年獲認，是美國中西部大都市圈內推動暗天保育的先驅社區，積極推廣負責任照明政策。',
        img: null
    },
    {
        name: '貝弗利海岸暗天社區',
        ename: 'Beverly Shores Dark Sky Community',
        country: '美國・印第安納州',
        year: 2014,
        lat: 41.68,
        lng: -87.00,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。印第安納沙丘國家公園旁的密歇根湖濱小社區，2014 年獲認，是大湖區城市近郊推廣暗天保育的典範。',
        img: null
    },
    {
        name: '塞多納暗天社區',
        ename: 'Sedona Dark Sky Community',
        country: '美國・亞利桑那州',
        year: 2014,
        lat: 34.87,
        lng: -111.79,
        zoom: 11,
        type: 'C',
        desc: 'IDA 認證暗天社區。亞利桑那州的紅岩旅遊名城，2014 年獲認，壯麗紅岩地景搭配清澈亞利桑那夜空，是全美最知名的觀星旅遊小鎮之一。',
        img: null
    },
    {
        name: '雷霆山普特西暗天社區',
        ename: 'Thunder Mountain Pootsee Dark Sky Community',
        country: '美國・亞利桑那州',
        year: 2015,
        lat: 37.15,
        lng: -112.80,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。位於亞利桑那州北部的小型社區，2015 年獲認，是美國西南部推廣暗天保育的重要基層組織之一。',
        img: null
    },
    {
        name: '邦阿科德暗天社區',
        ename: 'Bon Accord Dark Sky Community',
        country: '加拿大・亞伯達省',
        year: 2015,
        lat: 53.84,
        lng: -113.42,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。亞伯達省埃德蒙頓市郊小鎮，2015 年獲認，是加拿大首批 IDA 認證暗天社區之一，積極推動城鎮照明改革。',
        img: null
    },
    {
        name: '馬蹄灣暗天社區',
        ename: 'Horseshoe Bay Dark Sky Community',
        country: '美國・德克薩斯州',
        year: 2015,
        lat: 30.54,
        lng: -98.37,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。德克薩斯州希爾鄉的湖濱社區，2015 年獲認，是德州推廣暗天友善照明的重要社區典範。',
        img: null
    },
    {
        name: '大公園橡溪村暗天社區',
        ename: 'Big Park/Village of Oak Creek Dark Sky Community',
        country: '美國・亞利桑那州',
        year: 2016,
        lat: 34.72,
        lng: -111.78,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。塞多納附近橡溪峽谷的住宅社區，2016 年獲認，與周邊暗天地點共同構成亞利桑那州最密集的暗天保育帶。',
        img: null
    },
    {
        name: '河橡樹暗天社區',
        ename: 'River Oaks Dark Sky Community',
        country: '美國・德克薩斯州',
        year: 2017,
        lat: 32.77,
        lng: -97.40,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。德克薩斯州沃斯堡都市區內的小型社區，2017 年獲認，是美國大都市圈內推動負責任照明政策的積極範例。',
        img: null
    },
    {
        name: '凱彻姆暗天社區',
        ename: 'Ketchum Dark Sky Community',
        country: '美國・愛達荷州',
        year: 2017,
        lat: 43.68,
        lng: -114.36,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。愛達荷州太陽谷滑雪度假小鎮，2017 年獲認，高海拔乾燥氣候帶來卓越星空透明度，是愛達荷州最知名的暗天社區。',
        img: null
    },
    {
        name: '莫恩與尼奧爾暗天社區',
        ename: 'Møn and Nyord Dark Sky Community',
        country: '丹麥',
        year: 2017,
        lat: 54.97,
        lng: 12.55,
        zoom: 11,
        type: 'C',
        desc: 'IDA 認證暗天社區。丹麥波羅的海的寧靜小島，2017 年獲認，是北歐首批 IDA 認證地點，島嶼自然隔離帶來斯堪地納維亞難得的低光害夜空。',
        img: null
    },
    {
        name: '噴泉山暗天社區',
        ename: 'Fountain Hills Dark Sky Community',
        country: '美國・亞利桑那州',
        year: 2018,
        lat: 33.61,
        lng: -111.72,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。鳳凰城東北郊以世界最高噴泉聞名，2018 年獲認，積極改善社區照明，是大鳳凰城地區推廣暗天保育的標竿社區。',
        img: null
    },
    {
        name: '托雷暗天社區',
        ename: 'Torrey Dark Sky Community',
        country: '美國・猶他州',
        year: 2018,
        lat: 38.10,
        lng: -111.40,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。緊鄰峽谷地與Capitol Reef國家公園的小鎮，2018 年獲認，是猶他州暗天保育最活躍的社區之一。',
        img: null
    },
    {
        name: '坎普維德暗天社區',
        ename: 'Camp Verde Dark Sky Community',
        country: '美國・亞利桑那州',
        year: 2018,
        lat: 34.56,
        lng: -111.84,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。亞利桑那州維德河谷的歷史小鎮，2018 年獲認，低光害河谷地形帶來優質觀星條件，是亞利桑那中部重要的暗天保育社區。',
        img: null
    },
    {
        name: '溫伯利與伍德克里克暗天社區',
        ename: 'Wimberley and Woodcreek Dark Sky Community',
        country: '美國・德克薩斯州',
        year: 2018,
        lat: 29.97,
        lng: -98.10,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。德克薩斯州希爾鄉的藝術小鎮，2018 年獲認，賽普拉斯溪旁的自然環境與嚴格照明管制共同守護這片德州南部的美麗暗天。',
        img: null
    },
    {
        name: '萊克伍德村暗天社區',
        ename: 'Lakewood Village Dark Sky Community',
        country: '美國・德克薩斯州',
        year: 2020,
        lat: 33.14,
        lng: -97.01,
        zoom: 13,
        type: 'C',
        desc: 'IDA 認證暗天社區。達拉斯-沃斯堡大都市區北郊的湖濱社區，2020 年獲認，是大都市圈郊區積極推動暗天友善照明的典範。',
        img: null
    },
    {
        name: '克雷斯通暗天社區',
        ename: 'Crestone Dark Sky Community',
        country: '美國・科羅拉多州',
        year: 2020,
        lat: 37.99,
        lng: -105.70,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。科羅拉多州聖路易斯河谷的靈性高山小鎮，海拔約 2,470 公尺，2020 年獲認，銀河橫跨布蘭卡峰的景象令人屏息。',
        img: null
    },
    {
        name: '格羅夫蘭暗天社區',
        ename: 'Groveland Dark Sky Community',
        country: '美國・佛羅里達州',
        year: 2023,
        lat: 28.56,
        lng: -81.85,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。佛羅里達州中部小鎮，2023 年獲認，是佛州首批 IDA 認證暗天社區之一，積極推廣負責任照明政策。',
        img: null
    },
    {
        name: '蜂巢暗天社區',
        ename: 'Bee Cave Dark Sky Community',
        country: '美國・德克薩斯州',
        year: 2023,
        lat: 30.30,
        lng: -97.96,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。奧斯汀西郊快速發展中的社區，2023 年獲認，在都市擴張壓力下仍積極維護暗天環境，是德州大都市近郊暗天保育的創新實踐。',
        img: null
    },
    {
        name: '布雷肯里奇暗天社區',
        ename: 'Breckenridge Dark Sky Community',
        country: '美國・科羅拉多州',
        year: 2025,
        lat: 39.48,
        lng: -106.04,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。科羅拉多州著名高山滑雪度假小鎮，海拔約 2,926 公尺，2025 年獲認，是洛磯山區推動暗天保育的最新成員。',
        img: null
    },
    {
        name: '納斯比暗天社區',
        ename: 'Naseby Dark Sky Community',
        country: '紐西蘭・奧塔哥地區',
        year: 2025,
        lat: -45.01,
        lng: 170.14,
        zoom: 12,
        type: 'C',
        desc: 'IDA 認證暗天社區。紐西蘭南島奧塔哥的淘金時代歷史小鎮，2025 年獲認，是紐西蘭最新一批暗天認證社區之一。',
        img: null
    },

    // ── Sanctuaries (18) ────────────────────────────────────────
    {
        name: '宇宙露營地暗天庇護所',
        ename: 'Cosmic Campground International Dark Sky Sanctuary',
        country: '美國・新墨西哥州',
        year: 2016,
        lat: 33.63,
        lng: -108.51,
        zoom: 9,
        type: 'S',
        desc: '美洲首座 IDA 認證暗天庇護所（2016 年），位於希拉國家森林邊緣，無人工照明，銀河橫跨整個天穹，是北美大陸最純粹的原始暗天體驗之一。',
        img: null
    },
    {
        name: '奧蒂亞大障礙島暗天庇護所',
        ename: 'Aotea/Great Barrier Island International Dark Sky Sanctuary',
        country: '紐西蘭・奧克蘭大區',
        year: 2017,
        lat: -36.18,
        lng: 175.45,
        zoom: 9,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。奧克蘭以北的大障礙島，無市政電力供應，以再生能源驅動的離網社區保存了紐西蘭北島最純淨的夜空，是南太平洋獨特的暗天保育典範。',
        img: null
    },
    {
        name: '加布里埃拉米斯特拉爾暗天庇護所',
        ename: 'Gabriela Mistral International Dark Sky Sanctuary',
        country: '智利・科金博大區',
        year: 2015,
        lat: -29.0,
        lng: -70.5,
        zoom: 8,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。以諾貝爾文學獎得主命名，位於智利埃爾基河谷，是南美洲首批 IDA 認證地點之一，智利天文觀測條件享譽全球。',
        img: null
    },
    {
        name: '大屠殺岩暗天庇護所',
        ename: 'Massacre Rim International Dark Sky Sanctuary',
        country: '美國・內華達州',
        year: 2019,
        lat: 41.10,
        lng: -119.50,
        zoom: 8,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。內華達州黑岩沙漠旁的偏遠高原，2019 年獲認，大盆地廣袤荒野帶來 Bortle 1-2 級的超暗天空，是終極暗天朝聖地。',
        img: null
    },
    {
        name: '惡魔河暗天庇護所',
        ename: 'Devils River State Natural Area International Dark Sky Sanctuary',
        country: '美國・德克薩斯州',
        year: 2019,
        lat: 29.97,
        lng: -100.97,
        zoom: 8,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。德克薩斯州最偏遠的州立自然保護區，2019 年獲認，惡魔河流域無人荒野帶來德州最純淨的夜空之一。',
        img: null
    },
    {
        name: '彩虹橋暗天庇護所',
        ename: 'Rainbow Bridge National Monument International Dark Sky Sanctuary',
        country: '美國・猶他州',
        year: 2018,
        lat: 37.08,
        lng: -110.96,
        zoom: 10,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。世界最大天然石橋之一，納瓦霍民族聖地，需乘船抵達，2018 年獲認，幾乎零光害的夜空讓神聖砂岩彩虹橋在繁星下更顯莊嚴。',
        img: null
    },
    {
        name: '卡塔丁森林與水域暗天庇護所',
        ename: 'Katahdin Woods and Waters National Monument International Dark Sky Sanctuary',
        country: '美國・緬因州',
        year: 2020,
        lat: 46.05,
        lng: -68.70,
        zoom: 8,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。緬因州北部原始荒野，阿帕拉契山徑的北端終點，2020 年獲認，人跡罕至的原始森林保存了美國東北部最純淨的星空，秋冬可見極光。',
        img: null
    },
    {
        name: '紐埃暗天庇護所',
        ename: 'Niue International Dark Sky Place',
        country: '紐埃',
        year: 2020,
        lat: -19.05,
        lng: -169.87,
        zoom: 10,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。南太平洋中的珊瑚礁島國，2020 年整個島國獲認，是全球最早以國家規模獲得 IDA 認證的地方，熱帶夜空南天星座一覽無遺。',
        img: null
    },
    {
        name: '醫藥岩暗天庇護所',
        ename: 'Medicine Rocks State Park International Dark Sky Sanctuary',
        country: '美國・蒙大拿州',
        year: 2020,
        lat: 46.15,
        lng: -104.55,
        zoom: 10,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。蒙大拿州東部奇特砂岩地貌，美洲原住民聖地，2020 年獲認，廣袤蒙大拿大平原帶來超低光害環境，「大天空之州」的名副其實之處。',
        img: null
    },
    {
        name: '邊界水域暗天庇護所',
        ename: 'Boundary Waters Canoe Area Wilderness International Dark Sky Sanctuary',
        country: '美國・明尼蘇達州',
        year: 2020,
        lat: 47.9,
        lng: -91.8,
        zoom: 7,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。明尼蘇達州超過 100 萬英畝的原始荒野水域，2020 年獲認，千湖之間純淨夜空倒映繁星如畫，每年北極光頻繁出現，是美國中西部最珍貴的暗天地。',
        img: null
    },
    {
        name: '艾哈海卡拉哈里暗天庇護所',
        ename: '!Ae!Hai Kalahari Heritage Park International Dark Sky Sanctuary',
        country: '南非・北開普省',
        year: 2019,
        lat: -26.5,
        lng: 20.5,
        zoom: 7,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。南非喀拉哈里沙漠中的桑族文化遺產公園，2019 年獲認，是非洲首個 IDA 認證地點，乾燥沙漠帶來非洲南部最純淨的夜空。',
        img: null
    },
    {
        name: '跳坡暗天庇護所',
        ename: 'The Jump-Up International Dark Sky Sanctuary',
        country: '澳大利亞・昆士蘭州',
        year: 2019,
        lat: -26.0,
        lng: 145.0,
        zoom: 8,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。澳大利亞昆士蘭州內陸偏遠地區，2019 年獲認，廣袤澳洲內陸極低光害環境是觀測南天銀河核心和南十字星的絕佳地點。',
        img: null
    },
    {
        name: '斯圖爾特島拉基烏拉暗天庇護所',
        ename: 'Stewart Island/Rakiura International Dark Sky Sanctuary',
        country: '紐西蘭・最南端',
        year: 2019,
        lat: -47.0,
        lng: 168.0,
        zoom: 9,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。紐西蘭最南端大型島嶼，以頻繁可見南半球極光著稱，2019 年獲認，原始森林與純淨海洋空氣帶來南太平洋最純淨的夜空之一。',
        img: null
    },
    {
        name: '皮特凱恩群島暗天庇護所',
        ename: 'Pitcairn Islands International Dark Sky Sanctuary',
        country: '英國海外領土・南太平洋',
        year: 2019,
        lat: -25.07,
        lng: -130.10,
        zoom: 10,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。以邦蒂號叛變後裔居住著稱，世界上人口最少的有人島，2019 年獲認，遠離塵囂帶來地球上最純淨的夜空之一，肉眼可見數千顆星星。',
        img: null
    },
    {
        name: '巴西島暗天庇護所',
        ename: 'Bardsey Island International Dark Sky Sanctuary',
        country: '英國・威爾斯',
        year: 2023,
        lat: 52.75,
        lng: -4.80,
        zoom: 12,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。威爾斯西端中世紀基督教朝聖小島，常住人口極少，2023 年獲認，凱爾特海清澈大氣帶來卓越夜空透明度，古老修道院在銀河映照下盡顯神聖。',
        img: null
    },
    {
        name: '俄勒岡荒野暗天庇護所',
        ename: 'Oregon Outback International Dark Sky Sanctuary',
        country: '美國・俄勒岡州',
        year: 2024,
        lat: 42.5,
        lng: -120.5,
        zoom: 7,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。俄勒岡州東南部廣袤高沙漠荒野，2024 年獲認，是美國西海岸最大連續暗天區域之一，壯麗的高沙漠銀河全景令人歎為觀止。',
        img: null
    },
    {
        name: '凱科拉暗天庇護所',
        ename: 'Kaikōura International Dark Sky Sanctuary',
        country: '紐西蘭・坎特伯雷大區',
        year: 2024,
        lat: -42.4,
        lng: 173.7,
        zoom: 10,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。紐西蘭南島東岸以觀賞鯨豚著稱的海濱小鎮，2024 年獲認，太平洋海濱清澈夜空帶來優質觀星環境，日賞鯨豚、夜觀繁星是此地獨特體驗。',
        img: null
    },
    {
        name: '塔胡納格倫諾基暗天庇護所',
        ename: 'Tāhuna Glenorchy International Dark Sky Sanctuary',
        country: '紐西蘭・奧塔哥地區',
        year: 2025,
        lat: -44.9,
        lng: 168.4,
        zoom: 11,
        type: 'S',
        desc: 'IDA 認證暗天庇護所。瓦卡蒂普湖北端、電影《魔戒》拍攝地之一，2025 年獲認，雪山倒映湖面的繁星景象如夢似幻，是紐西蘭最新一批暗天認證地點。',
        img: null
    },
];

sites = sites.concat(newEntries);

fs.writeFileSync(filePath, JSON.stringify(sites, null, 2), 'utf8');

const byType = { P: 0, R: 0, C: 0, S: 0 };
sites.forEach(s => { if (s.type) byType[s.type]++; });
console.log(`完成！共 ${sites.length} 個暗天聖地`);
console.log(`  公園 (P): ${byType.P}`);
console.log(`  保護區 (R): ${byType.R}`);
console.log(`  社區 (C): ${byType.C}`);
console.log(`  庇護所 (S): ${byType.S}`);
