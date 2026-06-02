(function () {
    const HEADERS = {
        "User-Agent": " Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://xmoviesforyou.com/"
    };

    // Based on REAL HTML: <div class="item"><a href="URL" class="item-link"><img src="SRC" alt="TITLE">
    function parseVideoItems(html) {
        const items = [];
        const itemPattern = /<div class="flex items"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*class="flex items"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[^>]*>/gi;

          let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const href = match[1];
            const posterSrc = match[2];
            const altText = match[3];
            
            const title = altText.split('(')[0].trim();
            const fullUrl = href.startsWith('http') ? href : (manifest.baseUrl || "https://xmoviesforyou.com/") + href;
            const posterUrl = posterSrc.startsWith('http') ? posterSrc : (manifest.baseUrl || "https://xmoviesforyou.com/") + posterSrc;
             
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
            const baseUrl = "https://xmoviesforyou.com/";
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
            
            // Look for iframes with video sources
            const iframePattern = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
            let match;
            while ((match = iframePattern.exec(html)) !== null) {
                const iframeUrl = match[1];
                // Check if it looks like a video player
                if (iframeUrl.includes('player') || iframeUrl.includes('video') || iframeUrl.includes('embed') || iframeUrl.includes('.mp4') || iframeUrl.includes('.m3u8')) {
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(iframeUrl),
                        source: "Xmoviesforyou",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Also check for video tag with source
            if (streams.length === 0) {
                const videoPattern = /<video[^>]*>[\s\S]*?<source[^>]*src="([^"]+)"[^>]*>/gi;
                while ((match = videoPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(videoUrl),
                        source: "Video",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Direct video file link
            if (streams.length === 0) {
                const directPattern = /href="([^"]+\.mp4)"[^>]*>/gi;
                while ((match = directPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(videoUrl),
                        source: "Direct",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
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
    globalThis.search = search; //
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
