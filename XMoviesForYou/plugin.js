(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://xmoviesforyou.com/"
    };

    // Based on REAL HTML: <div class="item"><a href="URL" class="item-link"><img src="SRC" alt="TITLE">
    function parseVideoItems(html) {
        const items = [];
        const itemPattern = /<div class="a.group.flex.flex-col"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*class="item-link"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[^>]*>/gi;
      
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const href = match[1];
            const posterSrc = match[2];
            const altText = match[3];
            
            const title = altText.split('(')[0].trim();
            const fullUrl = href.startsWith('http') ? href : (manifest.baseUrl || "https://xmoviesforyou.com") + href;
            const posterUrl = posterSrc.startsWith('http') ? posterSrc : (manifest.baseUrl || "https://xmoviesforyou.com") + posterSrc;
            
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
                "Latest Updates": `${baseUrl}/latest-updates/`,
                "Most Popular Today": `${baseUrl}/most-popular/today/`,
                "Most Popular Week": `${baseUrl}/most-popular/week/`,
                "Most Popular All": `${baseUrl}/most-popular/all/`,
                "Anal": `${baseUrl}/category/anal/`,
                "Amateur": `${baseUrl}/category/amateur/`,
                "Anal Creampie": `${baseUrl}/category/anal-creampie/`,
                "Bathroom": `${baseUrl}/category/bathroom/`,
                "Big Dick": `${baseUrl}/category/big-dick/`,
                "Big Tits": `${baseUrl}/category/big-tits/`,
                "Beautiful Girl": `${baseUrl}/category/beautiful-girl/`,
                "Beautiful Porn": `${baseUrl}/category/beautiful-porn/`,
                "Brunette": `${baseUrl}/category/brunette/`,
                "Blonde": `${baseUrl}/category/blonde/`,
                "Creampie": `${baseUrl}/category/creampie/`,
                "Cuckold": `${baseUrl}/category/cuckold/`,
                "Cumshot": `${baseUrl}/category/cumshot/`,
                "Female Orgasm": `${baseUrl}/category/female-organism/`,
                "Handjob": `${baseUrl}/category/handjob/`,
                "High Heels": `${baseUrl}/category/high-heels/`,
                "Interracial": `${baseUrl}/category/interracial/`,
                "Juicy Ass": `${baseUrl}/category/juicy-ass/`,
                "Kitchen": `${baseUrl}/category/kitchen/`,
                "Lesbian": `${baseUrl}/category/lesbian/`,
                "Masturbation": `${baseUrl}/category/masturbation/`,
                "Mom": `${baseUrl}/category/mom/`,
                "Milf": `${baseUrl}/category/milf/`,
                "Office": `${baseUrl}/category/office/`,
                "POV": `${baseUrl}/category/pov/`,
                "Red Head": `${baseUrl}/category/red-head/`,
                "Russian": `${baseUrl}/category/russian/`,
                "Small Tits": `${baseUrl}/category/small-tits/`,
                "Stockings": `${baseUrl}/category/stockings/`,
                "Story": `${baseUrl}/category/story/`,
                "Teacher": `${baseUrl}/category/teacher/`,
                "Threesome": `${baseUrl}/category/threesome/`,
                "Young Girl": `${baseUrl}/category/young-girl/`,
                "Brazzers": `${baseUrl}/brazzers/`,
                "MYLF Network": `${baseUrl}/mylf-network/`
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
            const baseUrl = manifest.baseUrl || "https://xmoviesforyou.com";
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
            let title = "Unknown";
            
            let titleMatch = html.match(/<h3[^>]*class="[^"]*video-title[^"]*"[^>]*>([^<]+)<\/h3>/i) || 
                             html.match(/<h3[^>]*>([^<]+)<\/h3>/i) || 
                             html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) title = titleMatch[1].trim();
            
            let poster = "";
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
            if (posterMatch) poster = posterMatch[1];
            
            const fileMatch = res.body.match(/wurl\s*=\s*"([^"]+)"/) || res.body.match(/file\s*:\s*"([^"]+)"/);
            if (fileMatch) {
                let videoUrl = fileMatch[1].startsWith("//") ? "https:" + fileMatch[1] : fileMatch[1];
                streams.push(new StreamResult({ url: videoUrl, source: "Mixdrop", headers: { "Referer": embedUrl } }));
            }
        } catch (e) { console.error("Mixdrop Error:", e); }
    }

      async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            const baseUrl = "https://xmoviesforyou.com";
            
            // 1. DEEP RAW TEXT SCAN: Matches any streaming domains hidden inside scripts or raw text
            const URL_PATTERN = /(https?:)?\/\/[^\s"'`<>]+(?:dood|streamtape|mixdrop|voe|vidhide|emturbovid|fslv2|fslserver|mycloudz|xtreamstream)[^\s"'`<>]+/gi;
            let rawMatches = html.match(URL_PATTERN) || [];
            let uniqueUrls = [...new Set(rawMatches)];
            
            for (let cleanUrl of uniqueUrls) {
                if (cleanUrl.startsWith('//')) cleanUrl = 'https:' + cleanUrl;
                if (!cleanUrl.includes('ads') && !cleanUrl.includes('disqus') && !cleanUrl.includes('google')) {
                    await loadExtractor(cleanUrl, streams);
                }
            }

            // 2. STANDARD IFRAME SCAN (Fallback)
            if (streams.length === 0) {
                const iframePattern = /<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
                let match;
                while ((match = iframePattern.exec(html)) !== null) {
                    let iframeUrl = match[1];
                    if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;
                    if (iframeUrl.startsWith('/')) iframeUrl = baseUrl + iframeUrl;
                    
                    if (!iframeUrl.includes('ads') && !iframeUrl.includes('disqus')) {
                        await loadExtractor(iframeUrl, streams);
                    }
                }
            }
            
            // 3. Custom Attributes Scan (data-link, data-video)
            if (streams.length === 0) {
                const dataLinkPattern = /(?:data-link|data-src|data-video)=["']([^"']+)["']/gi;
                let match;
                while ((match = dataLinkPattern.exec(html)) !== null) {
                    let dUrl = match[1];
                    if (dUrl.startsWith('//')) dUrl = 'https:' + dUrl;
                    if (dUrl.startsWith('/')) dUrl = baseUrl + dUrl;
                    await loadExtractor(dUrl, streams);
                }
            }
            
            // 4. Native HTML5 Video Element Fallback
            if (streams.length === 0) {
                const videoPattern = /<video[^>]*>[\s\S]*?<source[^>]*src="([^"]+)"[^>]*>/gi;
                let match;
                while ((match = videoPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: videoUrl,
                        source: "Video HTML5 Native",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // 5. Plain MP4 Reference Fallback
            if (streams.length === 0) {
                const directPattern = /href="([^"]+\.mp4)"[^>]*>/gi;
                let match;
                while ((match = directPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: videoUrl,
                        source: "Direct MP4 Native",
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Emergency Bypass to ensure black screen prevention
            if (streams.length === 0) {
                streams.push(new StreamResult({ url: url, source: "Mirror Bypass" }));
            }
            
            cb({ success: true, data: streams });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

      }

    async function extractStreamRuby(url, streams) {
        try {
            const cleaned = url.replace("/e", "");
            const res = await http_get(cleaned, { ...HEADERS, "X-Requested-With": "XMLHttpRequest" });
            const fileMatch = res.body.match(/file:\"(.*)\"/);
            if (fileMatch) streams.push(new StreamResult({ url: fileMatch[1], source: "StreamRuby [1080p]" }));
        } catch (e) { console.error("StreamRuby Error:", e); }
    }

    async function extractBlakite(url, streams) {
        try {
            const id = url.split('/').pop();
            const tmdbId = url.match(/embed\/([^\/]+)/)?.[1];
            const apiUrl = `https://blakiteapi.xyz/api/get.php?id=${id}&tmdbId=${tmdbId}`;
            const res = await http_get(apiUrl, HEADERS);
            const json = JSON.parse(res.body);
            if (json.success) {
                const streamUrl = `https://blakiteapi.xyz/stream/${json.data.dataId}.${json.data.format}`;
                const qual = json.data.quality || "Auto";
                streams.push(new StreamResult({ url: streamUrl, source: `Blakite [${qual}]` }));
            }
        } catch (e) { console.error("Blakite Error:", e); }
    }

    async function extractStreamtape(url, streams) {
        try {
            const res = await http_get(url, HEADERS);
            const match = res.body.match(/robotlink'\)\.innerHTML\s*=\s*'([^']+)'\s*\+\s*'([^']+)'/) || 
                          res.body.match(/get\('botlink'\)\.innerHTML\s*=\s*['"](.*?)['"]/);
            if (match) {
                const videoUrl = match[2] ? ("https:" + match[1] + match[2].substring(3)) : `https:${match[1]}&stream=1`;
                streams.push(new StreamResult({ url: videoUrl, source: "Streamtape", headers: { "Referer": url } }));
            }
        } catch (e) { console.error("Streamtape Error:", e); }
    }

    async function extractMixdrop(url, streams) {
        try {
            const embedUrl = url.replace("/f/", "/e/");
            const res = await http_get(embedUrl, { ...HEADERS, "Referer": "https://mixdrop.co/" });
            const fileMatch = res.body.match(/wurl\s*=\s*"([^"]+)"/) || res.body.match(/file\s*:\s*"([^"]+)"/);
            if (fileMatch) {
                let videoUrl = fileMatch[1].startsWith("//") ? "https:" + fileMatch[1] : fileMatch[1];
                streams.push(new StreamResult({ url: videoUrl, source: "Mixdrop", headers: { "Referer": embedUrl } }));
            }
        } catch (e) { console.error("Mixdrop Error:", e); }
    }

    async function extractVoe(url, streams) {
        try {
            const res = await http_get(url, HEADERS);
            let fileMatch = res.body.match(/'hls':\s*'([A-Za-z0-9+/=]+)'/);
            if (fileMatch) {
                streams.push(new StreamResult({ url: atob(fileMatch[1]), source: "VOE [HLS]" }));
                return;
            }
            fileMatch = res.body.match(/file\s*:\s*"([^"]+)"/);
            if (fileMatch) {
                streams.push(new StreamResult({ url: fileMatch[1], source: "VOE Direct" }));
            }
        } catch (e) { console.error("VOE Error:", e); }
    }

    async function extractDoodStream(url, streams) {
        try {
            const embedUrl = url.replace("/d/", "/e/");
            const res = await http_get(embedUrl, HEADERS);
            const passMatch = res.body.match(/\/pass_md5\/([^']+)/);
            if (passMatch) {
                const md5Url = `https://dood.to/pass_md5/${passMatch[1]}`;
                const passRes = await http_get(md5Url, { ...HEADERS, "Referer": embedUrl });
                
                let token = "";
                const randomStr = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                for (let i = 0; i < 10; i++) token += randomStr.charAt(Math.floor(Math.random() * randomStr.length));
                
                const finalUrl = `${passRes.body}${token}?token=${passMatch[1]}&expiry=${Date.now()}`;
                streams.push(new StreamResult({ url: finalUrl, source: "DoodStream", headers: { "Referer": embedUrl } }));
            }
        } catch (e) { console.error("DoodStream Error:", e); }
    }

    async function extractTurboVid(url, streams) {
        try {
            const res = await http_get(url, HEADERS);
            const fileMatch = res.body.match(/file\s*:\s*"([^"]+)"/) || res.body.match(/source\s*:\s*"([^"]+)"/);
            if (fileMatch) streams.push(new StreamResult({ url: fileMatch[1], source: "TurboVid" }));
        } catch (e) { console.error("TurboVid Error:", e); }
    }

    async function extractPackedServer(url, streams, sourceName) {
        try {
            const res = await http_get(url, HEADERS);
            const fileMatch = res.body.match(/file\s*:\s*"([^"]+)"/) || 
                              res.body.match(/["']?file["']?\s*:\s*["']([^"']+)["']/);
            if (fileMatch) streams.push(new StreamResult({ url: fileMatch[1], source: sourceName }));
        } catch (e) { console.error(`${sourceName} Error:`, e); }
    }

    async function extractGenericDirect(url, streams, sourceName) {
        try {
            const res = await http_get(url, HEADERS);
            const videoMatch = res.body.match(/["'](http[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
            if (videoMatch) {
                streams.push(new StreamResult({ url: videoMatch[1], source: sourceName }));
            }
        } catch (e) { console.error(`${sourceName} Error:`, e); }
    }

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
