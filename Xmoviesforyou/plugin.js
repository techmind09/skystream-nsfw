/**
 * XMoviesForYou (xmoviesforyou.com) Plugin for SkyStream
 * Source: https://xmoviesforyou.com
 * Features: Cloudflare-Optimized Headers, Robust Fallback Extractor, SkyStream Compliant
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    // 1. CLOUDFLARE BYPASS HEADERS CONFIGURATION
    // Note: Agar Cloudflare zyada sakht ho, toh user ko ek baar VPN ya system cookies share karni pad sakti hain.
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://xmoviesforyou.com/"
    };

    /**
     * 2. LOOSE PARSE VIDEO ITEMS FUNCTION
     * Cloudflare html ko minified (ek line me) kar deta hai, isliye humne \s* aur loose regex use kiya hai.
     */
    function parseVideoItems(html) {
        const items = [];
        const baseUrl = "https://xmoviesforyou.com";
        
        // Loose Pattern: Kisi bhi <a> tag ko dhoondho jo href se shuru ho aur andar html content ho
        const itemBlockPattern = /<a\s+[^>]*href=["'](\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        const posterPattern = /<img[^>]+src=["']([^"']+)["']/i;
        const titlePattern = /<h3[^>]*>([\s\S]*?)<\/h3>/i;
        
        let match;
        while ((match = itemBlockPattern.exec(html)) !== null) {
            const relativeUrl = match[1];
            const itemInnerHtml = match[2];
            
            // Unwanted system links ko skip karein
            if (relativeUrl.includes('/categories/') || relativeUrl.includes('/tags/') || relativeUrl === '/' || relativeUrl.includes('#') || relativeUrl.includes('javascript:')) {
                continue;
            }
            
            const posterMatch = itemInnerHtml.match(posterPattern);
            const titleMatch = itemInnerHtml.match(titlePattern);
            
            const posterUrl = posterMatch ? posterMatch[1] : null;
            let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : null;
            
            // Fallback: Agar <h3> minification ki wajah se na mile toh alt text uthayein
            if (!title && itemInnerHtml.includes('alt=')) {
                const altMatch = itemInnerHtml.match(/alt=["']([^"']+)["']/i);
                title = altMatch ? altMatch[1].trim() : null;
            }

            if (title) {
                title = title.replace(/\[.*?\]/g, '').trim(); // Clean bracket tags like [Brazzers]
            }
            
            const absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;
            
            // Avoid duplicates
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
     * 3. GET HOME FUNCTION
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xmoviesforyou.com";
            const data = {};

            // Step A: Pehle Home Page (Latest Videos) try karein, kyunki ye main lander hai
            try {
                const mainRes = await http_get(baseUrl, HEADERS);
                if (mainRes.status === 200 && mainRes.body) {
                    const mainItems = parseVideoItems(mainRes.body);
                    if (mainItems.length > 0) {
                        data["Latest Videos"] = mainItems.slice(0, 20);
                    }
                }
            } catch (e) {
                console.error("Main page block by Cloudflare: " + e.message);
            }
            
            // Step B: Sub-categories categories parsing
            const categories = {
                "Brunette": `${baseUrl}/categories/brunette`,
                "Blonde": `${baseUrl}/categories/blonde`,
                "Teen": `${baseUrl}/categories/teen`,
                "MILF": `${baseUrl}/categories/milf`,
                "Anal": `${baseUrl}/categories/anal`
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
                    console.error(`Category ${categoryName} failed: ${e.message}`);
                }
            }
            
            // Final Response Guard
            if (Object.keys(data).length === 0) {
                return cb({ success: false, errorCode: "PARSE_ERROR", message: "Cloudflare or Network restriction. Use a VPN and retry." });
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
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Search block/failed" });
            }
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
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
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to load watch page" });
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
     * 6. LOAD STREAMS FUNCTION
     * Humne jo button urls dhoondhe the, unhe ye nikalega
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            
            // Match Streamtape, Mixdrop, Myvidplay buttons inside the HTML wrapper code
            const btnPattern = /<a\s+[^>]*href="([^"]+(?:streamtape|mixdrop|m1xdrop|myvidplay)[^"]*)"[^>]*>/gi;
            let match;
            
            while ((match = btnPattern.exec(html)) !== null) {
                let streamServerUrl = match[1];
                let serverName = "Mirror Server";
                
                if (streamServerUrl.includes("streamtape")) serverName = "Streamtape";
                if (streamServerUrl.includes("mixdrop") || streamServerUrl.includes("m1xdrop")) serverName = "Mixdrop";
                if (streamServerUrl.includes("myvidplay")) serverName = "Myvidplay";

                streams.push(new StreamResult({
                    url: `MAGIC_PROXY_v1${btoa(streamServerUrl)}`,
                    source: serverName,
                    headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                }));
            }
            
            // Fallback Embed Iframe matching
            if (streams.length === 0) {
                const iframePattern = /<iframe[^>]+src="([^"]+)"/gi;
                while ((match = iframePattern.exec(html)) !== null) {
                    const iframeUrl = match[1];
                    if (iframeUrl.includes('player') || iframeUrl.includes('embed') || iframeUrl.includes('mixdrop')) {
                        streams.push(new StreamResult({
                            url: `MAGIC_PROXY_v1${btoa(iframeUrl)}`,
                            source: "Embed Player",
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
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 7. GLOBAL EXPOSE
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
