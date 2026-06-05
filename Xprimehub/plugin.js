/**
 * Xprimehub.hair Plugin for SkyStream
 * Source: https://xprimehub.hair
 * Features: Latest Updates, Categorized Navigation, Search, Video Streams (Buttons & Iframes)
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
     * Get homepage content with menu categories from screenshot
     * @param {Function} cb - Callback function
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xprimehub.hair";
            
            // Categories mapping directly matched from your navigation menu bar screenshot
            const categories = {
                "Latest Releases": `${baseUrl}/`,
                "Hindi Dubbed": `${baseUrl}/hindi-dubbed/`,
                "Brazzers": `${baseUrl}/by-genres/brazzers/`,
                "OnlyFans": `${baseUrl}/onlyfans/`,
                "HotX Originals": `${baseUrl}/hotx-originals/`,
                "Kooku": `${baseUrl}/kooku/`,
                "Ullu Originals": `${baseUrl}/ullu-originals/`,
                "Dual Audio": `${baseUrl}/dual-audio/`,
                "Sexmex": `${baseUrl}/sexmex/`,
                "NiksIndian": `${baseUrl}/niksindian/`
            };
            
            const data = {};
            
            // Fetch each category concurrently or sequentially
            for (const [categoryName, url] of Object.entries(categories)) {
                try {
                    const res = await http_get(url, HEADERS);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) {
                            data[categoryName] = items.slice(0, 20); // Limit to 20 items per row
                        }
                    }
                } catch (e) {
                    console.error(`Error fetching category [${categoryName}]: ${e.message}`);
                }
            }
            
            // Fallback strategy if dynamic loops return empty data
            if (Object.keys(data).length === 0) {
                const res = await http_get(baseUrl, HEADERS);
                if (res.status === 200 && res.body) {
                    data["Latest Releases"] = parseVideoItems(res.body).slice(0, 20);
                }
            }
            
            cb({ success: true, data });
        } catch (e) {
            console.error("getHome error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * Search for videos using WP default engine structure
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
            
            // Extract title cleanly
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*XprimeHub.*$/i, '').trim() : "Unknown Movie";
            
            // Extract poster inside the inner template using meta tag
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/) || html.match(/src="([^"]+\.(?:jpg|jpeg|png))"/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            // Create episode wrapper
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
     * Multi-layer adaptive stream parsing (Handles Direct Links, Buttons, and Video Iframes)
     * @param {string} html - The HTML content of video page
     * @returns {Array} Array of objects with url and quality
     */
    function parseVideoStreams(html) {
        const streams = [];
        
        // Layer 1: Target anchor buttons with stream, download, or server properties
        const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        
        while ((match = btnPattern.exec(html)) !== null) {
            const url = match[1];
            const text = match[2].replace(/<[^>]*>/g, '').trim().toLowerCase(); // Clean internal HTML tags
            
            // Filter link structures related to target media assets
            if (url && (url.includes('download') || url.includes('stream') || url.includes('drive') || url.includes('server') || url.includes('player'))) {
                let label = "Stream / Download Link";
                if (text.includes("720p")) label = "Server (720p)";
                else if (text.includes("1080p")) label = "Server (1080p)";
                else if (text.includes("480p")) label = "Server (480p)";
                else if (text.length > 0 && text.length < 30) label = `Server (${match[2].replace(/<[^>]*>/g, '').trim()})`;
                
                streams.push({ url: url, quality: label });
            }
        }
        
        // Layer 2: Fallback to embedded players if hyperlinks are missing
        const iframePattern = /<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
        while ((match = iframePattern.exec(html)) !== null) {
            const srcUrl = match[1];
            // Eliminate script proxies or tracker interfaces
            if (srcUrl && !srcUrl.includes("ads") && !srcUrl.includes("adscore")) {
                streams.push({ url: srcUrl, quality: "Stream Player (Embed)" });
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
            
            // Map streams using standard platform encryption structure
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

    // Export functions globally to SkyStream environment
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
