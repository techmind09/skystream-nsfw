/**
 * WOW.XXX Plugin for SkyStream
 * Source: https://www.wow.xxx
 * Features: Multi-Category Grid Layout Fix, Search, Video Streams, Multi-Server Extractor
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.wow.xxx/"
    };

    /**
     * Parse regular video items from HTML
     */
    function parseVideoItems(html) {
        const items = [];
        
        // Standard div item container for video clips
        const itemPattern = /<div class="item">[\s\S]*?<a href="(https:\/\/www\.wow\.xxx\/videos\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[\s\S]*?<\/div>/g;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const url = match[1];
            const posterUrl = match[2];
            const title = match[3];
            
            if (url && posterUrl && title) {
                items.push(new MultimediaItem({
                    title: title.trim(),
                    url: url,
                    posterUrl: posterUrl,
                    type: "movie",
                    isAdult: true
                }));
            }
        }
        
        // Fallback Pattern 2: Loose anchor and image tags
        if (items.length === 0) {
            const simplePattern = /<a href="(https:\/\/www\.wow\.xxx\/videos\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/g;
            while ((match = simplePattern.exec(html)) !== null) {
                const url = match[1];
                const posterUrl = match[2];
                const title = match[3];
                
                if (url && posterUrl && title) {
                    items.push(new MultimediaItem({
                        title: title.trim(),
                        url: url,
                        posterUrl: posterUrl,
                        type: "movie",
                        isAdult: true
                    }));
                }
            }
        }
        
        return items;
    }

    /**
     * Specific Parser for Category Pages to handle different HTML layouts cleanly
     */
    function parseCategoryItems(html) {
        const items = [];
        // Matches standard layout grids used on inside category loops
        const catItemPattern = /<a href="(https:\/\/www\.wow\.xxx\/videos\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]+)"/gi;
        
        let match;
        while ((match = catItemPattern.exec(html)) !== null) {
            const url = match[1];
            const posterUrl = match[2];
            const title = match[3];
            
            if (url && posterUrl && title && !items.some(i => i.url === url)) {
                items.push(new MultimediaItem({
                    title: title.trim(),
                    url: url,
                    posterUrl: posterUrl,
                    type: "movie",
                    isAdult: true
                }));
            }
        }
        return items;
    }

    /**
     * Get homepage content with menu categories (FIXED ACCURATE GRID FETCH)
     */
    async function getHome(cb) {
    try {
        const baseUrl = manifest.baseUrl || "https://www.wow.xxx";
        
        const categories = {
            "Latest Videos": `${baseUrl}/`,
            "Most Popular All": `${baseUrl}/most-popular/all/`,
            "Ass-To-Mouth": `${baseUrl}/ass-to-mouth/`,
            "Bathroom": `${baseUrl}/bathroom/`,
            "BBC (Big Black Cock)": `${baseUrl}/bbc/`,
            "Big Ass": `${baseUrl}/big-ass/`,
            "Big Cock": `${baseUrl}/big-cock/`,
            "Cum in Mouth": `${baseUrl}/cum-in-mouth/`,
            "Cum on Pussy": `${baseUrl}/cum-on-pussy/`,
            "Cum on Tits": `${baseUrl}/cum-on-tits/`,
            "Double Penetration": `${baseUrl}/double-penetration/`,
            "Double Pussy": `${baseUrl}/double-pussy/`,
            "FreeUse": `${baseUrl}/freeuse/`,
            "Housewife": `${baseUrl}/housewife/`,
            "Indian": `${baseUrl}/indian/`,
            "Interracial": `${baseUrl}/interracial/`,
            "Latina": `${baseUrl}/latina/`,
            "Mature": `${baseUrl}/mature/`,
            "MILF": `${baseUrl}/milf/`,
            "Mom": `${baseUrl}/mom/`
        };
        
        const categoryItems = {};
        
        // Load first 5 categories initially for faster response
        // Others load in background or just return category structure
        for (const [categoryName, categoryUrl] of Object.entries(categories)) {
            try {
                const res = await http_get(categoryUrl, HEADERS);
                if (res.status === 200 && res.body) {
                    let items = parseCategoryItems(res.body);
                    if (items.length === 0) items = parseVideoItems(res.body);
                    
                    if (items.length > 0) {
                        categoryItems[categoryName] = items.slice(0, 20);
                    } else {
                        // Return empty array so category shows but without items
                        categoryItems[categoryName] = [];
                    }
                } else {
                    categoryItems[categoryName] = [];
                }
            } catch (e) {
                console.error(`Error loading category ${categoryName}: ${e.message}`);
                categoryItems[categoryName] = [];
            }
        }

   async function getHome(cb) {
     try {
        const baseUrl = manifest.baseUrl || "https://www.wow.xxx";
        
        // CORRECTED URLs - With "/categories/" path
        const categories = {
            "Latest Videos": `${baseUrl}/`,
            "Most Popular": `${baseUrl}/most-popular/`,
            "Big Ass": `${baseUrl}/categories/big-ass`,
            "Big Cock": `${baseUrl}/categories/big-cock`,
            "MILF": `${baseUrl}/categories/milf`,
            "Mature": `${baseUrl}/categories/mature`,
            "Latina": `${baseUrl}/categories/latina`,
            "Indian": `${baseUrl}/categories/indian`,
            "Interracial": `${baseUrl}/categories/interracial`,
            "BBC (Big Black Cock)": `${baseUrl}/categories/bbc`,
            "Ass-To-Mouth": `${baseUrl}/categories/ass-to-mouth`,
            "Big Tits": `${baseUrl}/categories/big-tits`,
            "Anal": `${baseUrl}/categories/anal`,
            "Amateur": `${baseUrl}/categories/amateur`,
            "Lesbian": `${baseUrl}/categories/lesbian`,
            "Threesome": `${baseUrl}/categories/threesome`
        };
        
        const categoryItems = {};
        
        for (const [categoryName, categoryUrl] of Object.entries(categories)) {
            try {
                console.log(`Loading: ${categoryName} - ${categoryUrl}`);
                const res = await http_get(categoryUrl, HEADERS);
                
                if (res.status === 200 && res.body) {
                    // Try different parsing methods
                    let items = parseCategoryItemsImproved(res.body);
                    if (items.length === 0) items = parseVideoItems(res.body);
                    
                    if (items.length > 0) {
                        categoryItems[categoryName] = items.slice(0, 20);
                    } else {
                        categoryItems[categoryName] = [];
                    }
                } else {
                    categoryItems[categoryName] = [];
                }
            } catch (e) {
                console.error(`Error loading ${categoryName}: ${e.message}`);
                categoryItems[categoryName] = [];
            }
        }
        
        cb({ success: true, data: categoryItems });
        
    } catch (e) {
        console.error("getHome error: " + e.message);
        cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
    }
}

// IMPROVED PARSER for category pages
function parseCategoryItemsImproved(html) {
    const items = [];
    
    // Pattern 1: Standard video thumbnails from wow.xxx category pages
    const pattern1 = /<a[^>]+href="(https?:\/\/www\.wow\.xxx\/videos\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi;
    
    let match;
    while ((match = pattern1.exec(html)) !== null) {
        const url = match[1];
        const posterUrl = match[2];
        const title = match[3];
        
        if (url && url.includes('/videos/') && title && !title.includes('WOW.XXX')) {
            items.push(new MultimediaItem({
                title: title.trim(),
                url: url,
                posterUrl: posterUrl,
                type: "movie",
                isAdult: true
            }));
        }
    }
    
    // Pattern 2: data-src or lazy loading images
    if (items.length === 0) {
        const pattern2 = /<a[^>]+href="(https?:\/\/www\.wow\.xxx\/videos\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+data-src="([^"]+)"[^>]+alt="([^"]+)"/gi;
        
        while ((match = pattern2.exec(html)) !== null) {
            items.push(new MultimediaItem({
                title: match[3].trim(),
                url: match[1],
                posterUrl: match[2],
                type: "movie",
                isAdult: true
            }));
        }
    }
    
    return items;
}
    /**
     * Load video details
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch video page" });
            }
            
            const html = res.body || "";
            
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*WOW\.XXX$/, '').trim() : "Unknown";
            
            const posterMatch = html.match(/poster='([^']+)'/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            const episode = new Episode({
                name: "Play Video",
                url: url,
                season: 1,
                episode: 1,
                posterUrl: posterUrl
            });
            
            const item = new MultimediaItem({
                title: title,
                url: url,
                posterUrl: posterUrl,
                type: "movie",
                isAdult: true,
                episodes: [episode]
            });
            
            cb({ success: true, data: item });
        } catch (e) {
            console.error("load error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * Parse video stream URLs from video page HTML (Native Site Streams)
     */
    function parseVideoStreams(html) {
        const streams = [];
        const sourcePattern = /<source\s+src=['"](https:\/\/www\.wow\.xxx\/get_file\/[^'"]+)['"][^>]*label=['"]([\w\d]+p?)['"][^>]*>/gi;
        
        let match;
        while ((match = sourcePattern.exec(html)) !== null) {
            const url = match[1];
            const quality = match[2];
            
            if (url && quality) {
                streams.push({ url, quality });
            }
        }
        
        return streams;
    }

    /**
     * Load video streams (INTEGRATED WITH ADVANCED DEEP EXTRACTOR ENGINE)
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch video page" });
            }
            
            const html = res.body || "";
            const streams = [];
            
            // 1. FIRST LEVEL PRIORITY: Native Site Player Files (`get_file`)
            const rawStreams = parseVideoStreams(html);
            if (rawStreams.length > 0) {
                rawStreams.forEach(stream => {
                    const base64Url = btoa(stream.url);
                    const proxyUrl = "MAGIC_PROXY_v1" + base64Url;
                    
                    streams.push(new StreamResult({
                        url: proxyUrl,
                        source: `WOW [${stream.quality}]`,
                        headers: {
                            "Referer": "https://www.wow.xxx/",
                            "User-Agent": HEADERS["User-Agent"]
                        }
                    }));
                });
            }

            // 2. SECOND LEVEL PRIORITY: Deep Raw Text Scanning for External Streaming Providers
            const URL_PATTERN = /(https?:)?\/\/[^\s"'`<>]+(?:dood|streamtape|mixdrop|voe|vidhide|emturbovid|fslv2|fslserver|mycloudz|xtreamstream|myvidplay|lapecontent)[^\s"'`<>]+/gi;
            let rawMatches = html.match(URL_PATTERN) || [];
            let uniqueUrls = [...new Set(rawMatches)];
            
            for (let cleanUrl of uniqueUrls) {
                if (cleanUrl.startsWith('//')) cleanUrl = 'https:' + cleanUrl;
                if (!cleanUrl.includes('ads') && !cleanUrl.includes('disqus') && !cleanUrl.includes('google')) {
                    await loadExtractor(cleanUrl, streams, url);
                }
            }

            // 3. THIRD LEVEL PRIORITY: Standard Iframes Parser
            if (streams.length === 0) {
                const iframePattern = /<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
                let match;
                while ((match = iframePattern.exec(html)) !== null) {
                    let iframeUrl = match[1];
                    if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;
                    if (!iframeUrl.includes('ads') && !iframeUrl.includes('disqus')) {
                        await loadExtractor(iframeUrl, streams, url);
                    }
                }
            }
            
            if (streams.length === 0) {
                streams.push(new StreamResult({ 
                    url: url, 
                    source: "Mirror Fallback",
                    headers: { "Referer": "https://www.wow.xxx/", "User-Agent": HEADERS["User-Agent"] }
                }));
            }
            
            cb({ success: true, data: streams });
        } catch (e) {
            console.error("loadStreams error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // ===================================================
    // MULTI-SERVER ROUTING & EXTRACTOR CORE ENGINE
    // ===================================================

    async function loadExtractor(url, streams, referer) {
        if (!url) return;
        
        const getDisplayName = (u) => {
            if (u.includes("gdmirrorbot.nl") || u.includes("techinmind.space")) return "GDMirror";
            if (u.includes("awstream.net") || u.includes("as-cdn21.top")) return "AWSStream";
            if (u.includes("rubystm.com")) return "StreamRuby";
            if (u.includes("blakiteapi.xyz")) return "Blakite";
            if (u.includes("streamtape.com")) return "Streamtape";
            if (u.includes("mixdrop.co") || u.includes("mixdrop.to") || u.includes("m1xdrop.")) return "Mixdrop";
            if (u.includes("voe.sx") || u.includes("voemp4") || u.includes("voe720p")) return "VOE";
            if (u.includes("dood")) return "DoodStream";
            if (u.includes("vidhide")) return "VidHide";
            if (u.includes("emturbovid") || u.includes("stbturbo")) return "TurboVid";
            if (u.includes("mycloudz")) return "MyCloudz";
            if (u.includes("xtreamstream")) return "XtreamStream";
            if (u.includes("fslv2") || u.includes("fslserver")) return "FSL Server";
            if (u.includes("movierulz") || u.includes("player4me")) return "MoviePlayer";
            if (u.includes("myvidplay.com")) return "Myvidplay";
            if (u.includes("lapecontent.net")) return "LapeContent";
            try { return new URL(u).hostname.replace("www.", ""); } catch(e) { return "Server"; }
        };

        const serverName = getDisplayName(url);

        if (url.includes("streamtape.com")) {
            await extractStreamtape(url, streams);
        } else if (url.includes("mixdrop.") || url.includes("m1xdrop.")) {
            await extractMixdrop(url, streams);
        } else if (url.includes("voe.sx") || url.includes("voemp4") || url.includes("voe720p")) {
            await extractVoe(url, streams);
        } else if (url.includes("dood")) {
            await extractDoodStream(url, streams);
        } else if (url.includes("vidhide") || url.includes("movierulz") || url.includes("player4me")) {
            await extractPackedServer(url, streams, serverName);
        } else if (url.includes("emturbovid") || url.includes("stbturbo")) {
            await extractTurboVid(url, streams);
        } else if (url.includes("myvidplay.com") || url.includes("lapecontent.net")) {
            await extractGenericDirect(url, streams, serverName, referer);
        } else if (url.includes("mycloudz") || url.includes("xtreamstream") || url.includes("fslv2") || url.includes("fslserver")) {
            await extractGenericDirect(url, streams, serverName, referer);
        } else {
            if (url.match(/\.(?:m3u8|mp4|mkv)(?:\?.*)?$/i)) {
                streams.push(new StreamResult({ url, source: serverName, headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] } }));
            }
        }
    }

    async function extractStreamtape(url, streams) {
        try {
            const res = await http_get(url, HEADERS);
            const match = res.body.match(/robotlink'\)\.innerHTML\s*=\s*'([^']+)'\s*\+\s*'([^']+)'/) || 
                          res.body.match(/get\('botlink'\)\.innerHTML\s*=\s*['"](.*?)['"]/);
            if (match) {
                const videoUrl = match[2] ? ("https:" + match[1] + match[2].substring(3)) : `https:${match[1]}&stream=1`;
                streams.push(new StreamResult({ url: videoUrl, source: "Streamtape Server", headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] } }));
            }
        } catch (e) { console.error("Streamtape Error:", e); }
    }

    async function extractMixdrop(url, streams) {
        try {
            const embedUrl = url.replace("/f/", "/e/");
            const res = await http_get(embedUrl, { ...HEADERS, "Referer": "https://mixdrop.co/" });
            const fileMatch = res.body.match(/wurl\s*=\s*"([^"]+)"/) || res.body.match(/file\s*:\s*"([^"]+)"/);
            if (fileMatch) {
                let videoUrl = fileMatch[1].startsWith("//") ? "https:" + fileMatch[1] : fileMatch[1];
                streams.push(new StreamResult({ url: videoUrl, source: "Mixdrop Server", headers: { "Referer": embedUrl, "User-Agent": HEADERS["User-Agent"] } }));
            }
        } catch (e) { console.error("Mixdrop Error:", e); }
    }

    async function extractVoe(url, streams) {
        try {
            const res = await http_get(url, HEADERS);
            let fileMatch = res.body.match(/'hls':\s*'([A-Za-z0-9+/=]+)'/);
            if (fileMatch) {
                streams.push(new StreamResult({ url: atob(fileMatch[1]), source: "VOE Server [HLS]", headers: { "User-Agent": HEADERS["User-Agent"] } }));
                return;
            }
            fileMatch = res.body.match(/file\s*:\s*"([^"]+)"/);
            if (fileMatch) {
                streams.push(new StreamResult({ url: fileMatch[1], source: "VOE Server [Direct]", headers: { "User-Agent": HEADERS["User-Agent"] } }));
            }
        } catch (e) { console.error("VOE Error:", e); }
    }

    async function extractDoodStream(url, streams) {
        try {
            const embedUrl = url.replace("/d/", "/e/");
            const res = await http_get(embedUrl, HEADERS);
            const passMatch = res.body.match(/\/pass_md5\/([^']+)/);
            if (passMatch) {
                const md5Url = `https://dood.to/pass_md5/${passMatch[1]}`;
                const passRes = await http_get(md5Url, { ...HEADERS, "Referer": embedUrl });
                
                let token = "";
                const randomStr = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                for (let i = 0; i < 10; i++) token += randomStr.charAt(Math.floor(Math.random() * randomStr.length));
                
                const finalUrl = `${passRes.body}${token}?token=${passMatch[1]}&expiry=${Date.now()}`;
                streams.push(new StreamResult({ url: finalUrl, source: "DoodStream Server", headers: { "Referer": embedUrl, "User-Agent": HEADERS["User-Agent"] } }));
            }
        } catch (e) { console.error("DoodStream Error:", e); }
    }

    async function extractTurboVid(url, streams) {
        try {
            const res = await http_get(url, HEADERS);
            const fileMatch = res.body.match(/file\s*:\s*"([^"]+)"/) || res.body.match(/source\s*:\s*"([^"]+)"/);
            if (fileMatch) streams.push(new StreamResult({ url: fileMatch[1], source: "TurboVid Server", headers: { "User-Agent": HEADERS["User-Agent"] } }));
        } catch (e) { console.error("TurboVid Error:", e); }
    }

    async function extractPackedServer(url, streams, sourceName) {
        try {
            const res = await http_get(url, HEADERS);
            const fileMatch = res.body.match(/file\s*:\s*"([^"]+)"/) || 
                              res.body.match(/["']?file["']?\s*:\s*["']([^"']+)["']/);
            if (fileMatch) streams.push(new StreamResult({ url: fileMatch[1], source: `${sourceName} Server`, headers: { "User-Agent": HEADERS["User-Agent"] } }));
        } catch (e) { console.error(`${sourceName} Error:`, e); }
    }

    async function extractGenericDirect(url, streams, sourceName, referer) {
        try {
            const res = await http_get(url, { ...HEADERS, "Referer": referer });
            const videoMatch = res.body.match(/["'](http[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
            if (videoMatch) {
                streams.push(new StreamResult({ url: videoMatch[1], source: `${sourceName} Server`, headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] } }));
            } else {
                streams.push(new StreamResult({ url: url, source: `${sourceName} Mirror`, headers: { "Referer": referer, "User-Agent": HEADERS["User-Agent"] } }));
            }
        } catch (e) { console.error(`${sourceName} Error:`, e); }
    }

    // Export functions to SkyStream
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
