/**
 * XMoviesForYou (xmoviesforyou.com) Plugin for SkyStream
 * Source: https://xmoviesforyou.com
 * Features: Targeted Anchor Block Parsing, Multi-Server Link Extractor, SkyStream Compliant
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    // 1. GLOBAL HEADERS CONFIGURATION
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://xmoviesforyou.com/"
    };

    /**
     * 2. PARSE VIDEO ITEMS FUNCTION (FIXED)
     * Target classes dynamically mapped from browser inspector snapshots.
     */
    function parseVideoItems(html) {
        const items = [];
        const baseUrl = "https://xmoviesforyou.com";
        
        // Exact wrapper match for each movie item block from inspector
        const itemBlockPattern = /<a\s+class="flex-none[^"]*"\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        const posterPattern = /img[^>]+src="([^"]+)"/i;
        const titlePattern = /<h3[^>]*>([\s\S]*?)<\/h3>/i;
        
        let match;
        while ((match = itemBlockPattern.exec(html)) !== null) {
            const relativeUrl = match[1];
            const itemInnerHtml = match[2];
            
            // Extracting values safely
            const posterMatch = itemInnerHtml.match(posterPattern);
            const titleMatch = itemInnerHtml.match(titlePattern);
            
            const posterUrl = posterMatch ? posterMatch[1] : null;
            let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : null;
            
            if (title) {
                // Bracket cleaning clean logic [AnalOnly] tags removals
                title = title.replace(/\[.*?\]/g, '').trim();
            }
            
            // Absolute URL binding
            const absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;
            
            if (absoluteUrl && posterUrl && title) {
                items.push(new MultimediaItem({
                    title: title,
                    url: absoluteUrl,
                    posterUrl: posterUrl,
                    type: "movie",
                    isAdult: true
                }));
            }
        }
        
        return items;
    }

    /**
     * 3. GET HOME FUNCTION
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xmoviesforyou.com";
            
            // Mapping categories to scrape based on grid layouts
            const categories = {
                "Latest Videos": baseUrl,
                "Brunette": `${baseUrl}/categories/brunette`,
                "Blonde": `${baseUrl}/categories/blonde`,
                "Teen": `${baseUrl}/categories/teen`,
                "MILF": `${baseUrl}/categories/milf`,
                "Anal": `${baseUrl}/categories/anal`,
                "Lesbian": `${baseUrl}/categories/lesbian`
            };
            
            const data = {};
            
            for (const [categoryName, url] of Object.entries(categories)) {
                try {
                    const res = await http_get(url, HEADERS);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) {
                            data[categoryName] = items.slice(0, 20);
                        }
                    }
                } catch (e) {
                    console.error(`Error processing category [${categoryName}]: ${e.message}`);
                }
            }
            
            if (Object.keys(data).length === 0) {
                return cb({ success: false, errorCode: "PARSE_ERROR", message: "No sections parsed successfully" });
            }
            
            cb({ success: true, data });
        } catch (e) {
            console.error("getHome core error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 4. SEARCH FUNCTION
     */
    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xmoviesforyou.com";
            const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
            const res = await http_get(searchUrl, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Search page response failed" });
            }
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            console.error("search handling error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 5. LOAD FUNCTION (Metadata Loader)
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to open video details page" });
            }
            
            const html = res.body || "";
            
            // Clean dynamic titles
            const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/<h1[^>]*>([^<]+)<\/h1>/);
            let title = titleMatch ? titleMatch[1].replace(/\s*-\s*XMoviesforyou.*$/i, '').trim() : "Unknown Video";
            title = title.replace(/\[.*?\]/g, '').trim(); 
            
            const posterMatch = html.match(/src=["'](https:\/\/xmoviescdn\.online\/[^"']+\.webp)["']/i) || html.match(/<meta property="og:image" content="([^"]+)"/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            const episode = new Episode({
                name: title,
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
            console.error("load implementation error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 6. LOAD STREAMS FUNCTION (CRITICAL FIX)
     * Parse buttons like Streamtape, Mixdrop, and Myvidplay dynamically from watch page
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            
            // A. Target Stream/Download buttons from the grid wrapper (Our Key Discovery!)
            const btnPattern = /<a\s+[^>]*href="([^"]+(?:streamtape|mixdrop|m1xdrop|myvidplay)[^"]*)"[^>]*>/gi;
            let match;
            
            while ((match = btnPattern.exec(html)) !== null) {
                let streamServerUrl = match[1];
                let serverName = "Unknown Server";
                
                if (streamServerUrl.includes("streamtape")) serverName = "Streamtape";
                if (streamServerUrl.includes("mixdrop") || streamServerUrl.includes("m1xdrop")) serverName = "Mixdrop";
                if (streamServerUrl.includes("myvidplay")) serverName = "Myvidplay";

                streams.push(new StreamResult({
                    url: `MAGIC_PROXY_v1${btoa(streamServerUrl)}`,
                    source: serverName,
                    headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                }));
            }
            
            // B. Fallback Strategy: Target Embed iFrames if available directly on page
            if (streams.length === 0) {
                const iframePattern = /<iframe[^>]+src="([^"]+)"/gi;
                while ((match = iframePattern.exec(html)) !== null) {
                    const iframeUrl = match[1];
                    if (iframeUrl.includes('player') || iframeUrl.includes('embed') || iframeUrl.includes('mixdrop')) {
                        streams.push(new StreamResult({
                            url: `MAGIC_PROXY_v1${btoa(iframeUrl)}`,
                            source: "Embed Mirror Player",
                            headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                        }));
                    }
                }
            }
            
            if (streams.length > 0) {
                cb({ success: true, data: streams });
            } else {
                cb({ success: false, errorCode: "NO_STREAMS" });
            }
        } catch (e) {
            console.error("loadStreams implementation failure: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 7. EXPOSE METHODS TO GLOBAL SCOPE FOR SKYSTREAM ENGINE
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
