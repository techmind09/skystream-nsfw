/**
 * Xprimehub.hair Plugin for SkyStream
 * Source: https://xprimehub.hair
 * Features: Complete Multi-Category Fetching, Fixed Image/Poster Extraction, Direct Stream Fallback Player
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
        "Referer": "https://xprimehub.hair/"
    };

    /**
     * Parse video items from HTML ensuring posters and titles are fully linked
     * @param {string} html - The HTML content
     * @returns {Array} Array of MultimediaItem objects
     */
    function parseVideoItems(html) {
        const items = [];
        // Combined Regex block matching structural link container up to image tags
        const itemPattern = /<a href="(https:\/\/xprimehub\.hair\/[^"]+-download\/)"[^>]*>[^]*?<div class="poster-card">[^]*?<img src="([^"]+)" alt="([^"]+)"/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const url = match[1];
            const posterUrl = match[2];
            const title = match[3].trim();
            
            if (url && posterUrl && title) {
                items.push(new MultimediaItem({
                    title: title,
                    url: url,
                    posterUrl: posterUrl,
                    type: "movie",
                    isAdult: true
                }));
            }
        }
        
        // Secondary Fallback: If layout parameters mismatch, capture standard loose img layout
        if (items.length === 0) {
            const fallbackPattern = /<a href="(https:\/\/xprimehub\.hair\/[^"]+download\/)"[^>]*>[^]*?<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi;
            while ((match = fallbackPattern.exec(html)) !== null) {
                if (match[1] && match[2] && match[3]) {
                    items.push(new MultimediaItem({
                        title: match[3].trim(),
                        url: match[1],
                        posterUrl: match[2],
                        type: "movie",
                        isAdult: true
                    }));
                }
            }
        }
        
        return items;
    }

    /**
     * Get homepage content along with comprehensive site layout categories
     * @param {Function} cb - Callback function
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xprimehub.hair";
            
            // Comprehensive category endpoints directly matched from top menu configuration
            const categories = {
                "Latest Releases": `${baseUrl}/`,
                "Hindi Dubbed": `${baseUrl}/hindi-dubbed/`,
                "Brazzers Collection": `${baseUrl}/by-genres/brazzers/`,
                "OnlyFans Content": `${baseUrl}/onlyfans/`,
                "HotX Originals": `${baseUrl}/hotx-originals/`,
                "Kooku Hot Premium": `${baseUrl}/kooku/`,
                "Ullu Originals Row": `${baseUrl}/ullu-originals/`,
                "Dual Audio Movies": `${baseUrl}/dual-audio/`,
                "Sexmex Video Links": `${baseUrl}/sexmex/`,
                "NiksIndian Network": `${baseUrl}/niksindian/`,
                "Tagalog Updates": `${baseUrl}/tagalog/`
            };
            
            const data = {};
            
            // Loop and concurrently capture video collections for each mapped interface
            for (const [categoryName, url] of Object.entries(categories)) {
                try {
                    const res = await http_get(url, HEADERS);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) {
                            data[categoryName] = items.slice(0, 24); // Pulling 24 items per row for a broader grid
                        }
                    }
                } catch (e) {
                    console.error(`Dynamic generation failed for category [${categoryName}]: ${e.message}`);
                }
            }
            
            // Absolute baseline fallback if loops drop values
            if (Object.keys(data).length === 0) {
                const res = await http_get(baseUrl, HEADERS);
                if (res.status === 200 && res.body) {
                    data["Latest Releases"] = parseVideoItems(res.body).slice(0, 24);
                }
            }
            
            cb({ success: true, data });
        } catch (e) {
            console.error("getHome core execution crashed: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * Search structure matching global core index
     * @param {string} query - Search query
     * @param {Function} cb - Callback function
     */
    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xprimehub.hair";
            const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
            const res = await http_get(searchUrl, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch search results" });
            }
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            console.error("search pipeline hit an exception: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * Load video details - MUST return MultimediaItem with episodes array
     * @param {string} url - Video page URL
     * @param {Function} cb - Callback function
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch video page" });
            }
            
            const html = res.body || "";
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*XprimeHub.*$/i, '').trim() : "Xprime Video Item";
            
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/) || html.match(/src="([^"]+\.(?:jpg|jpeg|png))"/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            const episode = new Episode({
                name: "Play Media Server",
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
            console.error("load metadata wrapper exception: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * Load video streams using strict Multi-Pattern matching
     * @param {string} url - Video page URL
     * @param {Function} cb - Callback function
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            let match;
            
            // Pattern Layer 1: Extraction of inline explicit video iframes
            const iframePattern = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
            while ((match = iframePattern.exec(html)) !== null) {
                const iframeUrl = match[1];
                if (iframeUrl.includes('player') || iframeUrl.includes('video') || iframeUrl.includes('embed') || iframeUrl.includes('.mp4') || iframeUrl.includes('.m3u8') || iframeUrl.includes('get_file')) {
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(iframeUrl),
                        source: "Video Link Player",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Pattern Layer 2: Extraction of absolute Video source parameters
            if (streams.length === 0) {
                const videoPattern = /<video[^>]*>[\s\S]*?<source[^>]*src="([^"]+)"[^>]*>/gi;
                while ((match = videoPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(videoUrl),
                        source: "Native CDN Video Source",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Pattern Layer 3: Direct hyperlinked static .mp4 streams
            if (streams.length === 0) {
                const directPattern = /href="([^"]+\.mp4)"[^>]*>/gi;
                while ((match = directPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(videoUrl),
                        source: "Direct MP4 Download Server",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Evaluate resolved structures
            if (streams.length > 0) {
                cb({ success: true, data: streams });
            } else {
                cb({ success: false, errorCode: "NO_STREAMS" });
            }
        } catch (e) {
            console.error("loadStreams processing dropped error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // Bind framework callbacks to global scope execution environment
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
