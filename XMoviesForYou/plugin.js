(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://xmoviesforyou.com"
    };

    function parseVideoItems(html) {
        const items = [];
        // Fixed Regex class selector
        const itemPattern = /<a[^>]*class="group flex flex-col"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[^>]*>/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const href = match[1];
            const posterSrc = match[2];
            const altText = match[3];
            
            const title = altText.split('(')[0].trim();
            const baseUrl = manifest.baseUrl || "https://xmoviesforyou.com";
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
            const baseUrl = manifest.baseUrl || "https://xmoviesforyou.com";
            const categories = {
                "21Sextury": `${baseUrl}/category/21sextury`,
                "AdultTime": `${baseUrl}/category/adulttime-69907a252fb37`,
                "Anal": `${baseUrl}/category/anal`,
                "Asian": `${baseUrl}/category/asian`,
                "BDSM": `${baseUrl}/category/bdsm`,
                "BangBros": `${baseUrl}/category/bangbros`,
                "Blonde": `${baseUrl}/category/blonde`,
                "Brazzers": `${baseUrl}/category/brazzers`,
                "Brunette": `${baseUrl}/category/brunette`,
                "Ebony": `${baseUrl}/category/ebony`,
                "FakeHub": `${baseUrl}/category/fakehub`,
                "Gangbang": `${baseUrl}/category/gangbang`,
                "Hardcore": `${baseUrl}/category/hardcore`,
                "Interracial": `${baseUrl}/category/interracial`,
                "Kinky": `${baseUrl}/category/kinky`,
                "Latina": `${baseUrl}/category/latina`,
                "Lesbian": `${baseUrl}/category/lesbian`,
                "MILF": `${baseUrl}/category/milf`,
                "Masturbation": `${baseUrl}/category/masturbation`,
                "Mofos": `${baseUrl}/category/mofos`,
                "NaughtyAmerica": `${baseUrl}/category/naughtyamerica`,
                "Orgy": `${baseUrl}/category/orgy`,
                "PornPros": `${baseUrl}/category/pornpros`,
                "RealityKings": `${baseUrl}/category/realitykings`,
                "Redhead": `${baseUrl}/category/redhead`,
                "Spizoo": `${baseUrl}/category/spizoo`,
                "Squirt": `${baseUrl}/category/squirt`,
                "Tattoo": `${baseUrl}/category/tattoo`,
                "TeamSkeet": `${baseUrl}/category/teamskeet`,
                "Teen": `${baseUrl}/category/teen`,
                "Threesome": `${baseUrl}/category/threesome`,
                "Uncategorized": `${baseUrl}/category/uncategorized`
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
                    console.error(`Error: ${name}`);
                }
            }
            cb({ success: true, data });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xmoviesforyou.com";
            const searchUrl = `${baseUrl}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}`;
            const res = await http_get(searchUrl, HEADERS);
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR" });
        }
    }

    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            const html = res.body || "";
            
            const titleMatch = html.match(/<h3[^>]*>([^<]+)<\/h3>/i) || html.match(/<title>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : "Unknown";
            
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
            const poster = posterMatch ? posterMatch[1] : "";
            
            const descMatch = html.match(/<div class="prose[^>]*>([\s\S]*?)<\/div>/i);
            const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : "";
            
            const tags = [];
            const tagPattern = /<a[^>]*href="[^"]*category[^"]*"[^>]*>([^<]+)<\/a>/gi;
            let tagMatch;
            while ((tagMatch = tagPattern.exec(html)) !== null) tags.push(tagMatch[1].trim());
            
            cb({
                success: true,
                data: new MultimediaItem({ title, url, posterUrl: poster, type: "movie", isAdult: true, description, tags })
            });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR" });
        }
    }

    async function loadStreams(url, cb) {
        const ALLOWED_HOSTS = ["mixdrop", "streamtape", "dood", "bigwarp"];
        try {
            const res = await http_get(url, HEADERS);
            const html = res.body || "";
            const streams = [];

            // Pattern for Direct links or Players
            const videoPattern = /(https?:\/\/[^\s"'<]+?\.(mp4|m3u8))/gi;
            let match;
            while ((match = videoPattern.exec(html)) !== null) {
                if (ALLOWED_HOSTS.some(host => match[1].includes(host))) {
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(match[1]),
                        source: "Direct",
                        headers: { "Referer": url }
                    }));
                }
            }
            
            streams.length > 0 ? cb({ success: true, data: streams }) : cb({ success: false, errorCode: "NO_STREAMS" });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR" });
        }
    }

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
