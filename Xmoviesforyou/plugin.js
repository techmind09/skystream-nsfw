/**
 * XMoviesForYou (xmoviesforyou.com) Plugin for SkyStream
 * Source: https://xmoviesforyou.com
 * Features: Expanded Categories Grid Mapping, Singular Slug Fix, Standard Native WebView Router, Merged Extractor
 */

(function () {
    // 1. CLOUDFLARE BYPASS HEADERS
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        "Referer": "https://xmoviesforyou.com/"
    };

    /**
     * 2. PARSE VIDEO ITEMS
     */
    function parseVideoItems(html) {
        const items = [];
        const baseUrl = "https://xmoviesforyou.com";
        
        const itemBlockPattern = /<a\s+[^>]*href=["'](\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        const posterPattern = /<img[^>]+src=["']([^"']+)["']/i;
        const titlePattern = /<h3[^>]*>([\s\S]*?)<\/h3>/i;
        
        let match;
        while ((match = itemBlockPattern.exec(html)) !== null) {
            const relativeUrl = match[1];
            const itemInnerHtml = match[2];
            
            // Skip infrastructure links
            if (relativeUrl.includes('/category/') || relativeUrl.includes('/tags/') || relativeUrl === '/' || relativeUrl.includes('#')) {
                continue;
            }
            
            const posterMatch = itemInnerHtml.match(posterPattern);
            const titleMatch = itemInnerHtml.match(titlePattern);
            
            const posterUrl = posterMatch ? posterMatch[1] : null;
            let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : null;
            
            // Fallback to alt attribute if h3 text node is compressed
            if (!title && itemInnerHtml.includes('alt=')) {
                const altMatch = itemInnerHtml.match(/alt=["']([^"']+)["']/i);
                title = altMatch ? altMatch[1].trim() : null;
            }

            if (title) {
                title = title.replace(/\[.*?\]/g, '').trim(); 
            }
            
            const absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;
            
            if (absoluteUrl && posterUrl && title && !items.some(i => i.url === absoluteUrl)) {
                items.push(new MultimediaItem({
                    title: title,
                    url: absoluteUrl,
                    posterUrl: posterUrl,
                    type: "movie",
                    isAdult: true
                }));
            }
        }
        
        return items;
    }

    /**
     * 3. GET HOME (ALL GRID CATEGORIES ADDED)
     */
    async function getHome(cb) {
        try {
            const baseUrl = typeof manifest !== 'undefined' && manifest.baseUrl ? manifest.baseUrl : "https://xmoviesforyou.com";
            const data = {};

            // Default Lander (Latest Updates)
            try {
                const mainRes = await http_get(baseUrl, HEADERS);
                if (mainRes.status === 200 && mainRes.body) {
                    const mainItems = parseVideoItems(mainRes.body);
                    if (mainItems.length > 0) {
                        data["Latest Videos"] = mainItems.slice(0, 20);
                    }
                }
            } catch (e) {
                console.error("Home feed failure: " + e.message);
            }
            
            const categories = {
                "Brunette": `${baseUrl}/category/brunette`,
                "Blonde": `${baseUrl}/category/blonde`,
                "Teen": `${baseUrl}/category/teen`,
                "MILF": `${baseUrl}/category/milf`,
                "Threesome": `${baseUrl}/category/threesome`,
                "Interracial": `${baseUrl}/category/interracial`,
                "Redhead": `${baseUrl}/category/redhead`,
                "Anal": `${baseUrl}/category/anal`,
                "Lesbian": `${baseUrl}/category/lesbian`,
                "Asian": `${baseUrl}/category/asian`,
                "Latina": `${baseUrl}/category/latina`,
                "Tattoo": `${baseUrl}/category/tattoo`,
                "Orgy": `${baseUrl}/category/orgy`,
                "BangBros": `${baseUrl}/category/bangbros`,
                "NaughtyAmerica": `${baseUrl}/category/naughtyamerica`,
                "Ebony": `${baseUrl}/category/ebony`,
                "TeamSkeet": `${baseUrl}/category/teamskeet`,
                "Brazzers": `${baseUrl}/category/brazzers`,
                "Gangbang": `${baseUrl}/category/gangbang`,
                "BDSM": `${baseUrl}/category/bdsm`,
                "RealityKings": `${baseUrl}/category/realitykings`,
                "21Sextury": `${baseUrl}/category/21sextury`,
                "Squirt": `${baseUrl}/category/squirt`,
                "Hardcore": `${baseUrl}/category/hardcore`,
                "Masturbation": `${baseUrl}/category/masturbation`
            };
            
            for (const [categoryName, url] of Object.entries(categories)) {
                try {
                    const res = await http_get(url, HEADERS);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) {
                            data[categoryName] = items.slice(0, 20);
                        }
                    }
                } catch (e) {
                    console.error(`Skipping or Empty Category: ${categoryName}`);
                }
            }
            
            if (Object.keys(data).length === 0) {
                return cb({ success: false, errorCode: "PARSE_ERROR", message: "No operational modules retrieved." });
            }
            
            cb({ success: true, data });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 4. SEARCH
     */
    async function search(query, cb) {
        try {
            const baseUrl = typeof manifest !== 'undefined' && manifest.baseUrl ? manifest.baseUrl : "https://xmoviesforyou.com";
            const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
            const res = await http_get(searchUrl, HEADERS);
            
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * 5. LOAD
     */
    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/<h1[^>]*>([^<]+)<\/h1>/);
            let title = titleMatch ? titleMatch[1].replace(/\s*-\s*XMoviesforyou.*$/i, '').trim() : "Unknown Video";
            title = title.replace(/\[.*?\]/g, '').trim(); 
            
            const posterMatch = html.match(/src=["'](https:\/\/xmoviescdn\.online\/[^"']+\.webp)["']/i) || html.match(/<meta property="og:image" content="([^"]+)"/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            const episode = new Episode({
                name: title,
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

    /**
     * 6. LOAD STREAMS (TARGETED BUTTON & XMFU PLAYER EXTRACTOR)
     */
    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            const baseUrl = "https://xmoviesforyou.com"; 

            // ========================================================
            // TARGET 1: Download Buttons (Streamtape, Mixdrop, Dood)
            // ========================================================
            // Ye HTML mein <a> tags ke andar se in servers ke links nikalega
            const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+(?:streamtape\.com|mixdrop\.[a-z]+|dood\.[a-z]+|voe\.sx)[^"']*)["'][^>]*>/gi;
            let match;
            while ((match = btnPattern.exec(html)) !== null) {
                let link = match[1];
                await processOrExtract(link, url, streams);
            }

            // ========================================================
            // TARGET 2: Iframe Embedded Players
            // ========================================================
            const iframePattern = /<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
            while ((match = iframePattern.exec(html)) !== null) {
                let iframeUrl = match[1];
                if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;
                if (iframeUrl.startsWith('/')) iframeUrl = baseUrl + iframeUrl;
                
                if (!iframeUrl.includes('ads') && !iframeUrl.includes('disqus')) {
                    await processOrExtract(iframeUrl, url, streams);
                }
            }

            // ========================================================
            // TARGET 3: XMFU HD Server (Direct MP4/M3U8)
            // ========================================================
            const mp4Pattern = /(https?:)?\/\/[^\s"'`<>]+(?:\.mp4|\.m3u8)[^\s"'`<>]*/gi;
            let mp4Matches = html.match(mp4Pattern) || [];
            for (let link of [...new Set(mp4Matches)]) {
                if (link.startsWith('//')) link = 'https:' + link;
                if (!link.includes('ads') && !link.includes('disqus')) {
                    streams.push(new StreamResult({
                        url: link,
                        source: "XMFU HD Server", // Custom naam aapke screenshot ke mutabiq
                        headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }

            // ========================================================
            // TARGET 4: Raw Text Fallback (Scripts ke andar chhupa hua)
            // ========================================================
            const URL_PATTERN = /(https?:)?\/\/[^\s"'`<>]+(?:dood|streamtape|mixdrop|voe|vidhide|lapecontent\.net|myvidplay\.com)[^\s"'`<>]+/gi;
            let rawMatches = html.match(URL_PATTERN) || [];
            for (let cleanUrl of [...new Set(rawMatches)]) {
                if (cleanUrl.startsWith('//')) cleanUrl = 'https:' + cleanUrl;
                if (!cleanUrl.includes('ads') && !cleanUrl.includes('disqus')) {
                    await processOrExtract(cleanUrl, url, streams);
                }
            }

            // CLEANUP: Koi duplicate link do baar add na ho
            const uniqueStreams = streams.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);

            if (uniqueStreams.length > 0) {
                cb({ success: true, data: uniqueStreams });
            } else {
                cb({ success: false, errorCode: "NO_STREAMS", message: "No compatible servers found on page." });
            }
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // HELPER: Routes matching URLs to either direct stream creation or your complex extractor
    async function processOrExtract(cleanUrl, refererUrl, streams) {
        if (cleanUrl.includes("lapecontent.net")) {
            streams.push(new StreamResult({ 
                url: cleanUrl, 
                source: "LapeContent Server", 
                headers: { "Referer": refererUrl, "User-Agent": HEADERS["User-Agent"] } 
            }));
        } else if (cleanUrl.includes("myvidplay.com")) {
            streams.push(new StreamResult({ 
                url: cleanUrl.replace("/d/", "/e/"), 
                source: "Myvidplay Server", 
                headers: { "Referer": refererUrl, "User-Agent": HEADERS["User-Agent"] } 
            }));
        } else {
            await loadExtractor(cleanUrl, streams);
        }
    }

    // ==========================================
    // MULTI-SERVER ROUTING & EXTRACTOR CORE
    // ==========================================

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
    
    // 7. EXPOSE HOOKS
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
