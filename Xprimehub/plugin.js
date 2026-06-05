/**
 * Xprimehub.hair Plugin for SkyStream
 * Source: https://xprimehub.hair (Vegamovies Template Based)
 * Features: Multi-Category Rows, Search, Dynamic Server Referer Multi-Mapping
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
     * Get homepage content with structural category lists
     * @param {Function} cb - Callback function
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xprimehub.hair";
            const categories = {
                "Latest Releases": `${baseUrl}/`,
                "Brazzers Collection": `${baseUrl}/by-genres/brazzers/`,
                "OnlyFans Content": `${baseUrl}/onlyfans/`,
                "Sexmex Video Links": `${baseUrl}/sexmex/`,
                "NiksIndian Network": `${baseUrl}/niksindian/`,
            };
            
            const data = {};
            
            for (const [categoryName, url] of Object.entries(categories)) {
                try {
                    const res = await http_get(url, HEADERS);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) {
                            data[categoryName] = items.slice(0, 24);
                        }
                    }
                } catch (e) {
                    console.error(`Error fetching category [${categoryName}]: ${e.message}`);
                }
            }
            
            if (Object.keys(data).length === 0) {
                const res = await http_get(baseUrl, HEADERS);
                if (res.status === 200 && res.body) {
                    data["Latest Releases"] = parseVideoItems(res.body).slice(0, 24);
                }
            }
            
            cb({ success: true, data });
        } catch (e) {
            console.error("getHome error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * Search structure matching default engine index
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
            console.error("load error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * Parse the loose cloud gateway shortener URLs inside the Vegamovies post block
     * @param {string} html - Page HTML content
     * @returns {Array} List of cloud links matched
     */
    function parseCloudServerButtons(html) {
        const cloudStreams = [];
        let match;

        // Matches buttons and links commonly used by download/cloud panels
        const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        while ((match = btnPattern.exec(html)) !== null) {
            const serverUrl = match[1];
            const cleanText = match[2].replace(/<[^>]*>/g, '').trim(); 
            
            // Comprehensive filter matching secure cloud gateways and file press patterns
            if (serverUrl && (serverUrl.includes('drive') || serverUrl.includes('cloud') || serverUrl.includes('press') || serverUrl.includes('direct') || serverUrl.includes('link') || serverUrl.includes('wiki') || serverUrl.includes('zip'))) {
                if (!serverUrl.includes('adscore') && !serverUrl.includes('wp-content') && !serverUrl.includes('vegamovies')) {
                    
                    let serverLabel = cleanText || "Cloud Streaming Server";
                    if (serverLabel.toLowerCase().includes("g-direct")) serverLabel = "⚡ G-Direct [Instant]";
                    else if (serverLabel.toLowerCase().includes("v-cloud")) serverLabel = "🔥 V-Cloud [Resumable]";
                    else if (serverLabel.toLowerCase().includes("filepress")) serverLabel = "📁 Filepress [G-Drive]";
                    else if (serverUrl.includes("filepress")) serverLabel = "Filepress Server Link";
                    else if (serverUrl.includes("vcloud")) serverLabel = "V-Cloud Server Link";
                    else if (serverUrl.includes("fastdl")) serverLabel = "FastDL Server Link";

                    cloudStreams.push({
                        url: serverUrl,
                        quality: serverLabel
                    });
                }
            }
        }

        // Loose capture fallback if explicit strings pass unmatched
        if (cloudStreams.length === 0) {
            const loosePattern = /href=["'](https?:\/\/[^"']+)["']/gi;
            while ((match = loosePattern.exec(html)) !== null) {
                const targetUrl = match[1];
                if (targetUrl && (targetUrl.includes('filepress') || targetUrl.includes('vcloud') || targetUrl.includes('fastdl'))) {
                    cloudStreams.push({ url: targetUrl, quality: "Cloud Link Resolver Server" });
                }
            }
        }

        return cloudStreams;
    }

    /**
     * Load video streams with proper conditional Referer settings based on server selection
     * @param {string} url - Video page URL
     * @param {Function} cb - Callback function
     */
  async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            
            // Look for iframes with video sources
            const iframePattern = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
            let match;
            while ((match = iframePattern.exec(html)) !== null) {
                const iframeUrl = match[1];
                // Check if it looks like a video player
                if (iframeUrl.includes('player') || iframeUrl.includes('video') || iframeUrl.includes('embed') || iframeUrl.includes('.mp4') || iframeUrl.includes('.m3u8')) {
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(iframeUrl),
                        source: "Youperv",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Also check for video tag with source
            if (streams.length === 0) {
                const videoPattern = /<video[^>]*>[\s\S]*?<source[^>]*src="([^"]+)"[^>]*>/gi;
                while ((match = videoPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(videoUrl),
                        source: "Video",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Direct video file link
            if (streams.length === 0) {
                const directPattern = /href="([^"]+\.mp4)"[^>]*>/gi;
                while ((match = directPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(videoUrl),
                        source: "Direct",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            if (streams.length > 0) {
                cb({ success: true, data: streams });
            } else {
                cb({ success: false, errorCode: "NO_STREAMS" });
            }
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // Bind framework callbacks to global scope execution environment
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
