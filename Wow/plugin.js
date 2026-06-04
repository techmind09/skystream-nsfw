/**
 * WOW.XXX Plugin for SkyStream
 * Source: https://www.wow.xxx
 * Features: Latest Updates, Most Popular (Today/Week/All), Search, Video Streams
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
        "Referer": "https://www.wow.xxx/"
    };

    /**
     * Parse video items from HTML
     * @param {string} html - The HTML content
     * @returns {Array} Array of MultimediaItem objects
     */
    function parseVideoItems(html) {
        const items = [];
        // Match video items using regex patterns
        const itemPattern = /<div class="item">[\s\S]*?<a href="(https:\/\/www\.wow\.xxx\/videos\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[\s\S]*?<\/div>/g;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const url = match[1];
            const posterUrl = match[2];
            const title = match[3];
            
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
        
        // Fallback: try simpler pattern if first one doesn't match enough items
        if (items.length === 0) {
            const simplePattern = /<a href="(https:\/\/www\.wow\.xxx\/videos\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/g;
            while ((match = simplePattern.exec(html)) !== null) {
                const url = match[1];
                const posterUrl = match[2];
                const title = match[3];
                
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
        }
        
        return items;
    }

    /**
     * Get homepage content with menu categories
     * @param {Function} cb - Callback function
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://www.wow.xxx";
            
            // Define the menu categories as requested
            const categories = {
                "Latest Updates": `${baseUrl}/latest-updates/`,
                "Most Popular Today": `${baseUrl}/most-popular/today/`,
                "Most Popular Week": `${baseUrl}/most-popular/week/`,
                "Most Popular All": `${baseUrl}/most-popular/all/`
            };
            
            const data = {};
            
            // Fetch each category
            for (const [categoryName, url] of Object.entries(categories)) {
                try {
                    const res = await http_get(url, HEADERS);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) {
                            data[categoryName] = items.slice(0, 20); // Limit to 20 items per category
                        }
                    }
                } catch (e) {
                    console.error(`Error fetching ${categoryName}: ${e.message}`);
                }
            }
            
            // If no data was fetched, try the main page
            if (Object.keys(data).length === 0) {
                const res = await http_get(baseUrl, HEADERS);
                if (res.status === 200 && res.body) {
                    data["Latest"] = parseVideoItems(res.body).slice(0, 20);
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
            const baseUrl = manifest.baseUrl || "https://www.wow.xxx";
            const searchUrl = `${baseUrl}/search/${encodeURIComponent(query)}/relevance/`;
            
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
            
            // Extract title
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*WOW\.XXX$/, '').trim() : "Unknown";
            
            // Extract poster
            const posterMatch = html.match(/poster='([^']+)'/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            // Create episode with the video page URL
            // When user clicks this episode, loadStreams will be called with this URL
            const episode = new Episode({
                name: "Play Video",
                url: url,  // This URL will be passed to loadStreams
                season: 1,
                episode: 1,
                posterUrl: posterUrl
            });
            
            // Create MultimediaItem with episodes array
            const item = new MultimediaItem({
                title: title,
                url: url,
                posterUrl: posterUrl,
                type: "movie",
                isAdult: true,
                episodes: [episode]  // THIS IS REQUIRED FOR PLAY BUTTON TO APPEAR
            });
            
            cb({ success: true, data: item });
        } catch (e) {
            console.error("load error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * Parse video stream URLs from video page HTML
     * @param {string} html - The HTML content of video page
     * @returns {Array} Array of objects with url and quality
     */
    function parseVideoStreams(html) {
        const streams = [];
        
        // Match source tags with their qualities
        const sourcePattern = /<source\s+src=['"](https:\/\/www\.wow\.xxx\/get_file\/[^'"]+)['"][^>]*label=['"]([\w\d]+p?)['"][^>]*>/gi;
        
        let match;
        while ((match = sourcePattern.exec(html)) !== null) {
            const url = match[1];
            const quality = match[2];
            
            if (url && quality) {
                streams.push({ url, quality });
            }
        }
        
        return streams;
    }

    /**
     * Load video streams (playable URLs)
     * @param {string} url - Video page URL (from Episode.url)
     * @param {Function} cb - Callback function
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch video page" });
            }
            
            const html = res.body || "";
            const rawStreams = parseVideoStreams(html);
            
            if (rawStreams.length === 0) {
                return cb({ success: false, errorCode: "NO_STREAMS", message: "No video streams found" });
            }
            
            // Convert to StreamResult objects with Magic Proxy for redirects
            const streams = rawStreams.map(stream => {
                // Use Magic Proxy v1 to handle 302 redirects
                // Format: MAGIC_PROXY_v1 + base64(url)
                const base64Url = btoa(stream.url);
                const proxyUrl = "MAGIC_PROXY_v1" + base64Url;
                const source1 = { url: "https://voe.sx/xyz123" };
                const source2 = { url: "https://streamtape.com/e/abc456" };
                console.log(generateProxyLink(source1)); // Output: MAGIC_PROXY_v1aHR0cHM6Ly92b2Uuc3gveHl6MTIz
                console.log(generateProxyLink(source2)); // Output: MAGIC_PROXY_v1aHR0cHM6Ly9zdHJlYW10YXBlLmNvbS9lL2FiYzQ1Ng==
                
                return new StreamResult({
                    url: proxyUrl,
                    source: stream.quality,  // Use 'source' not 'quality' for display
                    headers: {
                        "Referer": "https://www.wow.xxx/",
                        "User-Agent": HEADERS["User-Agent"]
                    }
                });
            });
            
            cb({ success: true, data: streams });
        } catch (e) {
            console.error("loadStreams error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // Export functions to SkyStream
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
