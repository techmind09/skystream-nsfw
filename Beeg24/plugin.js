/**
 * Beeg24 Completely Updated Plugin Code
 */
(function () {
    const COOKIE_STRING = "from=SE; idcheck=1780898433; index_page=1; lfrom=noref; lp=/; ttt=BUzz70QrfKo; current_click=2; inpp_GXQ4_HVJ2=1; inpp_GXQ4_HVJ2_cap=1; cf_clearance=pTiUQU2LAzxuKgDFRckb848sK9yVGTdUUpaxcHxs8r8-1780898415-1.2.1.1-.Q9oghdE.bi70Rd0myEnRFX0a5.LcyjszO9ip_opfSNUHSMonJmIS1rQcR.R5gfOdkwPXkrFN5k.VgZXRZdgTEG5aBC2GZOZDFK9sO5vjtx7zic4kZ9rwbsWP4w4ytw0bQ2tKS1JlA_eiSl9GylQd26KCRNTVZjM409lHfQaYRl9hu9NjGgEYmkQA3E2qwhjTCTRg8a1zNdyQ6rIcbzPPO2EUvKmd3sR_D794l4w42eEyB5jYytk7x8lRar7fL7sHskCc5A1N1SpJQB69g0fs_dM4qECON3GXRP3CLFUqlpapCryVpkeblR9hFMIdA1KY76ldJGXigjlr13jM06Q";

    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://beeg24.org/",
        "Cookie": COOKIE_STRING
    };

    const BASE_URL = "https://beeg24.org";

    /**
     * 1. PARSE ITEMS PATTERN (Based on Image: class="small small-ins-cat")
     */
    function parseVideoItems(html) {
        const items = [];
        const itemPattern = /<div class="small[^"]*">[\s\S]*?<a href="([^"]+)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<img src="([^"]+)"/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const href = match[1];
            const title = match[2].trim();
            const posterSrc = match[3];
            
            const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
            const posterUrl = posterSrc.startsWith('http') ? posterSrc : BASE_URL + posterSrc;
            
            if (title && href) {
                items.push(new MultimediaItem({
                    title: title,
                    url: fullUrl,
                    posterUrl: posterUrl,
                    type: "movie",
                    isAdult: true
                }));
            }
        }
        return items;
    }

    /**
     * 2. GET HOME & CATEGORIES
     */
    async function getHome(cb) {
        try {
            const categories = {
                "Home": `${BASE_URL}/`,
                "Best Videos": `${BASE_URL}/best/`,
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
                } catch (e) {
                    console.error(`Error fetching ${name}: ${e.message}`);
                }
            }
            cb({ success: true, data });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 3. SEARCH
     */
    async function search(query, cb) {
        try {
            const searchUrl = `${BASE_URL}/search/${encodeURIComponent(query.trim().replace(/\s+/g, '-'))}/`;
            const res = await http_get(searchUrl, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 4. LOAD VIDEO PAGE
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            let title = "Beeg24 Video";
            
            let titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) title = titleMatch[1].trim();
            
            let poster = "";
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/i) || html.match(/poster="([^"]+)"/i);
            if (posterMatch) poster = posterMatch[1];
            
            const episode = new Episode({
                name: title,
                url: url,
                season: 1,
                episode: 1,
                posterUrl: poster
            });
            
            cb({
                success: true,
                data: new MultimediaItem({
                    title, url, posterUrl: poster, type: "movie", isAdult: true,
                    episodes: [episode]
                })
            });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 5. LOAD HLS STREAMS ENGINE (Detections for .ts segments / .m3u8 master file)
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];

            // 1. RAW TEXT SCAN FOR M3U8 (HLS PLAYLISTS)
            const m3u8Pattern = /(https?:)?\/\/[^\s"'`<>]+?\.m3u8[^\s"'`<>]*/gi;
            let m3u8Matches = html.match(m3u8Pattern) || [];

            // 2. RAW TEXT SCAN FOR DIRECT MP4
            const mp4Pattern = /(https?:)?\/\/[^\s"'`<>]+?\.mp4[^\s"'`<>]*/gi;
            let mp4Matches = html.match(mp4Pattern) || [];

            let rawUrls = [...new Set([...m3u8Matches, ...mp4Matches])];

            for (let streamUrl of rawUrls) {
                if (streamUrl.startsWith('//')) streamUrl = 'https:' + streamUrl;
                
                if (!streamUrl.includes('ads') && !streamUrl.includes('analytics')) {
                    const isM3u8 = streamUrl.includes('.m3u8');
                    streams.push(new StreamResult({
                        url: streamUrl,
                        source: isM3u8 ? "Beeg24 HLS Native Stream (.m3u8)" : "Beeg24 Direct MP4 Source",
                        headers: { 
                            "Referer": url, 
                            "User-Agent": HEADERS["User-Agent"],
                            "Cookie": COOKIE_STRING
                        }
                    }));
                }
            }

            // 3. IFRAME EXTERNAL PLAYER FALLBACK
            if (streams.length === 0) {
                const iframePattern = /<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
                let match;
                while ((match = iframePattern.exec(html)) !== null) {
                    let iframeUrl = match[1];
                    if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;
                    
                    if (iframeUrl.includes('dood') || iframeUrl.includes('streamtape') || iframeUrl.includes('mixdrop') || iframeUrl.includes('voe')) {
                        streams.push(new StreamResult({
                            url: iframeUrl,
                            source: "External Web Player Mirror",
                            headers: { "Referer": url }
                        }));
                    }
                }
            }

            // 4. EMERGENCY EMBED BYPASS
            if (streams.length === 0) {
                streams.push(new StreamResult({ 
                    url: url, 
                    source: "Direct Bypass Stream" 
                }));
            }
            
            cb({ success: true, data: streams });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
