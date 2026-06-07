/**
 * AllPornStream (allpornstream.com) Plugin for SkyStream
 * Optimized Version: Fixed Green Posters (LazyLoad), Clean Titles, Grid Parser & Multi-Server
 */

(function () {
    // 1. GLOBAL HEADERS CONFIGURATION
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://allpornstream.com/",
        "Cache-Control": "no-cache"
    };

    // 2. PARSE VIDEO ITEMS (FIXED: Lazy Load Posters & Title Cleaning)
    function parseVideoItems(html) {
        const items = [];
        const baseUrl = "https://allpornstream.com";
        
        const itemPattern = /<a[^>]+href=["']((?:https:\/\/allpornstream\.com)?\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const relativeUrl = match[1];
            const innerHtml = match[2];
            
            if (innerHtml.includes("img") || innerHtml.includes("lazy")) {
                // FIXED: Prioritize data-src over src to bypass green placeholder images
                const dataSrcMatch = innerHtml.match(/data-src=["']([^"']+)["']/i);
                const srcMatch = innerHtml.match(/src=["']([^"']+)["']/i);
                
                let posterUrl = "";
                if (dataSrcMatch && !dataSrcMatch[1].includes("data:image")) {
                    posterUrl = dataSrcMatch[1];
                } else if (srcMatch && !srcMatch[1].includes("data:image")) {
                    posterUrl = srcMatch[1];
                }

                // FIXED: Title Cleanup
                const altMatch = innerHtml.match(/alt=["']([^"']+)["']/i) || innerHtml.match(/title=["']([^"']+)["']/i);
                let title = altMatch ? altMatch[1].trim() : "Premium Video";
                title = title.replace(/\[.*?\]/g, '').replace(/\{.*?\}/g, '').replace(/<[^>]*>/g, '').trim();
                
                const absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;
                
                if (absoluteUrl && posterUrl) {
                    if (absoluteUrl.includes('/videos/') || absoluteUrl.includes('/watch/') || !absoluteUrl.match(/\/(categories|studios)\/$/)) {
                        items.push(new MultimediaItem({
                            title: title,
                            url: absoluteUrl,
                            posterUrl: posterUrl,
                            type: "movie",
                            isAdult: true
                        }));
                    }
                }
            }
        }
        
        return items.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
    }

    // 3. GET HOME FUNCTION (FIXED: Category URLs and Speed Optimization)
    async function getHome(cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://allpornstream.com";
            
            const categories = {
                "Latest Updates": `${baseUrl}/`,
                "Brunette": `${baseUrl}/brunette`,
                "1080p HD": `${baseUrl}/1080-p`,
                "Shaved Pussy": `${baseUrl}/shaved-pussy`,
                "Anal": `${baseUrl}/anal`, // Fixed missing slash
                "Interracial": `${baseUrl}/interracial`,
                "Small Tits": `${baseUrl}/small-tits`,
                "60 FPS": `${baseUrl}/60-fps`,
                "Latina": `${baseUrl}/latina`,
                "POV": `${baseUrl}/pov`,
                "Asian": `${baseUrl}/asian`,
                "Masturbation": `${baseUrl}/masturbation`,
                "Ebony": `${baseUrl}/ebony`,
                "Bisexual": `${baseUrl}/bisexual`,
                "Naughty America": `${baseUrl}/naughtyamerica`,
                "Casting": `${baseUrl}/casting`
            };
            
            const data = {};
            const fetchPromises = Object.entries(categories).map(async ([title, url]) => {
                try {
                    const res = await http_get(url, { ...HEADERS, "Referer": baseUrl });
                    if (res && res.status === 200 && res.body) {
                        const parsedMovies = parseVideoItems(res.body);
                        if (parsedMovies && parsedMovies.length > 0) {
                            return { title, items: parsedMovies.slice(0, 20) };
                        }
                    }
                } catch (e) {
                    console.error(`Error loading row [${title}]: ${e.message}`);
                }
                return null;
            });

            const results = await Promise.allSettled(fetchPromises);
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    data[result.value.title] = result.value.items;
                }
            }
            
            if (Object.keys(data).length === 0) {
                return cb({ success: false, errorCode: "PARSE_ERROR", message: "Failed to load categories." });
            }
            
            cb({ success: true, data });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 4. SEARCH FUNCTION
    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://allpornstream.com";
            const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
            const res = await http_get(searchUrl, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Search endpoint unavailable" });
            }
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 5. LOAD FUNCTION
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            
            const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/<h3[^>]*>([^<]+)<\/h3>/);
            let title = titleMatch ? titleMatch[1].replace("- AllPornStream", "").trim() : "Unknown Video";
            title = title.replace(/\[.*?\]/g, '').trim(); 
            
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/) || html.match(/src="([^"]+\.(?:jpg|jpeg|png|webp))"/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            const episode = new Episode({
                name: "Play Video",
                url: url,  
                season: 1,
                episode: 1,
                posterUrl: posterUrl
            });
            
            const item = new MultimediaItem({
                title: title,
                url: url,
                posterUrl: posterUrl,
                type: "movie",
                isAdult: true,
                episodes: [episode]  
            });
            
            cb({ success: true, data: item });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 6. EXTRACT SERVER LINKS HELPERS
    function extractServerLinks(html) {
        const links = [];
        const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi;
        const iframePattern = /<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
        
        let match;
        while ((match = btnPattern.exec(html)) !== null) {
            const url = match[1];
            if (url && (url.includes('stream') || url.includes('player') || url.includes('embed') || url.includes('mydaddy') || url.includes('streamtape') || url.includes('dood') || url.includes('voe') || url.includes('filemoon'))) {
                links.push(url);
            }
        }
        
        while ((match = iframePattern.exec(html)) !== null) {
            const url = match[1];
            if (url && !url.includes('clarity.ms')) links.push(url);
        }
        return [...new Set(links)]; 
    }

    // 7. LOAD STREAMS FUNCTION (FIXED: Connected to Extractor Engine instead of wow.xxx)
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            
            // Extract external provider links (MyDaddy, Streamtape, etc.)
            const serverLinks = extractServerLinks(html);
            
            for (let link of serverLinks) {
                await loadExtractor(link, streams, url);
            }

            // Fallback Native Extraction
            if (streams.length === 0) {
                const sourceMatch = html.match(/<source[^>]+src=["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
                if (sourceMatch) {
                    streams.push(new StreamResult({
                        url: sourceMatch[1],
                        source: "Native Direct",
                        headers: { "Referer": "https://allpornstream.com/" }
                    }));
                }
            }
            
            // Emergency bypass
            if (streams.length === 0) {
                streams.push(new StreamResult({ url: url, source: "Mirror Backup" }));
            }
            
            cb({ success: true, data: streams });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // ===================================================
    // MULTI-SERVER ROUTING & EXTRACTOR CORE ENGINE
    // ===================================================

    async function loadExtractor(url, streams, referer) {
        if (!url) return;
        
        const getDisplayName = (u) => {
            if (u.includes("streamtape.com")) return "Streamtape";
            if (u.includes("mixdrop.") || u.includes("m1xdrop.")) return "Mixdrop";
            if (u.includes("voe.sx") || u.includes("voemp4") || u.includes("voe720p")) return "VOE";
            if (u.includes("dood")) return "DoodStream";
            if (u.includes("mydaddy")) return "MyDaddy";
            if (u.includes("filemoon")) return "FileMoon";
            try { return new URL(u).hostname.replace("www.", ""); } catch(e) { return "Server"; }
        };

        const serverName = getDisplayName(url);

        if (url.includes("streamtape.com")) {
            await extractStreamtape(url, streams);
        } else if (url.includes("mixdrop.") || url.includes("m1xdrop.")) {
            await extractMixdrop(url, streams);
        } else if (url.includes("voe.sx") || url.includes("voemp4") || url.includes("voe720p")) {
            await extractVoe(url, streams);
        } else if (url.includes("dood")) {
            await extractDoodStream(url, streams);
        } else if (url.includes("mydaddy")) {
            await extractMyDaddy(url, streams, referer);
        } else {
            // General proxy fallback for unsupported embedded iframes
            if (url.match(/\.(?:m3u8|mp4|mkv)(?:\?.*)?$/i)) {
                streams.push(new StreamResult({ url, source: serverName, headers: { "Referer": referer } }));
            } else {
                // Let the frontend handle standard iframe embedding if no direct mp4 found
                streams.push(new StreamResult({ url, source: `${serverName} Web`, headers: { "Referer": referer } }));
            }
        }
    }

    async function extractMyDaddy(url, streams, referer) {
        try {
            const res = await http_get(url, { ...HEADERS, "Referer": "https://diepornos.com/" });
            const myDaddyRegex = /<source src=["']([^"']+)["']/i;
            let match = myDaddyRegex.exec(res.body);
            if (match) {
                let rawUrl = match[1].replace(/\\/g, ""); 
                let finalUrl = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
                streams.push(new StreamResult({ url: finalUrl, source: "MyDaddy Server", headers: { "Referer": "https://diepornos.com/" } }));
            } else {
                streams.push(new StreamResult({ url: url, source: "MyDaddy Web", headers: { "Referer": "https://diepornos.com/" } }));
            }
        } catch (e) { console.error("MyDaddy Error:", e); }
    }

    async function extractStreamtape(url, streams) {
        try {
            const res = await http_get(url, HEADERS);
            const match = res.body.match(/robotlink'\)\.innerHTML\s*=\s*'([^']+)'\s*\+\s*'([^']+)'/) || 
                          res.body.match(/get\('botlink'\)\.innerHTML\s*=\s*['"](.*?)['"]/);
            if (match) {
                const videoUrl = match[2] ? ("https:" + match[1] + match[2].substring(3)) : `https:${match[1]}&stream=1`;
                streams.push(new StreamResult({ url: videoUrl, source: "Streamtape Server", headers: { "Referer": url } }));
            } else {
                streams.push(new StreamResult({ url: url, source: "Streamtape Web", headers: { "Referer": url } }));
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
                streams.push(new StreamResult({ url: videoUrl, source: "Mixdrop Server", headers: { "Referer": embedUrl } }));
            }
        } catch (e) { console.error("Mixdrop Error:", e); }
    }

    async function extractVoe(url, streams) {
        try {
            const res = await http_get(url, HEADERS);
            let fileMatch = res.body.match(/'hls':\s*'([A-Za-z0-9+/=]+)'/);
            if (fileMatch) {
                streams.push(new StreamResult({ url: atob(fileMatch[1]), source: "VOE Server [HLS]" }));
                return;
            }
            fileMatch = res.body.match(/file\s*:\s*"([^"]+)"/);
            if (fileMatch) {
                streams.push(new StreamResult({ url: fileMatch[1], source: "VOE Server [Direct]" }));
            } else {
                streams.push(new StreamResult({ url: url, source: "VOE Web" }));
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
                streams.push(new StreamResult({ url: finalUrl, source: "DoodStream Server", headers: { "Referer": embedUrl } }));
            } else {
                streams.push(new StreamResult({ url: embedUrl, source: "DoodStream Web", headers: { "Referer": embedUrl } }));
            }
        } catch (e) { console.error("DoodStream Error:", e); }
    }

    // 9. EXPOSE METHODS
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
