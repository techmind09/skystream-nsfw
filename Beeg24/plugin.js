/**
 * Beeg24 Custom Scraping and Streaming Engine
 */
(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://beeg24.org/"
    };

    const BASE_URL = "https://beeg24.org";

    /**
     * 1. PARSE ITEMS (Beeg24 HTML Inspect Structure के आधार पर)
     * <div class="small small-ins-cat"> या <div class="small"> को मैच करता है
     */
    function parseVideoItems(html) {
        const items = [];
        // Beeg24 का मुख्य पैटर्न जो इमेजेस में देखा गया
        const itemPattern = /<div class="small[^"]*">[\s\S]*?<a href="([^"]+)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<img src="([^"]+)"/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const href = match[1];
            const title = match[2].trim();
            const posterSrc = match[3];
            
            // Absolute URL बनाना
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
     * 3. SEARCH FUNCTION
     */
    async function search(query, cb) {
        try {
            // Beeg24 का सर्च यूआरएल फॉर्मेट
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
     * 4. LOAD VIDEO PAGE METADATA
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            let title = "Beeg24 Video";
            
            // Title Match Logic
            let titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) title = titleMatch[1].trim();
            
            // Poster Match Logic
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
     * 5. LOAD STREAMS ENGINE (M3U8 / HLS & MP4 MULTI-SCANNER)
     * यह सीधे आपके नेटवर्क टैब में दिखने वाली स्ट्रीमिंग डिटेल्स (.ts / .m3u8) को कैप्चर करता है
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];

            // 1. DIRECT HLS (.m3u8) REGEX SCAN
            const m3u8Pattern = /(https?:)?\/\/[^\s"'`<>]+?\.m3u8[^\s"'`<>]*/gi;
            let m3u8Matches = html.match(m3u8Pattern) || [];
            
            // 2. DIRECT MP4 REGEX SCAN
            const mp4Pattern = /(https?:)?\/\/[^\s"'`<>]+?\.mp4[^\s"'`<>]*/gi;
            let mp4Matches = html.match(mp4Pattern) || [];

            // Unique URLs को फ़िल्टर करना
            let rawUrls = [...new Set([...m3u8Matches, ...mp4Matches])];

            for (let streamUrl of rawUrls) {
                if (streamUrl.startsWith('//')) streamUrl = 'https:' + streamUrl;
                
                if (!streamUrl.includes('ads') && !streamUrl.includes('analytics')) {
                    const isM3u8 = streamUrl.includes('.m3u8');
                    streams.push(new StreamResult({
                        url: streamUrl,
                        source: isM3u8 ? "Beeg24 Native HLS Stream" : "Beeg24 Direct MP4",
                        headers: { 
                            "Referer": url, 
                            "User-Agent": HEADERS["User-Agent"] 
                        }
                    }));
                }
            }

            // 3. IFRAME & PLAYER DETECTOR FALLBACK
            if (streams.length === 0) {
                const iframePattern = /<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
                let match;
                while ((match = iframePattern.exec(html)) !== null) {
                    let iframeUrl = match[1];
                    if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;
                    
                    // बाहरी प्लेयर होने पर डायरेक्ट उसे पास करें
                    if (iframeUrl.includes('dood') || iframeUrl.includes('streamtape') || iframeUrl.includes('mixdrop') || iframeUrl.includes('voe')) {
                        streams.push(new StreamResult({
                            url: iframeUrl,
                            source: "External Stream Player",
                            headers: { "Referer": url }
                        }));
                    }
                }
            }

            // 4. EMERGENCY BYPASS (अगर कुछ न मिले तो बेस URL प्लेयर पर भेजेगा)
            if (streams.length === 0) {
                streams.push(new StreamResult({ 
                    url: url, 
                    source: "Bypass Player Mirror" 
                }));
            }
            
            cb({ success: true, data: streams });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // Global scopes में फंक्शन असाइन करना
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
