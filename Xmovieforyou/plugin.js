(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15; Infinix X6851 Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/148.0.7778.178 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://xmoviesforyou.com/"
          'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    };

    function parseVideoItems(html) {
        const items = [];
        // Updated Regex for safety

        const itemPattern = /<div class="flex items-center gap-3 md:gap-4"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[^>]*>/


        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const href = match[1];
            const posterSrc = match[2];
            const altText = match[3];
            
            const title = altText.split('(')[0].trim();
            const fullUrl = href.startsWith('http') ? href : "https://xmoviesforyou.com/" + href;
            const posterUrl = posterSrc.startsWith('http') ? posterSrc : "https://xmoviesforyou.com/" + posterSrc;
             
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
            const baseUrl = "https://xmoviesforyou.com";
            
            // Timeout se bachne ke liye sirf main categories rakhi hain
            const categories = {
                "Home": baseUrl + "/",
                "Most Viewed": `${baseUrl}/most-viewed/`,
                "Top Rated": `${baseUrl}/top-rated/`,
                "Teen": `${baseUrl}/tags/teen/`,
                "MILF": `${baseUrl}/tags/milf/`,
                "Anal": `${baseUrl}/tags/anal/`,
                "Lesbian": `${baseUrl}/tags/lesbian/`
            };
            
            const data = {};
            for (const [name, url] of Object.entries(categories)) {
                try {
                    const res = await http_get(url, HEADERS);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) {
                            data[name] = items.slice(0, 20);
                        }
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
            let title = "Unknown";
            
            let titleMatch = html.match(/<h1[^>]*class="[^"]*video-title[^"]*"[^>]*>([^<]+)<\/h1>/i) || 
                             html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                             html.match(/<title>([^<]+)<\/title>/i);
            
            if (titleMatch) title = titleMatch[1].trim();
            
            let poster = "";
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
            if (posterMatch) poster = posterMatch[1];
            
            let description = "";
            const descMatch = html.match(/<(div|p)[^>]*class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/\1>/i) || html.match(/<(div|p)[^>]*>([\s\S]*?)<\/\1>/i);
            if (descMatch) description = descMatch[1].replace(/<[^>]+>/g, '').trim();
            
            const tags = [];
            const tagPattern = /<a[^>]*href="[^"]*xfsearch[^"]*"[^>]*>([^<]+)<\/a>/gi;
            let tagMatch;
            while ((tagMatch = tagPattern.exec(html)) !== null) {
                tags.push(tagMatch[1].trim());
            }
            
            let duration = null;
            const durationMatch = html.match(/<span[^>]*class="[^"]*duration[^"]*"[^>]*>([^<]+)<\/span>/i) || 
                                  html.match(/<i[^>]*class="[^"]*fa-clock-o[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i);
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
            
            const iframePattern = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
            let match;
            while ((match = iframePattern.exec(html)) !== null) {
                const iframeUrl = match[1];
                if (iframeUrl.includes('player') || iframeUrl.includes('video') || iframeUrl.includes('embed') || iframeUrl.includes('.mp4') || iframeUrl.includes('.m3u8')) {
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(iframeUrl),
                        source: "Xmoviesforyou",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
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
    // globalThis.search = search; 
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
