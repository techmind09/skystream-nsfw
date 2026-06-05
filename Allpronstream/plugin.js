/**
 * AllStreamPron (allpornstream.com) Plugin for SkyStream
 * Source: https://allpornstream.com
 * Features: Latest Updates, Categorized Navigation, Search, Deep-Link Video Stream Resolver
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    // 1. HEADERS CONFIGURATION
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://allpornstream.com/"
    };

    /**
     * 2. PARSE VIDEO ITEMS FUNCTION
     * Homepage, Sidebars aur Search results se videos aur links ki list nikalta hai.
     */
    function parseVideoItems(html) {
        const items = [];
        
        // const itemPattern: HTML Sidebar aur grids se blocks extract karne ke liye (Screenshots ke 'group/menu-item' selector ke physical structure par based)
        const itemPattern = /<li[^>]*class="[^"]*group\/menu-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
        
        // Sub-patterns jo har individual block ke andar match kiye jayenge
        const titlePattern = /<span[^>]*>([\s\S]*?)<\/span>/i;
        const sourcePattern = /<a[^>]*href="([^"]+)"/i;
        const posterPattern = /src="([^"]+\.(?:jpg|jpeg|png|webp|gif))"/i;

        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const itemContent = match[1];

            // const titleMatch aur const title: Element ka clear name slice karne ke liye
            const titleMatch = itemContent.match(titlePattern);
            const title = titleMatch ? titleMatch[1].trim() : "Unknown Video";

            // const sourceMatch: Main item destination link extract karne ke liye
            const sourceMatchResult = itemContent.match(sourcePattern);
            const sourceMatch = sourceMatchResult ? sourceMatchResult[1] : null;

            // const posterMatch: Card thumbnail reference pull karne ke liye
            const posterMatchResult = itemContent.match(posterPattern);
            const posterUrl = posterMatchResult ? posterMatchResult[1] : "";
            
            if (sourceMatch && (sourceMatch.includes('allpornstream.com') || sourceMatch.startsWith('/') || sourceMatch.startsWith('http'))) {
                items.push(new MultimediaItem({
                    title: title,
                    url: sourceMatch.startsWith('/') ? `https://allpornstream.com${sourceMatch}` : sourceMatch,
                    posterUrl: posterUrl,
                    type: "movie",
                    isAdult: true
                }));
            }
        }
        
        // JSON-LD Fallback: Agar HTML structure match na ho aur modern structured data context active ho
        if (items.length === 0) {
            const jsonLdPattern = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
            let jsonMatch;
            while ((jsonMatch = jsonLdPattern.exec(html)) !== null) {
                try {
                    const data = JSON.parse(jsonMatch[1]);
                    if (data && data["@type"] === "VideoObject") {
                        items.push(new MultimediaItem({
                            title: data.name || "Untitled Video",
                            url: data.embedUrl || data.url,
                            posterUrl: data.thumbnailUrl,
                            type: "movie",
                            isAdult: true
                        }));
                    }
                } catch (e) {
                    // Fail-safe silent catch
                }
            }
        }
        
        return items;
    }

    /**
     * 3. GET HOME FUNCTION
     * App ke main feed interface par primary content stream load karta hai.
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://allpornstream.com";
            const categories = {
                "Brazzers Exxtra": `${baseUrl}/brazzers exxtra`,
                "Only Fans": `${baseUrl}/only fans`,
                "Sex Mex": `${baseUrl}/sex mex`,
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
                    console.error(`Error fetching category [${categoryName}]: ${e.message}`);
                }
            }
            
            if (Object.keys(data).length === 0) {
                const res = await http_get(baseUrl, HEADERS);
                if (res.status === 200 && res.body) {
                    data["Latest Releases"] = parseVideoItems(res.body).slice(0, 20);
                }
            }
            
            cb({ success: true, data });
        } catch (e) {
            console.error("getHome error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 4. SEARCH FUNCTION
     * Search parameters ke dynamic evaluation ke base par assets parse karta hai.
     */
    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://allpornstream.com";
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
     * 5. LOAD FUNCTION
     * Video ka inner core player/details container process karke valid dynamic properties extract karta hai.
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch video page" });
            }
            
            const html = res.body || "";
            
            // const titleMatch aur const title: Clean structural string filter karne ke liye
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*All.*Stream.*$/i, '').trim() : "Unknown Video";
            
            // const posterMatch: High-res default background/poster target check
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/) || html.match(/src="([^"]+\.(?:jpg|jpeg|png|webp))"/i);
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
            console.error("load error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 6. EXTRACT SERVER LINKS HELPERS
     * Raw DOM layout me se explicit streaming action targets isolate karta hai.
     */
    function extractServerLinks(html) {
        const links = [];
        
        // const btnPattern: Streaming keywords aur actions wale operational node references pull karne ke liye
        const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi;
        let match;
        
        while ((match = btnPattern.exec(html)) !== null) {
            const url = match[1];
            if (url && (url.includes('download') || url.includes('stream') || url.includes('player') || url.includes('get_file') || url.includes('embed') || url.includes('theporndude.com'))) {
                // System analytics ya external invalid trackers filter out karne ke liye boundary rules
                if (!url.includes('adscore') && !url.includes('clarity.ms') && !url.includes('i.clarity.ms')) {
                    links.push(url);
                }
            }
        }
        return [...new Set(links)]; 
    }

    /**
     * 7. RESOLVE DIRECT VIDEO URL
     * Intermediate layout aur cross-referenced dynamic configurations se execution-level paths nikalta hai.
     */
    async function resolveDirectVideoUrl(serverUrl) {
        try {
            const res = await http_get(serverUrl, {
                ...HEADERS,
                "Referer": "https://allpornstream.com"
            });
            if (res.status !== 200 || !res.body) return null;
            
            const subHtml = res.body;

            // const sourceMatch: HTML5 direct underlying hardware rendering layer check
            const sourceMatch = subHtml.match(/<source[^>]+src=["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
            if (sourceMatch) return sourceMatch[1];

            // const fileMatch: Internal runtime script engine/player variables check
            const fileMatch = subHtml.match(/["']?file["']?\s*:\s*["'](https?:\/\/[^"']+)["']/i);
            if (fileMatch) return fileMatch[1];

            // const directDownloadMatch: Explicitly labeled direct CDN endpoints target check
            const directDownloadMatch = subHtml.match(/<a[^>]+href=["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["'][^>]*>.*Download/i);
            if (directDownloadMatch) return directDownloadMatch[1];

            // const iframeMatch: Nested wrapper viewport frames target check
            const iframeMatch = subHtml.match(/<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/i);
            if (iframeMatch) return iframeMatch[1];

            return null;
        } catch (e) {
            console.error("Deep-linking resolution failed for: " + serverUrl, e);
            return null;
        }
    }

    /**
     * 8. LOAD STREAMS FUNCTION
     * Decoded operational nodes ko localized engine instance ke streams block me map karke pass karta hai.
     */
   async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            
            // Look for iframes with video sources
            const iframePattern = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
            let match;
            while ((match = iframePattern.exec(html)) !== null) {
                const iframeUrl = match[1];
                // Check if it looks like a video player
                if (iframeUrl.includes('player') || iframeUrl.includes('video') || iframeUrl.includes('embed') || iframeUrl.includes('.mp4') || iframeUrl.includes('.m3u8')) {
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(iframeUrl),
                        source: "Allstreampron ",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Also check for video tag with source
            if (streams.length === 0) {
                const videoPattern = /<video[^>]*>[\s\S]*?<source[^>]*src="([^"]+)"[^>]*>/gi;
                while ((match = videoPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(videoUrl),
                        source: "Video",
                        headers: { "Referer": url, 
                        "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Direct video file link
            if (streams.length === 0) {
                const directPattern = /href="([^"]+\.mp4)"[^>]*>/gi;
                while ((match = directPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(videoUrl),
                        source: "Direct",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
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


    // 9. EXPOSE METHODS TO GLOBAL SCOPE
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
