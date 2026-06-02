import { MixDrop, StreamTape, FileMoon, DoodStream } from 'skystream-extractors';

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
            "Anal": `${baseUrl}/tags/anal/`,
            "Amateur": `${baseUrl}/tags/amateur/`,
            "Anal Creampie": `${baseUrl}/tags/anal-creampie/`,
            "Bathroom": `${baseUrl}/tags/bathroom/`,
            "Big Dick": `${baseUrl}/tags/big-dick/`,
            "Big Tits": `${baseUrl}/tags/big-tits/`,
            "Beautiful Girl": `${baseUrl}/tags/beautiful-girl/`,
            "Beautiful porn": `${baseUrl}/tags/beautiful-porn/`,
            "Brunette": `${baseUrl}/tags/brunette/`,
            "Blonde": `${baseUrl}/tags/blonde/`,
            "Creampie": `${baseUrl}/tags/creampie/`,
            "Cuckold": `${baseUrl}/tags/cuckold/`,
            "Cumshot": `${baseUrl}/tags/cumshot/`,
            "Female Orgasm": `${baseUrl}/tags/female-orgasm/`,
            "Handjob": `${baseUrl}/tags/handjob/`,
            "High Heels": `${baseUrl}/tags/high-heels/`,
            "Interracial": `${baseUrl}/tags/interracial/`,
            "Juicy Ass": `${baseUrl}/tags/juicy-ass/`,
            "Kitchen": `${baseUrl}/tags/kitchen/`,
            "Lesbian": `${baseUrl}/tags/lesbian/`,
            "Masturbation": `${baseUrl}/tags/masturbation/`,
            "Mom": `${baseUrl}/tags/mom/`,
            "Milf": `${baseUrl}/tags/milf/`,
            "Office": `${baseUrl}/tags/office/`,
            "POV": `${baseUrl}/tags/pov/`,
            "Red Head": `${baseUrl}/tags/red-head/`,
            "Russian": `${baseUrl}/tags/russian/`,
            "Small Tits": `${baseUrl}/tags/small-tits/`,
            "Stockings": `${baseUrl}/tags/stockings/`,
            "Story": `${baseUrl}/tags/story/`,
            "Teacher": `${baseUrl}/tags/teacher/`,
            "Threesome": `${baseUrl}/tags/threesome/`,
            "Young Girl": `${baseUrl}/tags/young-girl/`
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
    import { MixDrop, StreamTape } from 'skystream-extractors';

    async function loadStreams(url, cb) {
    // 1. Scrape your site to find the embedded video host URL
    const videoHostUrl = await scrapeEmbedUrl(url); 
    let streams = [];

    // 2. Identify the host and pass it to the correct extractor class
    try {
        if (videoHostUrl.includes('mixdrop.co')) {
            const extractor = new MixDrop();
            streams = await extractor.getUrl(videoHostUrl);
        } else if (videoHostUrl.includes('streamtape.com')) {
            const extractor = new StreamTape();
            streams = await extractor.getUrl(videoHostUrl);
        }
        
        // streams is an array of IExtractorLink / StreamResult objects
        if (streams.length > 0) {
            return cb({ success: true, data: streams });
        }
    } catch (e) {
        console.error("Extractor failed: ", e);
    }
    
    cb({ success: true, data: [] });
}

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
