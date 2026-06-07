/**
 * XMoviesForYou (xmoviesforyou.com) Plugin for SkyStream
 * Source: https://xmoviesforyou.com
 * Features: Expanded Categories Grid Mapping, Singular Slug Fix, Standard Native WebView Router
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    // 1. CLOUDFLARE BYPASS HEADERS
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
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
            
            // Skip infrastructure links
            if (relativeUrl.includes('/category/') || relativeUrl.includes('/tags/') || relativeUrl === '/' || relativeUrl.includes('#')) {
                continue;
            }
            
            const posterMatch = itemInnerHtml.match(posterPattern);
            const titleMatch = itemInnerHtml.match(titlePattern);
            
            const posterUrl = posterMatch ? posterMatch[1] : null;
            let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : null;
            
            // Fallback to alt attribute if h3 text node is compressed
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
     * 3. GET HOME (ALL GRID CATEGORIES ADDED)
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xmoviesforyou.com";
            const data = {};

            // Default Lander (Latest Updates)
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
            
            // Image "5f5c98a2-04e6-4a01-98b2-c113b5b8ef06" ke pure categories block ki accurate listing
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
                    console.error(`Skipping or Empty Category: ${categoryName}`);
                }
            }
            
            if (Object.keys(data).length === 0) {
                return cb({ success: false, errorCode: "PARSE_ERROR", message: "No operational modules retrieved." });
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
     * 6. LOAD STREAMS (ROUTER CHANNEL CONFIGURATION)
     */
    async function loadStreams(url, cb) {
    try {
        const res = await http_get(url, HEADERS);
        if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
        
        const html = res.body || "";
        const streams = [];
        
        // Is regex ko thoda modify kiya hai taaki normal text URLs aur hrefs dono check ho sakein
        const btnPattern = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
        let match;
        
        // 1. Pehle HTML ke andar anchor tags (`<a>`) ko check karein
        while ((match = btnPattern.exec(html)) !== null) {
            let rawUrl = match[1].trim();
            processUrl(rawUrl, url, streams);
        }

        // 2. Agar lapecontent ka link direct text ya kisi script mein chhupa ho, toh usko bhi check karein
        const lapePattern = /(https?:\/\/[^\s"'`<>]+lapecontent\.net\/[^\s"'`<>]+)/gi;
        let lapeMatch;
        while ((lapeMatch = lapePattern.exec(html)) !== null) {
            let rawUrl = lapeMatch[1].trim();
            processUrl(rawUrl, url, streams);
        }
        
        if (streams.length > 0) {
            cb({ success: true, data: streams });
        } else {
            cb({ success: false, errorCode: "NO_STREAMS", message: "No current servers online." });
        }
    } catch (e) {
        cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
    }
}

// URLs ko handle karne ke liye helper function
function processUrl(rawUrl, refererUrl, streams) {
    let isStreamtape = rawUrl.includes("streamtape.com");
    let isMixdrop = rawUrl.includes("mixdrop.") || rawUrl.includes("m1xdrop.");
    let isMyvidplay = rawUrl.includes("myvidplay.com");
    let isLapeContent = rawUrl.includes("lapecontent.net");

    if (isStreamtape || isMixdrop || isMyvidplay || isLapeContent) {
        let playUrl = rawUrl;
        let sourceTag = "Web Mirror Player";

        if (isStreamtape) {
            sourceTag = "Streamtape Server";
            playUrl = rawUrl.replace("/v/", "/e/");
        } else if (isMixdrop) {
            sourceTag = "Mixdrop Server";
            playUrl = rawUrl.replace("/f/", "/e/");
        } else if (isMyvidplay) {
            sourceTag = "Myvidplay Server";
            playUrl = rawUrl.replace("/d/", "/e/");
        } else if (isLapeContent) {
            sourceTag = "LapeContent Server";
            // Lapecontent aamtaur par direct video link hota hai, 
            // isliye isme replace ki zaroorat nahi padti.
            playUrl = rawUrl; 
        }

        if (!streams.some(s => s.url === playUrl)) {
            streams.push(new StreamResult({
                url: playUrl, 
                source: sourceTag,
                headers: { 
                    "Referer": refererUrl,
                    "User-Agent": HEADERS["User-Agent"]
                }
            }));
        }
    }
}

    // 7. EXPOSE HOOKS
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
