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
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR", message: "Failed to fetch video page" });
            }
            
            const html = res.body || "";
            const rawStreams = parseVideoStreams(html);
            
            if (rawStreams.length === 0) {
                return cb({ success: false, errorCode: "NO_STREAMS", message: "No video streams found" });
            }
            
            // Convert to StreamResult objects with Magic Proxy for redirects
            const streams = rawStreams.map(stream => {
                // Use Magic Proxy v1 to handle 302 redirects
                // Format: MAGIC_PROXY_v1 + base64(url)
                const base64Url = btoa(stream.url);
                const proxyUrl = "MAGIC_PROXY_v1" + base64Url;
                
                return new StreamResult({
                    url: proxyUrl,
                    source: stream.quality,  // Use 'source' not 'quality' for display
                    headers: {
                        "Referer": "https://beeg24.org",
                        "User-Agent": HEADERS["User-Agent"]
                    }
                });
            });
            
            cb({ success: true, data: streams });
        } catch (e) {
            console.error("loadStreams error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }
     async function loadExtractor(url, streams) {
        if (!url) return;
        
          const getDisplayName = (u) => {
            if (u.includes("gdmirrorbot.nl") || u.includes("techinmind.space")) return "GDMirror";
            if (u.includes("awstream.net") || u.includes("as-cdn21.top")) return "AWSStream";
            if (u.includes("rubystm.com")) return "StreamRuby";
            if (u.includes("blakiteapi.xyz")) return "Blakite";
            if (u.includes("streamtape.com")) return "Streamtape";
            if (u.includes("mixdrop.co") || u.includes("mixdrop.to")) return "Mixdrop";
            if (u.includes("voe.sx") || u.includes("voemp4") || u.includes("voe720p")) return "VOE";
            if (u.includes("dood")) return "DoodStream";
            if (u.includes("vidhide")) return "VidHide";
            if (u.includes("emturbovid") || u.includes("stbturbo")) return "TurboVid";
            if (u.includes("mycloudz")) return "MyCloudz";
            if (u.includes("xtreamstream")) return "XtreamStream";
            if (u.includes("fslv2") || u.includes("fslserver")) return "FSL Server";
            if (u.includes("movierulz") || u.includes("player4me")) return "MoviePlayer";
            try { return new URL(u).hostname.replace("www.", ""); } catch(e) { return "Server"; }
        };

        const serverName = getDisplayName(url);

        if (url.includes("gdmirrorbot.nl") || url.includes("stream.techinmind.space")) {
            await extractGDMirror(url, streams);
        } else if (url.includes("awstream.net") || url.includes("as-cdn21.top")) {
            await extractAWSStream(url, streams);
        } else if (url.includes("rubystm.com")) {
            await extractStreamRuby(url, streams);
        } else if (url.includes("blakiteapi.xyz")) {
            await extractBlakite(url, streams);
        } else if (url.includes("streamtape.com")) {
            await extractStreamtape(url, streams);
        } else if (url.includes("mixdrop.co") || url.includes("mixdrop.to")) {
            await extractMixdrop(url, streams);
        } else if (url.includes("voe.sx") || url.includes("voemp4") || url.includes("voe720p")) {
            await extractVoe(url, streams);
        } else if (url.includes("dood")) {
            await extractDoodStream(url, streams);
        } else if (url.includes("vidhide") || url.includes("movierulz") || url.includes("player4me")) {
            await extractPackedServer(url, streams, serverName);
        } else if (url.includes("emturbovid") || url.includes("stbturbo")) {
            await extractTurboVid(url, streams);
        } else if (url.includes("mycloudz") || url.includes("xtreamstream") || url.includes("fslv2") || url.includes("fslserver")) {
            await extractGenericDirect(url, streams, serverName);
        } else {
            if (url.match(/\.(?:m3u8|mp4|mkv)(?:\?.*)?$/i)) {
                streams.push(new StreamResult({ url, source: serverName, headers: { "Referer": url } }));
            }
        }
    }

    async function extractGDMirror(url, streams) {
        try {
            const res = await http_get(url, HEADERS);
            let host = url.startsWith("http") ? new URL(url).origin : "";
            if (!host && url.includes("gdmirrorbot.nl")) host = "https://gdmirrorbot.nl";
            if (!host && url.includes("techinmind.space")) host = "https://stream.techinmind.space";
            let sid;

            if (!url.includes("key=")) {
                sid = url.split('/').pop();
            } else {
                const text = res.body;
                const finalId = text.match(/FinalID\s*=\s*"([^"]+)"/)?.[1];
                const myKey = text.match(/myKey\s*=\s*"([^"]+)"/)?.[1];
                if (finalId && myKey) {
                    const apiUrl = url.includes("/tv/") ? 
                        `${host}/myseriesapi?tmdbid=${finalId}&key=${myKey}` :
                        `${host}/mymovieapi?imdbid=${finalId}&key=${myKey}`;
                    const apiRes = await http_get(apiUrl, HEADERS);
                    const json = JSON.parse(apiRes.body);
                    sid = json?.data?.[0]?.fileslug || url.split('/').pop();
                }
            }

            if (sid) {
                const postRes = await http_post(`${host}/embedhelper.php`, HEADERS, `sid=${sid}`);
                const root = JSON.parse(postRes.body);
                if (!root) return;
                
                let mresult = root.mresult;
                if (typeof mresult === 'string') {
                    if (mresult.startsWith('{')) {
                        mresult = JSON.parse(mresult);
                    } else {
                        mresult = JSON.parse(atob(mresult));
                    }
                }
                
                if (root.siteUrls && mresult) {
                    for (const key in root.siteUrls) {
                        if (mresult[key]) {
                            const fullUrl = `${root.siteUrls[key].replace(/\/$/, "")}/${mresult[key].replace(/^\//, "")}`;
                            const qual = root.siteFriendlyNames?.[key] || "Auto";
                            streams.push(new StreamResult({ url: fullUrl, source: `GDMirror [${qual}]` }));
                        }
                    }
                }
            }
        } catch (e) { console.error("GDMirror Error:", e); }
    }

    async function extractAWSStream(url, streams) {
        try {
            const hash = url.split('/').pop();
            const host = url.startsWith("http") ? new URL(url).origin : "https://z.awstream.net";
            const apiUrl = `${host}/player/index.php?data=${hash}&do=getVideo`;
            const res = await http_post(apiUrl, { ...HEADERS, "x-requested-with": "XMLHttpRequest" }, `hash=${hash}&r=${encodeURIComponent(url)}`);
            const data = JSON.parse(res.body);
            if (data && data.videoSource) {
                streams.push(new StreamResult({ url: data.videoSource, source: "AWSStream [1080p]" }));
            }
        } catch (e) { console.error("AWSStream Error:", e); }
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
