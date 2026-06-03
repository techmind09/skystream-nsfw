(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15; Infinix X6851 Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/148.0.7778.178 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://xmoviesforyou.com"
    };

    function parseVideoItems(html) {
        const items = [];
        // Updated Regex for safety

        const itemPattern = /<div class="a.group.flex.flex-col"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[^>]*>/


        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const href = match[1];
            const posterSrc = match[2];
            const altText = match[3];
            
            const title = altText.split('(')[0].trim();
            const fullUrl = href.startsWith('http') ? href : "https://xmoviesforyou.com" + href;
            const posterUrl = posterSrc.startsWith('http') ? posterSrc : "https://xmoviesforyou.com" + posterSrc;
             
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
    const extractedItems = [
            {
                "title": "[Lubed] Vivienne Vo (Oil Overload / 05.26.2026)",
                "url": "https://xmoviesforyou.com/lubed-vivienne-vo-oil-overload",
                "posterUrl": "https://xmoviescdn.online/2026/05/lubed-vivienne-vo-oil-overload-xmoviesforyou-6a163f2d9e852.webp",
                "type": "movie"
            },
            {
                "title": "[IsiahMaxwellXXX] Roxie Sinner (Sucks BBC Balls for Isiah Maxwell BBC Creampie / 05.24.2026)",
                "url": "https://xmoviesforyou.com/isiahmaxwellxxx-roxie-sinner-sucks-bbc-balls-for-isiah-maxwell-bbc-creampie",
                "posterUrl": "https://xmoviescdn.online/2026/05/isiahmaxwellxxx-roxie-sinner-sucks-bbc-balls-for-isiah-maxwell-bbc-creampie-xmoviesforyou-6a13a7c3ad03f.webp",
                "type": "movie"
            },
            {
                "title": "[BrazzersExxtra] Kate Quinn (Stress Relief / 05.24.2026)",
                "url": "https://xmoviesforyou.com/brazzersexxtra-kate-quinn-stress-relief",
                "posterUrl": "https://xmoviescdn.online/2026/05/brazzersexxtra-kate-quinn-stress-relief-xmoviesforyou-6a12fcdc89a85.webp",
                "type": "movie"
            },
            {
                "title": "[ElegantAngel] Roxie Sinner (Bush and Suckable Tits / 05.11.2026)",
                "url": "https://xmoviesforyou.com/elegantangel-roxie-sinner-bush-and-suckable-tits",
                "posterUrl": "https://xmoviescdn.online/2026/05/elegantangel-roxie-sinner-bush-and-suckable-tits-xmoviesforyou-6a01d5aa75821.webp",
                "type": "movie"
            },
            {
                "title": "[NewSensations] Summer Renee (Summer Renee Is His Business And Business Is Good / 05.23.2026)",
                "url": "https://xmoviesforyou.com/newsensations-summer-renee-is-his-business-and-business-is-good",
                "posterUrl": "https://xmoviescdn.online/2026/05/newsensations-summer-renee-is-his-business-and-business-is-good-xmoviesforyou-6a11a6ac103b5.webp",
                "type": "movie"
            },
            {
                "title": "[BrazzersExxtra] Kendra Sunderland, Cubbi Thompson (Cubbi & Kendra Admire The Scenery / 05.27.2026)",
                "url": "https://xmoviesforyou.com/brazzersexxtra-kendra-sunderland-cubbi-thompson-cubbi-kendra-admire-the-scenery",
                "posterUrl": "https://xmoviescdn.online/2026/05/brazzersexxtra-kendra-sunderland-cubbi-thompson-cubbi-kendra-admire-the-scenery-xmoviesforyou-6a16e99b276bb.webp",
                "type": "movie"
            },
            {
                "title": "[ExxxtraSmall] Vivienne Vo (Pocket-Sized Pussy for Your Cardio Routine (Vivienne Vo Debut) / 05.25.2026)",
                "url": "https://xmoviesforyou.com/exxxtrasmall-vivienne-vo-pocketsized-pussy-for-your-cardio-routine-vivienne-vo-debut",
                "posterUrl": "https://xmoviescdn.online/2026/05/exxxtrasmall-vivienne-vo-pocket-sized-pussy-for-your-cardio-routine-vivienne-vo-debut-xmoviesforyou-6a143a795d1e0.webp",
                "type": "movie"
            },
            {
                "title": "[DredXXX] Lulu Chu (Round 2 Full Romp / 05.25.2026)",
                "url": "https://xmoviesforyou.com/dredxxx-lulu-chu-round-2-full-romp",
                "posterUrl": "https://xmoviescdn.online/2026/05/dredxxx-lulu-chu-round-2-full-romp-xmoviesforyou-6a1436578a529.webp",
                "type": "movie"
            },
            {
                "title": "[AnalOnly] Scarlett Alexis (Scarlett Always Gets Her Way / 05.23.2026)",
                "url": "https://xmoviesforyou.com/analonly-scarlett-alexis-scarlett-always-gets-her-way",
                "posterUrl": "https://xmoviescdn.online/2026/05/analonly-scarlett-alexis-scarlett-always-gets-her-way-xmoviesforyou-6a1271a6c80ff.webp",
                "type": "movie"
            },
            {
                "title": "[PornstarWife] Alyssia Vera (33820 / 05.27.2026)",
                "url": "https://xmoviesforyou.com/pornstarwife-alyssia-vera-33820",
                "posterUrl": "https://xmoviescdn.online/2026/05/pornstarwife-alyssia-vera-33820-xmoviesforyou-6a16d3a89fe9e.webp",
        
        const data = {
            "Home": extractedItems,
            "Most Viewed": extractedItems.slice(0, 5), // Testing ke liye items divide kar diye
            "Top Rated": extractedItems.slice(5, 10),
            "Teen": extractedItems,
            "MILF": extractedItems,
            "Anal": extractedItems,
            "Lesbian": extractedItems
        };

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
            const tagPattern = /<a[^>]*href="[^"]*(categories|tags|pornstars|studios)[^"]*"[^>]*>([^<]+)<\/a>/gi;
            let tagMatch;
            while ((tagMatch = tagPattern.exec(html)) !== null) {
                tags.push(tagMatch[1].trim());
            }
            
            let duration = null;
            const durationMatch = const durationMatch = html.match(/(?:duration|time)[^>]*>([\d:]+)</i) || html.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
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
            
            const iframePattern = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
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
                        headers: { "Referer": "https://xmoviesforyou.com", "User-Agent": HEADERS["User-Agent"] }
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
                        headers: { "Referer":"https://xmoviesforyou.com", "User-Agent": HEADERS["User-Agent"] }
                return new StreamResult({
                    url: proxyUrl,
                    source: stream.quality,  // Use 'source' not 'quality' for display
                    headers: {
                        "Referer": "https://xmoviesforyou.com",
                        "User-Agent": HEADERS["User-Agent"]
                        
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
