(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://beeg24.org/"
    };

    function parseVideoItems(html) {
        const items = [];
        // Fixed regex to match the item container from your screenshots
        const itemPattern = /<div class="small">[\s\S]*?<a href="([^"]+)"[^>]*>[\s\S]*?<img src="([^"]+)" alt="([^"]+)"[^>]*>/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const href = match[1];
            const posterSrc = match[2];
            const altText = match[3];
            
            const title = altText.split('(')[0].trim();
            const baseUrl = "https://beeg24.org";
            const fullUrl = href.startsWith('http') ? href : baseUrl + href;
            const posterUrl = posterSrc.startsWith('http') ? posterSrc : baseUrl + posterSrc;
            
            if (title && href) {
                items.push(new MultimediaItem({
                    title: title,
                    url: fullUrl,
                    posterUrl: posterUrl,
                    type: "movie",
                    isAdult: true
                }));
            }
        }
        return items;
    }

    async function getHome(cb) {
        try {
            const baseUrl = "https://beeg24.org";
            const categories = {
                "Home": `${baseUrl}`, 
                "Most Viewed": `${baseUrl}/top-50-most-viewed-videos.html`,
                "Top Rated": `${baseUrl}/top-porn-videos.html`
            };
            
            const data = {};
            for (const [name, url] of Object.entries(categories)) {
                try {
                    const res = await http_get(url, HEADERS);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) data[name] = items.slice(0, 20);
                    }
                } catch (e) {
                    console.error(`Error fetching ${name}: ${e.message}`);
                }
            }
            cb({ success: true, data });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            
            // Fixed Title Extraction
            let title = "Unknown";
            let titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || html.match(/<title>(.*?)<\/title>/i);
            if (titleMatch) title = titleMatch[1].trim();
            
            // Fixed Poster Match (Corrected key property name)
            let poster = "";
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
            if (posterMatch) poster = posterMatch[1];
            
            // Fixed Description Match
            let description = "";
            const descMatch = html.match(/<p>([\s\S]*?)<\/p>/i);
            if (descMatch) description = descMatch[1].replace(/<[^>]+>/g, '').trim();
            
            // Duration Logic
            let duration = null;
            const durMatch = html.match(/<i class="la la-play"[^>]*><\/i>\s*([\d:]+)/i);
            if (durMatch) {
                const parts = durMatch[1].split(':');
                if (parts.length === 2) duration = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
            }
            
            cb({
                success: true,
                data: new MultimediaItem({
                    title, url, posterUrl: poster, type: "movie", isAdult: true,
                    description, duration: duration ? { length: duration, format: "minutes" } : undefined
                })
            });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // LoadStreams aur baki functions ko isi tarah keep karein.
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
