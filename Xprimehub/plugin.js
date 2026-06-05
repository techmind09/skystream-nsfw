/**
 * Xprimehub.hair Plugin for SkyStream
 * Source: https://xprimehub.hair
 * Features: Latest Updates, Categorized Navigation, Search, Fixed External Cloud Link Bypass
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
     * Get homepage content along with comprehensive site layout categories
     * @param {Function} cb - Callback function
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xprimehub.hair";
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
                "Tagalog Updates": `${baseUrl}/tagalog/`, 
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
                    console.error(`Dynamic generation failed for category [${categoryName}]: ${e.message}`);
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
                name: "Play Movie / Open Cloud Link",
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
     * Parses the cloud gateway buttons shown in your second screenshot
     * @param {string} html - Page HTML content
     * @returns {Array} List of cloud servers mapped
     */
    function parseCloudServerButtons(html) {
        const cloudStreams = [];
        let match;

        // Pattern matches anchor links inside the button styling section
        const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        while ((match = btnPattern.exec(html)) !== null) {
            const serverUrl = match[1];
            const cleanText = match[2].replace(/<[^>]*>/g, '').trim(); // Remove inner lightning or text icons
            
            // Filter target servers visible in your screenshot (G-Direct, V-Cloud, Filepress, Fast Server)
            if (serverUrl && (serverUrl.includes('drive') || serverUrl.includes('cloud') || serverUrl.includes('press') || serverUrl.includes('direct') || serverUrl.includes('link'))) {
                if (!serverUrl.includes('adscore') && !serverUrl.includes('wp-content')) {
                    
                    let serverLabel = cleanText || "Cloud HighSpeed Server";
                    if (serverLabel.toLowerCase().includes("g-direct")) serverLabel = "⚡ G-Direct [Instant]";
                    else if (serverLabel.toLowerCase().includes("v-cloud")) serverLabel = "🔥 V-Cloud [Resumable]";
                    else if (serverLabel.toLowerCase().includes("filepress")) serverLabel = "📁 Filepress [G-Drive]";

                    cloudStreams.push({
                        url: serverUrl,
                        quality: serverLabel
                    });
                }
            }
        }

        // Fallback: If no custom styled cloud buttons are detected, extract basic hyperlinks
        if (cloudStreams.length === 0) {
            const loosePattern = /href=["'](https?:\/\/[^"']+)["']/gi;
            while ((match = loosePattern.exec(html)) !== null) {
                const targetUrl = match[1];
                if (targetUrl && (targetUrl.includes('download') || targetUrl.includes('get_file') || targetUrl.includes('stream'))) {
                    if (!targetUrl.includes(pageUrl) && !targetUrl.includes('adscore')) {
                        cloudStreams.push({ url: targetUrl, quality: "Download Gateway Server" });
                    }
                }
            }
        }

        return cloudStreams;
    }

    /**
     * Load video streams configuration forcing local web panel integration
     * @param {string} url - Video page URL
     * @param {Function} cb - Callback function
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const cloudServers = parseCloudServerButtons(html);
            
            if (cloudServers.length === 0) {
                return cb({ success: false, errorCode: "NO_STREAMS", message: "No operational cloud servers detected" });
            }
            
            // Map detected cloud assets into secure sandboxed StreamResults
            const streams = cloudServers.map(server => {
                return new StreamResult({
                    url: "MAGIC_PROXY_v1" + btoa(server.url),
                    source: server.quality,
                    isHtml: true,                // FORCES SkyStream to load the cloud bypass container smoothly
                    useExternalBrowser: true,   // Keeps the interaction wrapped internally inside SkyStream sandbox
                    headers: { 
                        "Referer": url, 
                        "User-Agent": HEADERS["User-Agent"] 
                    }
                });
            });
            
            cb({ success: true, data: streams });
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
