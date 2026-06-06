/**
 * WOW.XXX Plugin for SkyStream (Optimized for Fast Loading)
 * Source: https://www.wow.xxx
 * Features: Latest Updates, Most Popular, Dynamic Categories from Images, Search, Video Streams
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
     * Get homepage content - FAST PARALLEL LOADING UPGRADE
     * @param {Function} cb - Callback function
     */
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://www.wow.xxx";
            
            // Homepage par loading speed badhane ke liye hum sirf main categories ko parallelly load karenge
            const categories = {
                "Latest Updates": `${baseUrl}/latest-updates/`,
                "Most Popular Today": `${baseUrl}/most-popular/today/`,
                "Most Popular Week": `${baseUrl}/most-popular/week/`,
                "Most Popular All": `${baseUrl}/most-popular/all/`,
                "Anal": `${baseUrl}/category/anal/`,
                "Amateur": `${baseUrl}/category/amateur/`,
                "Milf": `${baseUrl}/category/milf/`,
                "Lesbian": `${baseUrl}/category/lesbian/`
            };
            
            const data = {};
            const entries = Object.entries(categories);

            // Promise.all ka use karke saare network requests ek sath (Parallel) bhej rahe hain
            await Promise.all(entries.map(async ([categoryName, url]) => {
                try {
                    const res = await http_get(url, HEADERS);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) {
                            data[categoryName] = items.slice(0, 20); // Limit to 20 items
                        }
                    }
                } catch (e) {
                    console.error(`Error fetching ${categoryName}: ${e.message}`);
                }
            }));
            
            // Fallback: Agar parallel request me kuch na mile, to main page load karein
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
     * Load video details
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch video page" });
            }
            
            const html = res.body || "";
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*WOW\.XXX$/, '').trim() : "Unknown";
            
            const posterMatch = html.match(/poster='([^']+)'/);
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
     * Parse video stream URLs
     */
    function parseVideoStreams(html) {
        const streams = [];
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
     * Load video streams - FAST STREAM UPGRADE (Bypasses slow proxy if needed)
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
            
            // Server dynamic response aur speed badhane ke liye stream object array mapping
            const streams = rawStreams.map(stream => {
                const base64Url = btoa(stream.url);
                const proxyUrl = "MAGIC_PROXY_v1" + base64Url;
                
                return new StreamResult({
                    url: proxyUrl, // Agar Magic Proxy slow lagta hai, to direct `stream.url` use kar sakte hain
                    source: stream.quality + " (Fast Server)",  
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
