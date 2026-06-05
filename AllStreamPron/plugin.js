/**
 * AllPornStream (allpornstream.com) Plugin for SkyStream
 * Combined & Integrated Version (Kotlin Main API + MyDaddy Extractor)
 * Esbuild Production Ready
 */

(function () {
    // 1. GLOBAL HEADERS CONFIGURATION (Cloudflare Security Bypass Support)
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://allpornstream.com/"
    };

    // 2. PARSE VIDEO ITEMS (Kotlin Jsoup Document Parser Mirror)
    function parseVideoItems(html) {
        const items = [];
        const baseUrl = "https://allpornstream.com";
        
        // Comprehensive pattern matching responsive poster grids securely
        const itemPattern = /<a[^>]+href=["']((?:https:\/\/allpornstream\.com)?\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const relativeUrl = match[1];
            const innerHtml = match[2];
            
            // Filters out structure metadata nodes that aren't stream videos
            if (innerHtml.includes("poster-card") || innerHtml.includes("img")) {
                const imgMatch = innerHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
                const altMatch = innerHtml.match(/<img[^>]+alt=["']([^"']+)["']/i) || innerHtml.match(/title=["']([^"']+)["']/i);
                
                const posterUrl = imgMatch ? imgMatch[1] : "";
                let title = altMatch ? altMatch[1].trim() : "Premium Video";
                
                // Kotlin Regex Replacement Mirror for Brackets [1080p] [60fps]
                title = title.replace(/\[.*?\]/g, '').trim();
                const absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;
                
                if (absoluteUrl && posterUrl && !absoluteUrl.includes('/categories/') && !absoluteUrl.includes('/studios/')) {
                    items.push(new MultimediaItem({
                        title: title,
                        url: absoluteUrl,
                        posterUrl: posterUrl,
                        type: "movie",
                        isAdult: true
                    }));
                }
            }
        }
        
        return items;
    }

    // 3. GET HOME FUNCTION (All 15 Categories Registered)
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://allpornstream.com";
            
            const categories = [
                { title: "Brunette", url: `${baseUrl}/categories/brunette` },
                { title: "1080 P", url: `${baseUrl}/categories/1080-p` },
                { title: "Shaved Pussy", url: `${baseUrl}/categories/shaved-pussy` },
                { title: "Anal", url: `${baseUrl}/categories/anal` },
                { title: "Interracial", url: `${baseUrl}/categories/interracial` },
                { title: "Small Tits", url: `${baseUrl}/categories/small-tits` },
                { title: "60 Fps", url: `${baseUrl}/categories/60-fps` },
                { title: "Latina", url: `${baseUrl}/categories/latina` },
                { title: "Pov", url: `${baseUrl}/categories/pov` },
                { title: "Asian", url: `${baseUrl}/categories/asian` },
                { title: "Masturbation", url: `${baseUrl}/categories/masturbation` },
                { title: "Ebony", url: `${baseUrl}/categories/ebony` },
                { title: "Bisexual", url: `${baseUrl}/categories/bisexual` },
                { title: "Naughtyamerica", url: `${baseUrl}/categories/naughtyamerica` },
                { title: "Casting", url: `${baseUrl}/categories/casting` }
            ];
            
            const data = {};
            
            // Sequenced mapping matching the async loop processing
            for (const item of categories) {
                try {
                    const res = await http_get(item.url, HEADERS);
                    if (res && res.status === 200 && res.body) {
                        const parsedMovies = parseVideoItems(res.body);
                        if (parsedMovies && parsedMovies.length > 0) {
                            data[item.title] = parsedMovies.slice(0, 20); // Top 20 items per row limit
                        }
                    }
                } catch (rowError) {
                    console.error(`Error loading row [${item.title}]: ${rowError.message}`);
                }
            }
            
            // Hard Fallback System
            if (Object.keys(data).length === 0) {
                const fallbackRes = await http_get(`${baseUrl}/`, HEADERS);
                if (fallbackRes && fallbackRes.status === 200 && fallbackRes.body) {
                    const latestMovies = parseVideoItems(fallbackRes.body);
                    if (latestMovies.length > 0) {
                        data["Latest Releases"] = latestMovies.slice(0, 20);
                    }
                }
            }
            
            cb({ success: true, data });
        } catch (globalError) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: globalError.message });
        }
    }

    // 4. SEARCH FUNCTION
    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://allpornstream.com";
            const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
            const res = await http_get(searchUrl, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Search endpoint unavailable" });
            }
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 5. LOAD FUNCTION
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Metadata targeting failed" });
            }
            
            const html = res.body || "";
            
            const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/<h3[^>]*>([^<]+)<\/h3>/);
            let title = titleMatch ? titleMatch[1].replace("- AllPornStream", "").trim() : "Unknown Video";
            title = title.replace(/\[.*?\]/g, '').trim(); 
            
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/) || html.match(/src="([^"]+\.(?:jpg|jpeg|png|webp))"/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            const episode = new Episode({
                name: "Play Video",
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

    // 6. EXTRACT SERVER LINKS HELPERS
    function extractServerLinks(html) {
        const links = [];
        const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi;
        let match;
        
        while ((match = btnPattern.exec(html)) !== null) {
            const url = match[1];
            if (url && (url.includes('download') || url.includes('stream') || url.includes('player') || url.includes('embed') || url.includes('cdn') || url.includes('mydaddy'))) {
                if (!url.includes('clarity.ms') && !url.includes('adscore')) {
                    links.push(url);
                }
            }
        }
        return [...new Set(links)]; 
    }

    // 7. RESOLVE DIRECT VIDEO URL (Kotlin MyDaddyExtractor Logic Mirror)
    async function resolveDirectVideoUrl(serverUrl) {
        try {
            // Kotlin logic: referer = "https://diepornos.com/" if server contains mydaddy
            let refererUrl = "https://allpornstream.com/";
            if (serverUrl.includes("mydaddy.cc") || serverUrl.includes("mydaddy")) {
                refererUrl = "https://diepornos.com/";
            }

            const res = await http_get(serverUrl, {
                ...HEADERS,
                "Referer": refererUrl
            });
            
            if (res.status !== 200 || !res.body) return null;
            const subHtml = res.body;

            // Kotlin MyDaddy Extractor Sourceregex Matching Block
            const myDaddyRegex = /<source src=\\"(.*?)\\" title=\\"(.*?)\\"/gi;
            let myDaddyMatch = myDaddyRegex.exec(subHtml);
            if (myDaddyMatch) {
                let rawUrl = myDaddyMatch[1].replace(/\\/g, ""); // Removes escaping backslashes
                let finalUrl = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
                return finalUrl;
            }

            // Fallback Engine Parsing Node
            const sourceMatch = subHtml.match(/<source[^>]+src=["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
            if (sourceMatch) return sourceMatch[1];

            const fileMatch = subHtml.match(/["']?file["']?\s*:\s*["'](https?:\/\/[^"']+)["']/i);
            if (fileMatch) return fileMatch[1];

            const iframeMatch = subHtml.match(/<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/i);
            if (iframeMatch) return iframeMatch[1];

            return null;
        } catch (e) {
            return null;
        }
    }

    // 8. LOAD STREAMS FUNCTION
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch servers page" });
            }
            
            const html = res.body || "";
            const intermediateLinks = extractServerLinks(html);
            
            if (intermediateLinks.length === 0) {
                return cb({ success: false, errorCode: "NO_STREAMS", message: "No operational servers found" });
            }
            
            const finalizedStreams = [];
            
            for (let i = 0; i < Math.min(intermediateLinks.length, 5); i++) {
                const targetUrl = intermediateLinks[i];
                const directUrl = await resolveDirectVideoUrl(targetUrl);
                
                if (directUrl) {
                    finalizedStreams.push(new StreamResult({
                        url: directUrl,
                        source: targetUrl.includes("mydaddy") ? "MyDaddy Premium" : `Premium Direct Node ${i + 1}`,
                        isHtml: directUrl.includes('iframe') || !directUrl.match(/\.(mp4|m3u8)/i), 
                        headers: {
                            "Referer": "https://mydaddy.cc",
                            "User-Agent": HEADERS["User-Agent"]
                        }
                    }));
                }
            }
            
            if (finalizedStreams.length === 0) {
                return cb({ success: false, errorCode: "NO_STREAMS", message: "Media nodes streams routing failed" });
            }
            
            cb({ success: true, data: finalizedStreams });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 9. EXPOSE METHODS TO GLOBAL CONTEXT
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
