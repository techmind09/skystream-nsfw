/**
 * AllPornStream (allpornstream.com) Plugin for SkyStream
 * Source: https://allpornstream.com
 * Features: Categories, Studios, and Actors Section Mapping with Advanced Fail-Safe Fallbacks
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    // 1. HEADERS CONFIGURATION
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://allpornstream.com/"
    };

    /**
     * 2. PARSE VIDEO ITEMS FUNCTION
     * Responsive grid layout tags se link, image poster, aur title nikalta hai.
     */
    function parseVideoItems(html) {
        const items = [];
        const baseUrl = "https://allpornstream.com";
        
        // Target modern Next.js flexible HTML node layout matching your screenshot architecture
        const itemPattern = /<a[^>]+href=["']((?:https:\/\/allpornstream\.com)?\/[^"']+)["'][^>]*>[\s\S]*?<div[^>]*class="[^"]*poster-card[^"]*"[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]+alt=["']([^"']+)["']/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            let relativeUrl = match[1];
            const posterUrl = match[2];
            let title = match[3].trim();
            
            // Clean bracket patterns
            title = title.replace(/\[.*?\]/g, '').trim();
            
            // Normalize absolute URL reference pathing
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
     * Categories, Studios, aur Actors ko alag-alag segmented row blocks me distribute karta hai.
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://allpornstream.com";
            
            // Comprehensive target grid paths from screenshots mapping
            const contentRoutes = {
                // CATEGORIES
                "Category: Brunette": `${baseUrl}/categories/brunette`,
                "Category: Lesbians": `${baseUrl}/categories/lesbians`,
                "Category: Asian": `${baseUrl}/categories/asian`,
                "Category: POV": `${baseUrl}/categories/pov`,
                
                // STUDIOS
                "Studio: Brazzers": `${baseUrl}/studios/brazzers`,
                "Studio: Naughty America": `${baseUrl}/studios/naughty-america`,
                "Studio: Reality Kings": `${baseUrl}/studios/reality-kings`,
                "Studio: BangBros": `${baseUrl}/studios/bangbros`,
                
                // ACTORS
                "Actor: Lana Rhodes": `${baseUrl}/actors/lana-rhodes`,
                "Actor: Angela White": `${baseUrl}/actors/angela-white`,
                "Actor: Riley Reid": `${baseUrl}/actors/riley-reid`
            };
            
            const data = {};
            
            // Independent async stack to isolate blocks and bypass Cloudflare row drops safely
            for (const [sectionLabel, targetUrl] of Object.entries(contentRoutes)) {
                try {
                    const res = await http_get(targetUrl, HEADERS);
                    if (res && res.status === 200 && res.body) {
                        const parsedMovies = parseVideoItems(res.body);
                        if (parsedMovies && parsedMovies.length > 0) {
                            data[sectionLabel] = parsedMovies.slice(0, 20);
                        }
                    }
                } catch (rowError) {
                    console.error(`Bypassed timeout or parsing drop for row [${sectionLabel}]: ${rowError.message}`);
                }
            }
            
            // Core hard fallback implementation to prevent blank rows
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
            console.error("Critical dashboard breakdown inside getHome: " + globalError.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: globalError.message });
        }
    }

    /**
     * 4. SEARCH FUNCTION
     */
    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://allpornstream.com";
            const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
            const res = await http_get(searchUrl, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Search pipeline unreachable" });
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
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Target metadata parsing failed" });
            }
            
            const html = res.body || "";
            
            const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/<h3[^>]*>([^<]+)<\/h3>/);
            let title = titleMatch ? titleMatch[1].replace(/\s*-\s*AllPornStream.*$/i, '').trim() : "Unknown Video";
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
            console.error("load error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 6. EXTRACT SERVER LINKS HELPERS
     */
    function extractServerLinks(html) {
        const links = [];
        const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi;
        let match;
        
        while ((match = btnPattern.exec(html)) !== null) {
            const url = match[1];
            if (url && (url.includes('download') || url.includes('stream') || url.includes('player') || url.includes('embed') || url.includes('cdn'))) {
                if (!url.includes('clarity.ms') && !url.includes('adscore')) {
                    links.push(url);
                }
            }
        }
        return [...new Set(links)]; 
    }

    /**
     * 7. RESOLVE DIRECT VIDEO URL
     */
    async function resolveDirectVideoUrl(serverUrl) {
        try {
            const res = await http_get(serverUrl, {
                ...HEADERS,
                "Referer": "https://allpornstream.com/"
            });
            if (res.status !== 200 || !res.body) return null;
            
            const subHtml = res.body;

            const sourceMatch = subHtml.match(/<source[^>]+src=["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
            if (sourceMatch) return sourceMatch[1];

            const fileMatch = subHtml.match(/["']?file["']?\s*:\s*["'](https?:\/\/[^"']+)["']/i);
            if (fileMatch) return fileMatch[1];

            const directDownloadMatch = subHtml.match(/<a[^>]+href=["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["'][^>]*>.*Download/i);
            if (directDownloadMatch) return directDownloadMatch[1];

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
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch video page" });
            }
            
            const html = res.body || "";
            const intermediateLinks = extractServerLinks(html);
            
            if (intermediateLinks.length === 0) {
                return cb({ success: false, errorCode: "NO_STREAMS", message: "No operational servers found on this page" });
            }
            
            const finalizedStreams = [];
            
            for (let i = 0; i < Math.min(intermediateLinks.length, 5); i++) {
                const targetUrl = intermediateLinks[i];
                const directUrl = await resolveDirectVideoUrl(targetUrl);
                
                if (directUrl) {
                    finalizedStreams.push(new StreamResult({
                        url: directUrl,
                        source: `Premium Direct Node ${i + 1}`,
                        isHtml: directUrl.includes('iframe') || !directUrl.match(/\.(mp4|m3u8)/i), 
                        headers: {
                            "Referer": "https://allpornstream.com",
                            "User-Agent": HEADERS["User-Agent"]
                        }
                    }));
                }
            }
            
            if (finalizedStreams.length === 0) {
                return cb({ success: false, errorCode: "NO_STREAMS", message: "Direct media source decoding failed" });
            }
            
            cb({ success: true, data: finalizedStreams });
        } catch (e) {
            console.error("loadStreams deep-scan error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 9. EXPOSE METHODS TO GLOBAL SCOPE
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
