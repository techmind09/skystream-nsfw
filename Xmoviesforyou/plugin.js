/**
 * XMoviesForYou (xmoviesforyou.com) Plugin for SkyStream
 * Source: https://xmoviesforyou.com
 * Features: Singular Category URL Fix, Embed Resolver, Anti-Buffer Fallback
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    // 1. CLOUDFLARE & ENGINE HEADERS CONFIGURATION
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        "Referer": "https://xmoviesforyou.com/"
    };

    /**
     * 2. PARSE VIDEO ITEMS FUNCTION
     */
    function parseVideoItems(html) {
        const items = [];
        const baseUrl = "https://xmoviesforyou.com";
        
        // Dynamic structural matcher for cards
        const itemBlockPattern = /<a\s+[^>]*href=["'](\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        const posterPattern = /<img[^>]+src=["']([^"']+)["']/i;
        const titlePattern = /<h3[^>]*>([\s\S]*?)<\/h3>/i;
        
        let match;
        while ((match = itemBlockPattern.exec(html)) !== null) {
            const relativeUrl = match[1];
            const itemInnerHtml = match[2];
            
            // Skip non-video infrastructure links
            if (relativeUrl.includes('/category/') || relativeUrl.includes('/tags/') || relativeUrl === '/' || relativeUrl.includes('#')) {
                continue;
            }
            
            const posterMatch = itemInnerHtml.match(posterPattern);
            const titleMatch = itemInnerHtml.match(titlePattern);
            
            const posterUrl = posterMatch ? posterMatch[1] : null;
            let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : null;
            
            // Fallback to image alt text if h3 is minified or missing
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
     * 3. GET HOME FUNCTION (URLS FIXED TO SINGULAR '/category/')
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xmoviesforyou.com";
            const data = {};

            // Step A: Fetch Latest Videos from Home Page
            try {
                const mainRes = await http_get(baseUrl, HEADERS);
                if (mainRes.status === 200 && mainRes.body) {
                    const mainItems = parseVideoItems(mainRes.body);
                    if (mainItems.length > 0) {
                        data["Latest Videos"] = mainItems.slice(0, 20);
                    }
                }
            } catch (e) {
                console.error("Main page fetch failed: " + e.message);
            }
            
            // Step B: Fetch Specific Categories using correct singular '/category/' path
            const categories = {
                "Brunette": `${baseUrl}/category/brunette`,
                "Blonde": `${baseUrl}/category/blonde`,
                "Teen": `${baseUrl}/category/teen`,
                "MILF": `${baseUrl}/category/milf`,
                "Threesome": `${baseUrl}/category/threesome`,
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
                    console.error(`Category [${categoryName}] processing failed: ${e.message}`);
                }
            }
            
            if (Object.keys(data).length === 0) {
                return cb({ success: false, errorCode: "PARSE_ERROR", message: "Failed to parse any sections. Check VPN/Connection." });
            }
            
            cb({ success: true, data });
        } catch (e) {
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
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Search request failed" });
            }
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 5. LOAD FUNCTION
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to load item" });
            }
            
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
     * 6. LOAD STREAMS FUNCTION (MIXDROP DETECTOR + WEB PLAYER EMBED REWRITER)
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            
            // Match streaming links dynamically regardless of button casing
            const btnPattern = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
            let match;
            
            while ((match = btnPattern.exec(html)) !== null) {
                let rawUrl = match[1].trim();
                
                const isStreamtape = rawUrl.includes("streamtape.com");
                const isMixdrop = rawUrl.includes("mixdrop.") || rawUrl.includes("m1xdrop.");
                const isMyvidplay = rawUrl.includes("myvidplay.com");

                if (isStreamtape || isMixdrop || isMyvidplay) {
                    let formattedUrl = rawUrl;
                    let serverName = "Streaming Server";

                    // Convert standard redirect urls to clean embed player urls to prevent core buffering loops
                    if (isStreamtape) {
                        serverName = "Streamtape (Fast)";
                        formattedUrl = rawUrl.replace("/v/", "/e/");
                    } else if (isMixdrop) {
                        serverName = "Mixdrop (Max)";
                        formattedUrl = rawUrl.replace("/f/", "/e/");
                    } else if (isMyvidplay) {
                        serverName = "Myvidplay (Direct)";
                        formattedUrl = rawUrl.replace("/d/", "/e/");
                    }

                    if (!streams.some(s => s.url.includes(btoa(formattedUrl)))) {
                        streams.push(new StreamResult({
                            url: `MAGIC_PROXY_v1${btoa(formattedUrl)}`,
                            source: serverName,
                            headers: { 
                                "Referer": url, 
                                "User-Agent": HEADERS["User-Agent"] 
                            }
                        }));
                    }
                }
            }
            
            // Inline iframe backup strategy
            if (streams.length === 0) {
                const iframePattern = /<iframe[^>]+src=["']([^"']+)["']/gi;
                while ((match = iframePattern.exec(html)) !== null) {
                    let iframeUrl = match[1];
                    if (iframeUrl.includes('player') || iframeUrl.includes('embed') || iframeUrl.includes('mixdrop') || iframeUrl.includes('streamtape')) {
                        streams.push(new StreamResult({
                            url: `MAGIC_PROXY_v1${btoa(iframeUrl)}`,
                            source: "Mirror Play",
                            headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                        }));
                    }
                }
            }
            
            if (streams.length > 0) {
                cb({ success: true, data: streams });
            } else {
                cb({ success: false, errorCode: "NO_STREAMS", message: "No operational servers located." });
            }
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 7. EXPOSE LIFECYCLE HOOKS
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
