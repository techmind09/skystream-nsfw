/**
 * Xprimehub.hair Plugin for SkyStream
 * Source: https://xprimehub.hair
 * Features: Latest Updates, Categorized Navigation, Search, Deep-Link Video Stream Resolver
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://xprimehub.hair/"
    };

    /**
     * Parse video items from HTML using the exact image DOM structure
     * @param {string} html - The HTML content
     * @returns {Array} Array of MultimediaItem objects
     */
    function parseVideoItems(html) {
        const items = [];
        const itemPattern = /<a href="(https:\/\/xprimehub\.hair\/[^"]+-download\/)"[^>]*>[^]*?<div class="poster-card">[^]*?<img src="([^"]+)" alt="([^"]+)"/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const url = match[1];
            const posterUrl = match[2];
            const title = match[3].trim();
            
            if (url && posterUrl && title) {
                items.push(new MultimediaItem({
                    title: title,
                    url: url,
                    posterUrl: posterUrl,
                    type: "movie",
                    isAdult: true
                }));
            }
        }
        
        return items;
    }

    /**
     * Get homepage content with menu categories
     * @param {Function} cb - Callback function
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xprimehub.hair";
            const categories = {
                "Latest Releases": `${baseUrl}/`,
                "Hindi Dubbed": `${baseUrl}/hindi-dubbed/`,
                "Brazzers": `${baseUrl}/by-genres/brazzers/`,
                "OnlyFans": `${baseUrl}/onlyfans/`,
                "HotX Originals": `${baseUrl}/hotx-originals/`,
                "Kooku": `${baseUrl}/kooku/`,
                "Ullu Originals": `${baseUrl}/ullu-originals/`,
                "Dual Audio": `${baseUrl}/dual-audio/`,
                "Sexmex": `${baseUrl}/sexmex/`,
                "NiksIndian": `${baseUrl}/niksindian/`
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
     * Search for videos
     * @param {string} query - Search query
     * @param {Function} cb - Callback function
     */
    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xprimehub.hair";
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
     * Load video details - MUST return MultimediaItem with episodes array
     * @param {string} url - Video page URL
     * @param {Function} cb - Callback function
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch video page" });
            }
            
            const html = res.body || "";
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*XprimeHub.*$/i, '').trim() : "Unknown Movie";
            
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/) || html.match(/src="([^"]+\.(?:jpg|jpeg|png))"/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            const episode = new Episode({
                name: "Play Movie",
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
     * Extract primary download/gateway server URLs from post content
     * @param {string} html - Movie post page HTML
     * @returns {Array} List of target server page links
     */
    function extractServerLinks(html) {
        const links = [];
        const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi;
        let match;
        
        while ((match = btnPattern.exec(html)) !== null) {
            const url = match[1];
            if (url && (url.includes('download') || url.includes('stream') || url.includes('player') || url.includes('get_file'))) {
                // Ignore self-referencing loops or tracking services
                if (!url.includes('xprimehub.hair/?') && !url.includes('adscore')) {
                    links.push(url);
                }
            }
        }
        return [...new Set(links)]; // Remove duplicates
    }

    /**
     * Resolves the actual underlying direct streaming video file (.mp4/.m3u8) from the target landing page
     * @param {string} serverUrl - Intermediate page URL
     * @returns {string|null} Resolved direct playable URL
     */
    async function resolveDirectVideoUrl(serverUrl) {
        try {
            const res = await http_get(serverUrl, {
                ...HEADERS,
                "Referer": "https://xprimehub.hair/"
            });
            if (res.status !== 200 || !res.body) return null;
            
            const subHtml = res.body;

            // Deep Scan Pattern 1: Look for direct video tag sources inside the secondary page
            const sourceMatch = subHtml.match(/<source[^>]+src=["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
            if (sourceMatch) return sourceMatch[1];

            // Deep Scan Pattern 2: Look for script-packed player configurations (JWPlayer/VideoJS style configs)
            const fileMatch = subHtml.match(/["']?file["']?\s*:\s*["'](https?:\/\/[^"']+)["']/i);
            if (fileMatch) return fileMatch[1];

            // Deep Scan Pattern 3: Look for any explicit high-speed CDN direct download link
            const directDownloadMatch = subHtml.match(/<a[^>]+href=["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["'][^>]*>.*Download/i);
            if (directDownloadMatch) return directDownloadMatch[1];

            // Deep Scan Pattern 4: If an iframe player exists on this subpage, pull it out
            const iframeMatch = subHtml.match(/<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/i);
            if (iframeMatch) return iframeMatch[1];

            return null;
        } catch (e) {
            console.error("Deep-linking resolution failed for: " + serverUrl, e);
            return null;
        }
    }

    /**
     * Deep-links resolver for loading actual stable native video sources
     * @param {string} url - Video page URL
     * @param {Function} cb - Callback function
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
            
            // Loop through extracted server pages and resolve their hidden direct stream paths
            for (let i = 0; i < Math.min(intermediateLinks.length, 5); i++) {
                const targetUrl = intermediateLinks[i];
                const directUrl = await resolveDirectVideoUrl(targetUrl);
                
                // If a direct streaming target asset was successfully decoded, register it
                if (directUrl) {
                    finalizedStreams.push(new StreamResult({
                        url: directUrl,
                        source: `Premium Direct Server ${i + 1}`,
                        isHtml: directUrl.includes('iframe') || !directUrl.match(/\.(mp4|m3u8)/i), 
                        headers: {
                            "Referer": targetUrl,
                            "User-Agent": HEADERS["User-Agent"]
                        }
                    }));
                }
            }
            
            if (finalizedStreams.length === 0) {
                return cb({ success: false, errorCode: "NO_STREAMS", message: "Servers present but direct media assets could not be extracted" });
            }
            
            cb({ success: true, data: finalizedStreams });
        } catch (e) {
            console.error("loadStreams deep-scan error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
