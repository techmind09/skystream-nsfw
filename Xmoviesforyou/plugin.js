/**
 * XMoviesForYou (xmoviesforyou.com) Plugin for SkyStream
 * Source: https://xmoviesforyou.com
 * Features: Native Embed Router Bypass, Anti-Buffering Core, Standard Layout Mapping
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://xmoviesforyou.com/"
    };

    /**
     * 2. PARSE VIDEO ITEMS
     */
    function parseVideoItems(html) {
        const items = [];
        const baseUrl = "https://xmoviesforyou.com";
        
        const itemBlockPattern = /<a\s+[^>]*href=["'](\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        const posterPattern = /<img[^>]+src=["']([^"']+)["']/i;
        const titlePattern = /<h3[^>]*>([\s\S]*?)<\/h3>/i;
        
        let match;
        while ((match = itemBlockPattern.exec(html)) !== null) {
            const relativeUrl = match[1];
            const itemInnerHtml = match[2];
            
            if (relativeUrl.includes('/category/') || relativeUrl.includes('/tags/') || relativeUrl === '/' || relativeUrl.includes('#')) {
                continue;
            }
            
            const posterMatch = itemInnerHtml.match(posterPattern);
            const titleMatch = itemInnerHtml.match(titlePattern);
            
            const posterUrl = posterMatch ? posterMatch[1] : null;
            let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : null;
            
            if (!title && itemInnerHtml.includes('alt=')) {
                const altMatch = itemInnerHtml.match(/alt=["']([^"']+)["']/i);
                title = altMatch ? altMatch[1].trim() : null;
            }

            if (title) {
                title = title.replace(/\[.*?\]/g, '').trim(); 
            }
            
            const absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;
            
            if (absoluteUrl && posterUrl && title && !items.some(i => i.url === absoluteUrl)) {
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
     * 3. GET HOME
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xmoviesforyou.com";
            const data = {};

            try {
                const mainRes = await http_get(baseUrl, HEADERS);
                if (mainRes.status === 200 && mainRes.body) {
                    const mainItems = parseVideoItems(mainRes.body);
                    if (mainItems.length > 0) {
                        data["Latest Videos"] = mainItems.slice(0, 20);
                    }
                }
            } catch (e) {
                console.error("Home fallback trigger: " + e.message);
            }
            
            const categories = {
                "Brunette": `${baseUrl}/category/brunette`,
                "Blonde": `${baseUrl}/category/blonde`,
                "Teen": `${baseUrl}/category/teen`,
                "MILF": `${baseUrl}/category/milf`,
                "Anal": `${baseUrl}/category/anal`,
                "BDSM": `${baseUrl}/category/bdsm`
            };
            
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
                    console.error(`Failed: ${categoryName}`);
                }
            }
            
            if (Object.keys(data).length === 0) {
                return cb({ success: false, errorCode: "PARSE_ERROR", message: "Sections data unavailable." });
            }
            
            cb({ success: true, data });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 4. SEARCH
     */
    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xmoviesforyou.com";
            const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
            const res = await http_get(searchUrl, HEADERS);
            
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 5. LOAD
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
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
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 6. LOAD STREAMS (THE ABSOLUTE RESOLVER FIX)
     * Direct conversion to sandboxed embed domains without token breaking.
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            
            const btnPattern = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
            let match;
            
            while ((match = btnPattern.exec(html)) !== null) {
                let rawUrl = match[1].trim();
                
                // Clean URLs dynamically
                let isStreamtape = rawUrl.includes("streamtape.com");
                let isMixdrop = rawUrl.includes("mixdrop.") || rawUrl.includes("m1xdrop.");
                let isMyvidplay = rawUrl.includes("myvidplay.com");

                if (isStreamtape || isMixdrop || isMyvidplay) {
                    let playUrl = rawUrl;
                    let sourceTag = "Server";

                    if (isStreamtape) {
                        sourceTag = "Streamtape";
                        // Playback URL Fix: e.g., streamtape.com/v/abcd -> streamtape.com/e/abcd
                        playUrl = rawUrl.replace("/v/", "/e/");
                    } else if (isMixdrop) {
                        sourceTag = "Mixdrop";
                        // Playback URL Fix: e.g., mixdrop.bz/f/abcd -> mixdrop.bz/e/abcd
                        playUrl = rawUrl.replace("/f/", "/e/");
                    } else if (isMyvidplay) {
                        sourceTag = "Myvidplay";
                        playUrl = rawUrl.replace("/d/", "/e/");
                    }

                    // Strict base64 push standard protocol bypass
                    const base64Url = btoa(playUrl);
                    if (!streams.some(s => s.url.includes(base64Url))) {
                        streams.push(new StreamResult({
                            url: playUrl, // Passing raw embed stream target directly to prevent engine decoding faults
                            source: sourceTag,
                            headers: { 
                                "Referer": url,
                                "User-Agent": HEADERS["User-Agent"]
                            }
                        }));
                    }
                }
            }
            
            // Step B: Pure Iframe Extraction Mirror Strategy
            if (streams.length === 0) {
                const iframePattern = /<iframe[^>]+src=["']([^"']+)["']/gi;
                while ((match = iframePattern.exec(html)) !== null) {
                    let iframeUrl = match[1];
                    if (iframeUrl.includes('mixdrop') || iframeUrl.includes('streamtape') || iframeUrl.includes('player')) {
                        streams.push(new StreamResult({
                            url: iframeUrl,
                            source: "Mirror Node Player",
                            headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                        }));
                    }
                }
            }
            
            if (streams.length > 0) {
                cb({ success: true, data: streams });
            } else {
                cb({ success: false, errorCode: "NO_STREAMS", message: "No active video stream configurations mapped." });
            }
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 7. SCOPE INITIALIZATION
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
