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
     * Load video details - Returns MultimediaItem with an episode tracking block
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
                name: "Resolve Cloud Stream Links",
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
     * CRITICAL UPDATE: Extract Cloud Links directly from UI download layout template
     * Image 4 (Layout screen) ke naye nodes ke mutabik dynamic links fetch karega.
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            
            // Regex Pattern: Anchor tags ko target karne ke liye unke inner texts ke sath
            const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            
            while ((match = btnPattern.exec(html)) !== null) {
                const serverUrl = match[1];
                const buttonContent = match[2];
                const cleanText = buttonContent.replace(/<[^>]*>/g, '').trim(); 
                
                // Sirf valid cloud download servers/gateways bypass filters use honge
                if (serverUrl && (serverUrl.includes('drive') || serverUrl.includes('cloud') || serverUrl.includes('press') || serverUrl.includes('direct') || serverUrl.includes('link') || serverUrl.includes('lol') || serverUrl.includes('site'))) {
                    
                    // Ad networks ya system base urls ko neglect karne ke liye boundary rules
                    if (!serverUrl.includes('adscore') && !serverUrl.includes('wp-content') && !serverUrl.includes('vegamovies') && !serverUrl.includes('xprimehub')) {
                        
                        let serverLabel = "Cloud Storage Server";
                        
                        // Image template ke buttons text patterns ko match karne ke liye custom filtering
                        if (/g-direct/i.test(cleanText) || /g-direct/i.test(buttonContent)) {
                            serverLabel = "⚡ G-Direct [Instant] (No Login Required)";
                        } else if (/v-cloud/i.test(cleanText) || /v-cloud/i.test(buttonContent)) {
                            serverLabel = "🔥 V-Cloud [Resumable High Speed]";
                        } else if (/filepress/i.test(cleanText) || /filepress/i.test(buttonContent)) {
                            serverLabel = "📁 Filepress [Google Drive Engine]";
                        } else if (cleanText.length > 1) {
                            serverLabel = `Cloud Resolving: ${cleanText}`;
                        }

                        streams.push(new StreamResult({
                            // SkyStream Proxy system me parse string push karein
                            url: "MAGIC_PROXY_v1" + btoa(serverUrl),
                            source: serverLabel,
                            headers: { 
                                "Referer": url, 
                                "User-Agent": HEADERS["User-Agent"] 
                            }
                        }));
                    }
                }
            }
            
            // Fallback Loose Matcher: Agar generic pattern fail ho jaye
            if (streams.length === 0) {
                const loosePattern = /href=["'](https?:\/\/[^"']+)["']/gi;
                while ((match = loosePattern.exec(html)) !== null) {
                    const targetUrl = match[1];
                    if (targetUrl && (targetUrl.includes('filepress') || targetUrl.includes('vcloud') || targetUrl.includes('fastdl'))) {
                        streams.push(new StreamResult({
                            url: "MAGIC_PROXY_v1" + btoa(targetUrl),
                            source: "📁 Alternative Cloud Bypass Gateway",
                            headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                        }));
                    }
                }
            }
            
            if (streams.length > 0) {
                cb({ success: true, data: streams });
            } else {
                cb({ success: false, errorCode: "NO_STREAMS", message: "Is link ke liye koi cloud button nahi mila." });
            }
        } catch (e) {
            console.error("loadStreams error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // Bind framework callbacks to global scope execution environment
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
