/**
 * Xprimehub.hair Plugin for SkyStream
 * Source: https://xprimehub.hair
 * Features: Latest Updates, Most Popular (Today/Week/All), Search, Video Streams
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
     * Parse video items from HTML using the exact image DOM structure
     * @param {string} html - The HTML content
     * @returns {Array} Array of MultimediaItem objects
     */
    function parseVideoItems(html) {
        const items = [];
        
        // Exact Regex Matching based on image structure: <a href="...">...<div class="poster-card">...<img src="..." alt="..."
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
        
        return items;
    }

    /**
     * Get homepage content with menu categories
     * @param {Function} cb - Callback function
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xprimehub.hair";
            
            // Xprimehub current structural routes
            const categories = {
                "Latest Updates": `${baseUrl}/`,
                "Page 2 Updates": `${baseUrl}/page/2/`
            };
            
            const data = {};
            
            // Fetch each category
            for (const [categoryName, url] of Object.entries(categories)) {
                try {
                    const res = await http_get(url, HEADERS);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) {
                            data[categoryName] = items.slice(0, 20); // Limit to 20 items per category
                        }
                    }
                } catch (e) {
                    console.error(`Error fetching ${categoryName}: ${e.message}`);
                }
            }
            
            // Fallback strategy if custom loops fail
            if (Object.keys(data).length === 0) {
                const res = await http_get(baseUrl, HEADERS);
                if (res.status === 200 && res.body) {
                    data["Latest"] = parseVideoItems(res.body).slice(0, 20);
                }
            }
            
            cb({ success: true, data });
        } catch (e) {
            console.error("getHome error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * Search for videos
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
            console.error("search error: " + e.message);
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
            
            // Extract title
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*XprimeHub.*$/i, '').trim() : "Unknown Movie";
            
            // Extract poster inside the inner page template
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/) || html.match(/src="([^"]+\.(?:jpg|jpeg|png))"/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            // Create episode with the video page URL
            const episode = new Episode({
                name: "Play Movie",
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
     * Parse stream URLs or iFrames from individual post page
     * @param {string} html - The HTML content of video page
     * @returns {Array} Array of objects with url and quality
     */
    function parseVideoStreams(html) {
        const streams = [];
        
        // Pattern 1: Catching Iframe streaming players (Doodstream, Player, etc.)
        const iframePattern = /<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
        let match;
        while ((match = iframePattern.exec(html)) !== null) {
            const srcUrl = match[1];
            if (srcUrl && !srcUrl.includes("ads")) {
                streams.push({ url: srcUrl, quality: "Stream Embed Player" });
            }
        }
        
        // Pattern 2: Catching source streams if direct links are available
        const sourcePattern = /<source\s+src=['"](https?:\/\/[^'"]+)['"][^>]*label=['"]([\w\d]+p?)['"]/gi;
        while ((match = sourcePattern.exec(html)) !== null) {
            const url = match[1];
            const quality = match[2] || "HD";
            if (url) {
                streams.push({ url, quality });
            }
        }
        
        return streams;
    }

    /**
     * Load video streams (playable URLs)
     * @param {string} url - Video page URL (from Episode.url)
     * @param {Function} cb - Callback function
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch video page" });
            }
            
            const html = res.body || "";
            const rawStreams = parseVideoStreams(html);
            
            if (rawStreams.length === 0) {
                return cb({ success: false, errorCode: "NO_STREAMS", message: "No stream player or download links found" });
            }
            
            const streams = rawStreams.map(stream => {
                const base64Url = btoa(stream.url);
                const proxyUrl = "MAGIC_PROXY_v1" + base64Url;
                
                return new StreamResult({
                    url: proxyUrl,
                    source: stream.quality,  
                    headers: {
                        "Referer": "https://xprimehub.hair/",
                        "User-Agent": HEADERS["User-Agent"]
                    }
                });
            });
            
            cb({ success: true, data: streams });
        } catch (e) {
            console.error("loadStreams error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // Export functions to SkyStream
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
