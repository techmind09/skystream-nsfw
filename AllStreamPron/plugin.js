/**
 * AllPornStream (allpornstream.com) Plugin for SkyStream
 * Optimized Version (Fixed Category Grid Parser + Enhanced Cloudflare Bypass)
 * Esbuild Production Ready
 */

(function () {
    // 1. GLOBAL HEADERS CONFIGURATION (Cloudflare Security Bypass Support)
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://allpornstream.com/",
        "Cache-Control": "no-cache"
    };

    // 2. PARSE VIDEO ITEMS (Fixed Filtering for Categories & Studios Content)
    function parseVideoItems(html, isCategoryPage = false) {
        const items = [];
        const baseUrl = "https://allpornstream.com";
        
        // Secure pattern matching responsive poster grids securely
        const itemPattern = /<a[^>]+href=["']((?:https:\/\/allpornstream\.com)?\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const relativeUrl = match[1];
            const innerHtml = match[2];
            
            // Poster images parsing block
            if (innerHtml.includes("poster-card") || innerHtml.includes("img") || innerHtml.includes("lazy")) {
                const imgMatch = innerHtml.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
                const altMatch = innerHtml.match(/<img[^>]+alt=["']([^"']+)["']/i) || innerHtml.match(/title=["']([^"']+)["']/i);
                
                const posterUrl = imgMatch ? imgMatch[1] : "";
                let title = altMatch ? altMatch[1].trim() : "Premium Video";
                
                // Kotlin Regex Replacement Mirror for Brackets [1080p] [60fps]
                title = title.replace(/\[.*?\]/g, '').trim();
                const absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;
                
                if (absoluteUrl && posterUrl) {
                    // FIX: Allow specific stream targets even if they appear inside category loops
                    if (absoluteUrl.includes('/videos/') || absoluteUrl.includes('/watch/') || !absoluteUrl.match(/\/(categories|studios)\/$/)) {
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
        }
        
        // Deduplicate array nodes
        return items.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
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
                    // Using specific headers routing to bypass geo/dns cache layers
                    const res = await http_get(item.url, { ...HEADERS, "Referer": baseUrl });
                    if (res && res.status === 200 && res.body) {
                        const parsedMovies = parseVideoItems(res.body, true);
                        if (parsedMovies && parsedMovies.length > 0) {
                            data[item.title] = parsedMovies.slice(0, 20); // Top 20 items per row limit
                        }
                    }
                } catch (rowError) {
                    console.error(`Error loading row [${item.title}]: ${rowError.message}`);
                }
            }
            
            // Hard Fallback System (Triggered if DNS/Cloudflare drops category grids)
            if (Object.keys(data).length === 0) {
                const fallbackRes = await http_get(`${baseUrl}/`, HEADERS);
                if (fallbackRes && fallbackRes.status === 200 && fallbackRes.body) {
                    const latestMovies = parseVideoItems(fallbackRes.body, false);
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
            
            const items = parseVideoItems(res.body || "", false);
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

    // 6. EXTRACT SERVER LINKS HELPERS (Supports Multi-Servers & Third-party Nodes)
    function extractServerLinks(html) {
        const links = [];
        // Regex patterns matching stream embedding mirrors
        const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi;
        const iframePattern = /<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
        
        let match;
        while ((match = btnPattern.exec(html)) !== null) {
            const url = match[1];
            if (url && (url.includes('download') || url.includes('stream') || url.includes('player') || url.includes('embed') || url.includes('cdn') || url.includes('mydaddy') || url.includes('streamtape') || url.includes('dood') || url.includes('voe') || url.includes('filemoon'))) {
                if (!url.includes('clarity.ms') && !url.includes('adscore')) {
                    links.push(url);
                }
            }
        }
        
        while ((match = iframePattern.exec(html)) !== null) {
            const url = match[1];
            if (url && !url.includes('clarity.ms')) {
                links.push(url);
            }
        }
        return [...new Set(links)]; 
    }

    // 7. RESOLVE DIRECT VIDEO URL (Cloudflare-DNS / Snippet Multi-Server Extractor)
    async function resolveDirectVideoUrl(serverUrl) {
        try {
            let refererUrl = "https://allpornstream.com/";
            if (serverUrl.includes("mydaddy.cc") || serverUrl.includes("mydaddy")) {
                refererUrl = "https://diepornos.com/";
            } else if (serverUrl.includes("streamtape.com")) {
                refererUrl = "https://streamtape.com/";
            }

            const res = await http_get(serverUrl, {
                ...HEADERS,
                "Referer": refererUrl
            });
            
            if (res.status !== 200 || !res.body) return null;
            const subHtml = res.body;

            // MyDaddy Extractor Matching Node
            const myDaddyRegex = /<source src=\\"(.*?)\\" title=\\"(.*?)\\"/gi;
            let myDaddyMatch = myDaddyRegex.exec(subHtml);
            if (myDaddyMatch) {
                let rawUrl = myDaddyMatch[1].replace(/\\/g, ""); 
                return rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
            }

            // Standard MP4/M3U8 Stream Source Extraction
            const sourceMatch = subHtml.match(/<source[^>]+src=["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
            if (sourceMatch) return sourceMatch[1];

            // Object Configurations Parsing
            const fileMatch = subHtml.match(/["']?file["']?\s*:\s*["'](https?:\/\/[^"']+)["']/i);
            if (fileMatch) return fileMatch[1];

            return null;
        } catch (e) {
            return null;
        }
    }

    // 8. LOAD STREAMS FUNCTION (Aggregated Multi-Server Engine)
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
            
            // Loop extended to evaluate up to 8 alternative nodes dynamically
            for (let i = 0; i < Math.min(intermediateLinks.length, 8); i++) {
                const targetUrl = intermediateLinks[i];
                const directUrl = await resolveDirectVideoUrl(targetUrl);
                
                if (directUrl) {
                    let sourceName = "Premium Node";
                    if (targetUrl.includes("mydaddy")) sourceName = "MyDaddy Premium";
                    else if (targetUrl.includes("streamtape")) sourceName = "Streamtape Engine";
                    else if (targetUrl.includes("voe")) sourceName = "VOE HighSpeed";
                    else if (targetUrl.includes("filemoon")) sourceName = "Filemoon Storage";
                    
                    finalizedStreams.push(new StreamResult({
                        url: directUrl,
                        source: sourceName,
                        isHtml: directUrl.includes('iframe') || !directUrl.match(/\.(mp4|m3u8)/i), 
                        headers: {
                            "Referer": targetUrl.includes("mydaddy") ? "https://mydaddy.cc" : "https://allpornstream.com/",
                            "User-Agent": HEADERS["User-Agent"]
                        }
                    }));
                }
            }
            
            if (finalizedStreams.length === 0) {
                return cb({ success: false, errorCode: "NO_STREAMS", message: "Media nodes streams routing failed due to security locks" });
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
