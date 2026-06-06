/**
 * Xprimehub.hair Plugin for SkyStream
 * Source: https://xprimehub.hair (Vegamovies Template Based)
 * Features: Cloudflare Bypass Integration, Multi-Category Rows, Search, Cloud Shortener Resolver
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    // Global Anti-Cloudflare Headers Configuration
    const BASE_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
    };

    /**
     * Internal Core Request Handler to Bypass Cloudflare
     */
    async function secureFetch(url, customReferer = "") {
        const headers = { ...BASE_HEADERS };
        if (customReferer) {
            headers["Referer"] = customReferer;
        }

        // SkyStream Framework Optimization
        if (typeof http_browser !== 'undefined') {
            return await http_browser(url, { headers: headers, wait: 3000 });
        } else {
            return await http_get(url, headers);
        }
    }

    /**
     * Parse video items from HTML using the exact image DOM structure
     * FIXED: RegEx updated to match dynamic structures inside #moviesGridMain properly
     */
    function parseVideoItems(html) {
        const items = [];
        
        // Exact Pattern matching based on Image 2 and 3 inspection rules
        // Targetting URLs containing full-movie download routing formats
        const itemPattern = /<a href="(https?:\/\/xprimehub\.hair\/download-[^"]+)"[^>]*>[\s\S]*?<div class="poster-card">[\s\S]*?<img src="([^"]+)" alt="([^"]+)"/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const url = match[1];
            const posterUrl = match[2];
            const title = match[3].replace(/Download\s*\[.*?\]\s*/i, '').trim(); // Cleaning layout tags from title
            
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
        
        // Fallback Pattern 1: Match broad single elements inside grid cards if wrapper structure is simplified
        if (items.length === 0) {
            const fallbackPattern = /<a href="(https?:\/\/xprimehub\.hair\/[^"]+)"[^>]*>[\s\S]*?<p class="poster-title">([^<]+)<\/p>/gi;
            while ((match = fallbackPattern.exec(html)) !== null) {
                const url = match[1];
                const title = match[2].trim();
                
                // Extract image separately via proximity if master pattern skips
                if (url && title && !url.includes('page/')) {
                    // Try to locate a corresponding image inside the near context
                    const imgBlockRegex = new RegExp(`href="${url}"[\\s\\S]*?<img[^>]+src="([^"]+)"`, "i");
                    const imgMatch = html.match(imgBlockRegex);
                    const posterUrl = imgMatch ? imgMatch[1] : "";

                    items.push(new MultimediaItem({
                        title: title,
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
     * Get homepage content with structural category lists
     * FIXED: Exact matching endpoints matching Image 1 and Image 2 structural navigation menus
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://vegamovies.pages.dev";
            
            // Fixed direct links mapped natively from the target site UI menus
            const categories = {
                "Latest Releases": `${baseUrl}/`,
                "Brazzers Collection": `${baseUrl}/by-genres/brazzers/`,
                "OnlyFans Content": `${baseUrl}/onlyfans/`,
                "Sexmex Video Links": `${baseUrl}/sexmex/`,
                "NiksIndian Network": `${baseUrl}/niksindian/`,
                "Ullu Originals": `${baseUrl}/ullu-originals/`,
                "HotX Originals": `${baseUrl}/hotx-originals/`
            };
            
            const data = {};
            
            for (const [categoryName, url] of Object.entries(categories)) {
                try {
                    const res = await secureFetch(url);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) {
                            data[categoryName] = items.slice(0, 24); // Limiting per grid row row for smooth loading
                        }
                    }
                } catch (e) {
                    console.error(`Error fetching category [${categoryName}]: ${e.message}`);
                }
            }
            
            // Final Fallback: Isolate home index data stream if specific modules fail
            if (Object.keys(data).length === 0) {
                const res = await secureFetch(baseUrl);
                if (res.status === 200 && res.body) {
                    const items = parseVideoItems(res.body);
                    if (items.length > 0) {
                        data["Latest Releases"] = items.slice(0, 24);
                    }
                }
            }
            
            cb({ success: true, data });
        } catch (e) {
            console.error("getHome error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * Search engine parser
     */
    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xprimehub.hair";
            const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
            const res = await secureFetch(searchUrl);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Search block intercepted" });
            }
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            console.error("search error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * Load video details page
     */
    async function load(url, cb) {
        try {
            const res = await secureFetch(url);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Details load fail" });
            }
            
            const html = res.body || "";
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*XprimeHub.*$/i, '').trim() : "Xprime Video Item";
            
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/) || html.match(/src="([^"]+\.(?:jpg|jpeg|png))"/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            const episode = new Episode({
                name: "Resolve Secure Cloud Stream Links",
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
     * Extract Cloud Links and pass them securely to prevent 0.01MB player crashes
     */
    async function loadStreams(url, cb) {
    try {
        const res = await secureFetch(url);
        if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
        
        const html = res.body || "";
        const streams = [];
        
        // एंकर टैग्स से लिंक्स निकालने का पैटर्न
        const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        
        while ((match = btnPattern.exec(html)) !== null) {
            const serverUrl = match[1];
            const buttonContent = match[2];
            const cleanText = buttonContent.replace(/<[^>]*>/g, '').trim(); 
            
            // Vegamovies, FSL, v-cloud, filepress और अन्य क्लाउड सर्वर्स को ढूंढने के लिए फिल्टर एक्सटेंशन
            if (serverUrl && (
                serverUrl.includes('drive') || 
                serverUrl.includes('cloud') || 
                serverUrl.includes('press') || 
                serverUrl.includes('direct') || 
                serverUrl.includes('link') || 
                serverUrl.includes('lol') || 
                serverUrl.includes('site') || 
                serverUrl.includes('hubcloud') ||
                serverUrl.includes('fsl') ||         // FSL Server सपोर्ट जोड़ा गया
                serverUrl.includes('vegamovies')     // Vegamovies डोमेन लिंक्स अलाउ किया गया
            )) {
                
                // विज्ञापन और थीम फाइलों को ब्लॉक करें, लेकिन Vegamovies/Xprimehub के स्ट्रीमिंग सर्वर्स को पास होने दें
                if (!serverUrl.includes('adscore') && !serverUrl.includes('wp-content')) {
                    
                    let serverLabel = "🌐 SkyStream Fast Server";
                    
                    // बटन के टेक्स्ट के आधार पर सर्वर का नाम (Label) तय करना
                    if (/fsl/i.test(cleanText) || /fsl/i.test(serverUrl)) {
                        serverLabel = "🚀 [FSL Server] Direct Play";
                    } else if (/g-direct/i.test(cleanText) || /g-direct/i.test(buttonContent)) {
                        serverLabel = "⚡ G-Direct Link";
                    } else if (/v-cloud/i.test(cleanText) || /v-cloud/i.test(buttonContent)) {
                        serverLabel = "🔥 V-Cloud Link";
                    } else if (/filepress/i.test(cleanText) || /filepress/i.test(buttonContent)) {
                        serverLabel = "📁 Filepress Link";
                    } else if (cleanText.length > 1) {
                        serverLabel = `🌐 SkyStream: ${cleanText}`;
                    }

                    // प्लेयर को डायरेक्ट वीडियो स्ट्रीम पास करना
                    streams.push(new StreamResult({
                        url: serverUrl, 
                        source: serverLabel,
                        headers: { 
                            "Referer": url, 
                            "User-Agent": BASE_HEADERS["User-Agent"]
                        },
                        isDirect: true,              // प्लेयर को बताता है कि यह डायरेक्ट लिंक है
                        actionType: "play"           // "open_browser" की जगह "play" ताकि वीडियो ऐप के अंदर चले
                    }));
                }
            }
        }
        
        if (streams.length > 0) {
            cb({ success: true, data: streams });
        } else {
            cb({ success: false, errorCode: "NO_STREAMS", message: "No active Vegamovies or Cloud servers detected." });
        }
    } catch (e) {
        console.error("loadStreams error: " + e.message);
        cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
    }
}


    // Global Framework Core Hooks Attachment
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
