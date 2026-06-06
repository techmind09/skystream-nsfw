/**
 * XMoviesForYou (xmoviesforyou.com) Plugin for SkyStream
 * Source: https://xmoviesforyou.com
 * Features: Dynamic Wildcard Extractor, Cloudflare DNS Bypass, Auto-Embed Player Rerouter
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    // 1. CLOUDFLARE BYPASS NETWORK HEADERS
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
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
                console.error("Home feed failure: " + e.message);
            }
            
            const categories = {
                "Brunette": `${baseUrl}/category/brunette`,
                "Blonde": `${baseUrl}/category/blonde`,
                "Teen": `${baseUrl}/category/teen`,
                "MILF": `${baseUrl}/category/milf`,
                "Threesome": `${baseUrl}/category/threesome`,
                "Interracial": `${baseUrl}/category/interracial`,
                "Redhead": `${baseUrl}/category/redhead`,
                "Anal": `${baseUrl}/category/anal`,
                "Lesbian": `${baseUrl}/category/lesbian`,
                "Asian": `${baseUrl}/category/asian`,
                "Latina": `${baseUrl}/category/latina`,
                "Tattoo": `${baseUrl}/category/tattoo`,
                "Orgy": `${baseUrl}/category/orgy`,
                "BangBros": `${baseUrl}/category/bangbros`,
                "NaughtyAmerica": `${baseUrl}/category/naughtyamerica`,
                "Ebony": `${baseUrl}/category/ebony`,
                "TeamSkeet": `${baseUrl}/category/teamskeet`,
                "Brazzers": `${baseUrl}/category/brazzers`,
                "Gangbang": `${baseUrl}/category/gangbang`,
                "BDSM": `${baseUrl}/category/bdsm`,
                "RealityKings": `${baseUrl}/category/realitykings`,
                "21Sextury": `${baseUrl}/category/21sextury`,
                "Squirt": `${baseUrl}/category/squirt`,
                "Hardcore": `${baseUrl}/category/hardcore`,
                "Masturbation": `${baseUrl}/category/masturbation`
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
                    console.error(`Skipping Category: ${categoryName}`);
                }
            }
            
            if (Object.keys(data).length === 0) {
                return cb({ success: false, errorCode: "PARSE_ERROR", message: "Data processing failed." });
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
     * 6. LOAD STREAMS (THE ALL-IN-ONE WILDCARD RESOLVER)
     * Ab koi bhi host ho (Streamtape, Mixdrop, Voe, Xtreamstream) sab automatically parse honge.
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            
            // Loose Wildcard Matcher: Yeh page ke saare external streaming/downloading anchor buttons utha lega
            const btnPattern = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            
            while ((match = btnPattern.exec(html)) !== null) {
                let rawUrl = match[1].trim();
                let btnText = match[2].replace(/<[^>]*>/g, '').toUpperCase().trim();
                
                // Ads aur analytics scripts ke domains ko filter out karne ke liye guard list
                if (rawUrl.includes('clarity.ms') || rawUrl.includes('adscore') || rawUrl.includes('google') || rawUrl.includes('facebook') || rawUrl.includes('xmoviesforyou')) {
                    continue;
                }

                let playUrl = rawUrl;
                let sourceTag = btnText || "External Link";

                // Playback Error Bypass Logic: Har single server ke URLs ko real streaming embed syntax me badlein
                if (rawUrl.includes("streamtape")) {
                    sourceTag = "Streamtape Server";
                    playUrl = rawUrl.replace("/v/", "/e/");
                } else if (rawUrl.includes("mixdrop") || rawUrl.includes("m1xdrop")) {
                    sourceTag = "Mixdrop Server";
                    playUrl = rawUrl.replace("/f/", "/e/");
                } else if (rawUrl.includes("voe")) {
                    sourceTag = "Voe Server";
                    // Voe generic dynamic embed converter
                    if (rawUrl.includes("/v/")) playUrl = rawUrl.replace("/v/", "/e/");
                } else if (rawUrl.includes("xtreamstream") || rawUrl.includes("stream")) {
                    sourceTag = btnText.includes("XTREAM") ? "XtreamStream" : `Server [${btnText}]`;
                    if (rawUrl.includes("/v/")) playUrl = rawUrl.replace("/v/", "/e/");
                } else if (rawUrl.includes("dood")) {
                    sourceTag = "DoodStream";
                    playUrl = rawUrl.replace("/d/", "/e/");
                }

                // Cloudflare-DNS and Token Bypass Encapsulation Protocol 
                const proxyWrappedUrl = "MAGIC_PROXY_v1" + btoa(playUrl);

                if (!streams.some(s => s.url === proxyWrappedUrl)) {
                    streams.push(new StreamResult({
                        url: proxyWrappedUrl, 
                        source: sourceTag,
                        headers: { 
                            "Referer": url,
                            "User-Agent": HEADERS["User-Agent"]
                        }
                    }));
                }
            }
            
            if (streams.length > 0) {
                cb({ success: true, data: streams });
            } else {
                cb({ success: false, errorCode: "NO_STREAMS", message: "No stream servers could be extracted." });
            }
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 7. CORE LIFECYCLE ENGINE INITIALIZATION
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
