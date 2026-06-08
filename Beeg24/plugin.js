(function () {
    const COOKIE_STRING = "from=SE; idcheck=1780898433; index_page=1; lfrom=noref; lp=/; ttt=BUzz70QrfKo; current_click=2; inpp_GXQ4_HVJ2=1; inpp_GXQ4_HVJ2_cap=1; cf_clearance=pTiUQU2LAzxuKgDFRckb848sK9yVGTdUUpaxcHxs8r8-1780898415-1.2.1.1-.Q9oghdE.bi70Rd0myEnRFX0a5.LcyjszO9ip_opfSNUHSMonJmIS1rQcR.R5gfOdkwPXkrFN5k.VgZXRZdgTEG5aBC2GZOZDFK9sO5vjtx7zic4kZ9rwbsWP4w4ytw0bQ2tKS1JlA_eiSl9GylQd26KCRNTVZjM409lHfQaYRl9hu9NjGgEYmkQA3E2qwhjTCTRg8a1zNdyQ6rIcbzPPO2EUvKmd3sR_D794l4w42eEyB5jYytk7x8lRar7fL7sHskCc5A1N1SpJQB69g0fs_dM4qECON3GXRP3CLFUqlpapCryVpkeblR9hFMIdA1KY76ldJGXigjlr13jM06Q";

    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
                        data[name] = parseVideoItems(res.body).slice(0, 20);
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
                await loadExtractor(streamUrl, streams);
            }
            cb({ success: true, data: streams });
        } catch (e) { cb({ success: false, message: e.message }); }
    }

    async function loadExtractor(url, streams) {
    if (!url) {
        console.log("Extractor: URL missing, skipping.");
        return;
    }

    // Server detection logic
    const getDisplayName = (u) => {
        if (u.includes("gdmirrorbot.nl") || u.includes("techinmind.space")) return "GDMirror";
        if (u.includes("awstream.net") || u.includes("as-cdn21.top")) return "AWSStream";
        if (u.includes("rubystm.com")) return "StreamRuby";
        if (u.includes("blakiteapi.xyz")) return "Blakite";
        if (u.includes("youtube.com")) return "YouTube";
        if (u.includes("vimeo.com")) return "Vimeo";
        if (u.includes("dood")) return "DoodStream";
        if (u.includes("filemoon")) return "FileMoon";
        if (u.includes("vidmoly")) return "VidMoly";
        if (u.includes("emturbovid")) return "TurboVid";
        try { return new URL(u).hostname.replace("www.", ""); } catch(e) { return "Server"; }
    };

    const serverName = getDisplayName(url);
    console.log(`[Extractor] Processing Server: ${serverName} | URL: ${url}`);

    // Router for extractors
    try {
        if (url.includes("gdmirrorbot.nl") || url.includes("stream.techinmind.space")) {
            console.log(`[Extractor] Routing to GDMirror...`);
            await extractGDMirror(url, streams);
        } else if (url.includes("awstream.net") || url.includes("as-cdn21.top")) {
            console.log(`[Extractor] Routing to AWSStream...`);
            await extractAWSStream(url, streams);
        } else if (url.includes("animedekho.app/aaa/") || url.includes("animedekho.co")) {
            console.log(`[Extractor] Routing to Animedekho...`);
            await extractAnimedekhoCo(url, streams);
        } else if (url.includes("rubystm.com")) {
            console.log(`[Extractor] Routing to StreamRuby...`);
            await extractStreamRuby(url, streams);
        } else if (url.includes("blakiteapi.xyz")) {
            console.log(`[Extractor] Routing to Blakite...`);
            await extractBlakite(url, streams);
        } else {
            // Basic fallback for generic extractors
            console.log(`[Extractor] No specific router found for ${serverName}, adding as generic.`);
            streams.push(new StreamResult({ url, source: serverName }));
        }
    } catch (e) {
        console.error(`[Extractor] Error in ${serverName}:`, e);
    }
}

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.loadStreams = loadStreams;
})();
