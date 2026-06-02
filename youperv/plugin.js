(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://youperv.com/"
    };

    // Based on REAL HTML: <div class="item"><a href="URL" class="item-link"><img src="SRC" alt="TITLE">
    function parseVideoItems(html) {
        const items = [];
        const itemPattern = /<div class="item"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*class="item-link"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[^>]*>/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const href = match[1];
            const posterSrc = match[2];
            const altText = match[3];
            
            const title = altText.split('(')[0].trim();
            const fullUrl = href.startsWith('http') ? href : (manifest.baseUrl || "https://youperv.com") + href;
            const posterUrl = posterSrc.startsWith('http') ? posterSrc : (manifest.baseUrl || "https://youperv.com") + posterSrc;
            
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
            const baseUrl = manifest.baseUrl || "https://youperv.com";
            const categories = {
                  "Home": baseUrl,
            "Most Viewed 30 Day": `${baseUrl}/most-viewed/`,
            "Top Rated 30 Day": `${baseUrl}/top-rated/`,
            "Brunette": `${baseUrl}/tags/brunette/`,
            "Blonde": `${baseUrl}/tags/blonde/`,
            "Teen": `${baseUrl}/tags/teen/`,
            "MILF": `${baseUrl}/tags/milf/`,
            "Threesome": `${baseUrl}/tags/threesome/`,
            "Interracial": `${baseUrl}/tags/interracial/`,
            "Redhead": `${baseUrl}/tags/redhead/`,
            "Anal": `${baseUrl}/tags/anal/`,
            "Lesbian": `${baseUrl}/tags/lesbian/`,
            "Asian": `${baseUrl}/tags/asian/`,
            "Latina": `${baseUrl}/tags/latina/`,
            "Tattoo": `${baseUrl}/tags/tattoo/`,
            "Orgy": `${baseUrl}/tags/orgy/`,
            "BangBros": `${baseUrl}/tags/bangbros/`,
            "NaughtyAmerica": `${baseUrl}/tags/naughtyamerica/`,
            "Ebony": `${baseUrl}/tags/ebony/`,
            "TeamSkeet": `${baseUrl}/tags/teamskeet/`,
            "Brazzers": `${baseUrl}/tags/brazzers/`,
            "Gangbang": `${baseUrl}/tags/gangbang/`,
            "BDSM": `${baseUrl}/tags/bdsm/`,
            "RealityKings": `${baseUrl}/tags/realitykings/`,
            "21Sextury": `${baseUrl}/tags/21sextury/`,
            "Squirt": `${baseUrl}/tags/squirt/`,
            "Mofos": `${baseUrl}/tags/mofos/`,
            "Hardcore": `${baseUrl}/tags/hardcore/`,
            "Masturbation": `${baseUrl}/tags/masturbation/`,
            "Kinky": `${baseUrl}/tags/kinky/`,
            "PornPros": `${baseUrl}/tags/pornpros/`,
            "Spizoo": `${baseUrl}/tags/spizoo/`
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

    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://youperv.com";
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
            
            // Try multiple patterns for title
            let title = "Unknown";
            
            // Pattern 1: <h1 class="video-title">TITLE</h1>
            let titleMatch = html.match(/<h1[^>]*class="[^"]*video-title[^"]*"[^>]*>([^<]+)<\/h1>/i);
            if (!titleMatch) {
                // Pattern 2: <h1>TITLE</h1> 
                titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            }
            if (!titleMatch) {
                // Pattern 3: <title>TITLE</title>
                titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            }
            if (titleMatch) title = titleMatch[1].trim();
            
            // Get poster from meta og:image
            let poster = "";
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
            if (posterMatch) poster = posterMatch[1];
            
            // Get description
            let description = "";
            const descMatch = html.match(/<div class="f-desc"[^>]*>([\s\S]*?)<\/div>/i);
            if (descMatch) description = descMatch[1].replace(/<[^>]+>/g, '').trim();
            
            // Get tags
            const tags = [];
            const tagPattern = /<a[^>]*href="[^"]*xfsearch[^"]*"[^>]*>([^<]+)<\/a>/gi;
            let tagMatch;
            while ((tagMatch = tagPattern.exec(html)) !== null) {
                tags.push(tagMatch[1].trim());
            }
            
            // Get duration from span that contains clock icon
            let duration = null;
            const durationMatch1 = html.match(/<span[^>]*class="[^"]*duration[^"]*"[^>]*>([^<]+)<\/span>/i);
            const durationMatch2 = html.match(/<i[^>]*class="[^"]*fa-clock-o[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i);
            const durationMatch = durationMatch1 || durationMatch2;
            if (durationMatch) {
                const text = durationMatch[1].trim();
                if (text.includes(':')) {
                    const parts = text.split(':');
                    if (parts.length === 2) {
                        duration = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
                    }
                }
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
                    description, tags, duration: duration ? { length: duration, format: "minutes" } : undefined,
                    episodes: [episode]
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
        
        // Regex jo HTML me se saare URLs ko nikalega
        const urlPattern = /(?:https?:)?\/\/[^\s"'><]+/gi;
        let match;
        
        while ((match = urlPattern.exec(html)) !== null) {
            let foundUrl = match[0];
            
            // Relative URL ko absolute URL me convert karna
            if (foundUrl.startsWith('//')) {
                foundUrl = "https:" + foundUrl;
            }

            let sourceName = "";
            
            // 1. Check for Streamtape
            if (foundUrl.includes("streamtape.com") || foundUrl.includes("stape.")) {
                sourceName = "Streamtape";
            }
            // 2. Check for VOE
            else if (foundUrl.includes("voe.sx") || foundUrl.includes("voe-player")) {
                sourceName = "VOE";
            }

            // Agar Streamtape ya VOE me se koi match milta hai
            if (sourceName !== "") {
                // Duplicate check taaki same server baar-baar add na ho
                const isDuplicate = streams.some(s => s.url.includes(btoa(foundUrl)));
                
                if (!isDuplicate) {
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(foundUrl),
                        source: sourceName,
                        headers: { 
                            "Referer": url, 
                            "User-Agent": HEADERS["User-Agent"] 
                        }
                    }));
                }
            }
        }
        
        // Callback Response Handle karna
        if (streams.length > 0) {
            cb({ success: true, data: streams });
        } else {
            cb({ success: false, errorCode: "NO_STREAMS", message: "No Streamtape or VOE streams found." });
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


