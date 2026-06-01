(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15; Infinix X6851 Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/148.0.7778.178 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://xmoviesforyou.com/"
    };

    function parseVideoItems(html) {
        const items = [];
        const itemPattern = /<a[^>]*href="([^"]+)"[^>]*class="flex-none[^>]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/gi;
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            items.push({
                link: match[1],
                image: match[2],
                title: match[3] || "No Title"
            });
        }
        return items;
    }

    async function getHome(cb) {
        try {
            const baseUrl = "https://xmoviesforyou.com/";
            const categories = {
                "Home": baseUrl,
                "Most Viewed": "https://xmoviesforyou.com/most-viewed",
                "Latest": "https://xmoviesforyou.com/latest"
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

    // ... baaki functions (search, load, loadStreams) aapke waise hi rahenge
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
