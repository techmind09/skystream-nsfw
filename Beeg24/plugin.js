(function () {

    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://beeg24.org"
    };

    // Real HTML Parser: HTML content se video cards nikalne ke liye
    function parseVideoItems(html) {
        const items = [];
        const itemPattern = /<div\s+class="[^"]*small-ins[^"]*"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>[\s\S]*?<img\s+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const href = match[1];
            const posterSrc = match[2];
            const altText = match[3];
            const pTitle = match[4];

            let title = (pTitle || altText || "").replace(/<[^>]+>/g, '').trim();
            if (!title) continue;

            const baseUrl = manifest.baseUrl || "https://beeg24.org";
            const fullUrl = href.startsWith('http') ? href : baseUrl + (href.startsWith('/') ? '' : '/') + href;
            const posterUrl = posterSrc.startsWith('http') ? posterSrc : baseUrl + (posterSrc.startsWith('/') ? '' : '/') + posterSrc;
            
            items.push(new MultimediaItem({
                title: title,
                url: fullUrl,
                posterUrl: posterUrl,
                type: "movie",
                isAdult: true
            }));
        }
        return items;
    }

    // SkyStream multi-row categories display function
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://beeg24.org";
            
            // "Best 50" (top-50-most-viewed-videos.html) aur baki image ki categories yahan mapping me set hain
            const categoryMapping = {
                "Latest Releases": baseUrl, 
                "Top 50 Most Viewed": `${baseUrl}/top-50-most-viewed-videos.html`, 
                "Amateur Collection": `${baseUrl}/category/amateur/`,
                "Anal Videos": `${baseUrl}/category/anal/`,
                "Lesbian Selection": `${baseUrl}/category/lesbian/`,
                "Premium & Quality": `${baseUrl}/category/premium-porn/`
            };
            
            const data = {};
            
            // Loop jo har category URL ko hit karke uske alag items load karega
            for (const [rowName, targetUrl] of Object.entries(categoryMapping)) {
                try {
                    const res = await http_get(targetUrl, HEADERS);
                    if (res.status === 200 && res.body) {
                        const parsedItems = parseVideoItems(res.body);
                        
                        if (parsedItems.length > 0) {
                            // Top 50 wali row me pure 50 videos dikhane ke liye condition lagayi hai
                            if (rowName === "Top 50 Most Viewed") {
                                data[rowName] = parsedItems.slice(0, 50);
                            } else {
                                data[rowName] = parsedItems.slice(0, 20); // Normal rows me 20 videos
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Error loading row [${rowName}]: ${e.message}`);
                }
            }
            
            cb({ success: true, data });
            
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://beeg24.org";
            const searchUrl = `${baseUrl}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}`;
            const res = await http_get(searchUrl, HEADERS);
            
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            let title = "Unknown Title";
            
            let titleMatch = html.match(/<h1[^>]*>[\s\S]*?<\/i>([\s\S]*?)<\/h1>/i);
            if (!titleMatch) titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
            
            let poster = "";
            const posterMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
            if (posterMatch) poster = posterMatch[1];
            
            let description = "";
            const descMatch = html.match(/<div\s+class="f-desc"[^>]*>([\s\S]*?)<\/div>/i);
            if (descMatch) description = descMatch[1].replace(/<[^>]+>/g, '').trim();
            
            const tags = [];
            const tagPattern = /<a[^>]*href="[^"]*xfsearch[^"]*"[^>]*>([^<]+)<\/a>/gi;
            let tagMatch;
            while ((tagMatch = tagPattern.exec(html)) !== null) {
                tags.push(tagMatch[1].trim());
            }
            
            const episode = new Episode({
                name: "Play Video",
                url: url,
                season: 1,
                episode: 1,
                posterUrl: poster
            });
            
            cb({
                success: true,
                data: new MultimediaItem({
                    title, url, posterUrl: poster, type: "movie", isAdult: true,
                    description, tags, episodes: [episode]
                })
            });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            let match;
            
            const iframePattern = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
            while ((match = iframePattern.exec(html)) !== null) {
                const iframeUrl = match[1];
                if (/player|video|embed|\.mp4|\.m3u8/i.test(iframeUrl)) {
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(iframeUrl),
                        source: "Beeg24 Player",
                        headers: { "Referer": "https://beeg24.org", "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            if (streams.length === 0) {
                const videoPattern = /<video[^>]*>[\s\S]*?<source[^>]*src="([^"]+)"[^>]*>/gi;
                while ((match = videoPattern.exec(html)) !== null) {
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(match[1]),
                        source: "Native Player",
                        headers: { "Referer": "https://beeg24.org", "User-Agent": HEADERS["User-Agent"] }
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

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;

})();
