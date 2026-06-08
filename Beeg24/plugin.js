(function () {
    const COOKIE_STRING = "from=SE; idcheck=1780898433; index_page=1; lfrom=noref; lp=/; ttt=BUzz70QrfKo; current_click=2; inpp_GXQ4_HVJ2=1; inpp_GXQ4_HVJ2_cap=1; cf_clearance=pTiUQU2LAzxuKgDFRckb848sK9yVGTdUUpaxcHxs8r8-1780898415-1.2.1.1-.Q9oghdE.bi70Rd0myEnRFX0a5.LcyjszO9ip_opfSNUHSMonJmIS1rQcR.R5gfOdkwPXkrFN5k.VgZXRZdgTEG5aBC2GZOZDFK9sO5vjtx7zic4kZ9rwbsWP4w4ytw0bQ2tKS1JlA_eiSl9GylQd26KCRNTVZjM409lHfQaYRl9hu9NjGgEYmkQA3E2qwhjTCTRg8a1zNdyQ6rIcbzPPO2EUvKmd3sR_D794l4w42eEyB5jYytk7x8lRar7fL7sHskCc5A1N1SpJQB69g0fs_dM4qECON3GXRP3CLFUqlpapCryVpkeblR9hFMIdA1KY76ldJGXigjlr13jM06Q";

    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/120.0.0.0",
        "Referer": "https://beeg24.org/",
        "Cookie": COOKIE_STRING
    };

    const BASE_URL = "https://beeg24.org";

    function parseVideoItems(html) {
        const items = [];
        const itemPattern = /<div class="small[^"]*">[\s\S]*?<a href="([^"]+)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<img src="([^"]+)"/gi;
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            items.push(new MultimediaItem({
                title: match[2].trim(),
                url: match[1].startsWith('http') ? match[1] : BASE_URL + match[1],
                posterUrl: match[3].startsWith('http') ? match[3] : BASE_URL + match[3],
                type: "movie",
                isAdult: true
            }));
        }
        return items;
    }

    async function getHome(cb) {
        try {
            const categories = {
                "Latest Updates": `${BASE_URL}/latest-updates/`,
                "Most Popular Today": `${BASE_URL}/most-popular/today/`,
                "Most Popular Week": `${BASE_URL}/most-popular/week/`,
                "Most Popular All": `${BASE_URL}/most-popular/all/`,
                "Categories": `${BASE_URL}/categories/`
            };
            
            const data = {};
            for (const [name, url] of Object.entries(categories)) {
                try {
                    const res = await http_get(url, HEADERS);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) data[name] = items.slice(0, 20);
                    }
                } catch (e) { console.error(`Error loading ${name}: ${e.message}`); }
            }
            cb({ success: true, data });
        } catch (e) { cb({ success: false, message: e.message }); }
    }

    async function search(query, cb) {
        try {
            const res = await http_get(`${BASE_URL}/search/${query.replace(/\s+/g, '-')}/`, HEADERS);
            cb({ success: true, data: parseVideoItems(res.body) });
        } catch (e) { cb({ success: false, message: e.message }); }
    }

    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            const html = res.body || "";
            const streams = [];
            const URL_PATTERN = /(https?:)?\/\/[^\s"'`<>]+(?:dood|streamtape|mixdrop|voe|vidhide|m3u8|mp4)[^\s"'`<>]+/gi;
            const matches = [...new Set(html.match(URL_PATTERN) || [])];
            
            for (let streamUrl of matches) {
                // Direct Play logic
                streams.push(new StreamResult({
                    url: streamUrl.startsWith('//') ? 'https:' + streamUrl : streamUrl,
                    source: "Direct Stream",
                    headers: HEADERS
                }));
            }
            cb({ success: true, data: streams });
        } catch (e) { cb({ success: false, message: e.message }); }
    }

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.loadStreams = loadStreams;
})();
