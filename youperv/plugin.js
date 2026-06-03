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
            let title = "Unknown";
            
            let titleMatch = html.match(/<h1[^>]*class="[^"]*video-title[^"]*"[^>]*>([^<]+)<\/h1>/i);
            if (!titleMatch) titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            if (!titleMatch) titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) title = titleMatch[1].trim();
            
            let poster = "";
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
            if (posterMatch) poster = posterMatch[1];
            
            let description = "";
            const descMatch = html.match(/<div class="f-desc"[^>]*>([\s\S]*?)<\/div>/i);
            if (descMatch) description = descMatch[1].replace(/<[^>]+>/g, '').trim();
            
            const tags = [];
            const tagPattern = /<a[^>]*href="[^"]*xfsearch[^"]*"[^>]*>([^<]+)<\/a>/gi;
            let tagMatch;
            while ((tagMatch = tagPattern.exec(html)) !== null) {
                tags.push(tagMatch[1].trim());
            }
            
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

            // Helper function: Safe extraction, URL cleaning aur duplicate check karne ke liye
            function addStreamIfValid(rawUrl, name) {
                if (!rawUrl) return;
                let cleanUrl = rawUrl.replace(/[;,\)\(\}\}\]]$/, '').trim();
                if (cleanUrl.startsWith('//')) cleanUrl = "https:" + cleanUrl;
                
                if (cleanUrl.startsWith('http')) {
                    const isDuplicate = streams.some(s => s.url.includes(btoa(cleanUrl)));
                    if (!isDuplicate) {
                        streams.push(new StreamResult({
                            url: "MAGIC_PROXY_v1" + btoa(cleanUrl),
                            source: name,
                            headers: { 
                                "Referer": url, 
                                "User-Agent": HEADERS["User-Agent"] 
                            }
                        }));
                    }
                }
            }

            // --- METHOD 1: Broad Universal Regex Scanner (HTML aur Scripts ke liye) ---
            const universalPattern = /(?:https?:)?\/\/[^\s"'><`]+/gi;
            let match;

            while ((match = universalPattern.exec(html)) !== null) {
                let foundUrl = match[0];
                let lowerUrl = foundUrl.toLowerCase();
                
                // 1. Streamtape
                if (lowerUrl.includes("streamtape") || lowerUrl.includes("stape.") || lowerUrl.includes("strtape.")) {
                    addStreamIfValid(foundUrl, "Streamtape");
                } 
                // 2. VOE
                else if (lowerUrl.includes("voe.sx") || lowerUrl.includes("voe-player") || lowerUrl.includes("voe.to") || lowerUrl.includes("/v/voe")) {
                    addStreamIfValid(foundUrl, "VOE");
                }
                // 3. Upstream
                else if (lowerUrl.includes("upstream.to") || lowerUrl.includes("upstream")) {
                    addStreamIfValid(foundUrl, "Upstream");
                }
                // 4. Filemoon
                else if (lowerUrl.includes("filemoon")) {
                    addStreamIfValid(foundUrl, "Filemoon");
                }
                // 5. Mixdrop
                else if (lowerUrl.includes("mixdrop")) {
                    addStreamIfValid(foundUrl, "Mixdrop");
                }
                // 6. Doodstream
                else if (lowerUrl.includes("dood.") || lowerUrl.includes("doodstream")) {
                    addStreamIfValid(foundUrl, "Doodstream");
                }
                // 7. Xtremestream
                else if (lowerUrl.includes("xtremestream") || lowerUrl.includes("xtreamstream") || lowerUrl.includes("xtstream")) {
                    addStreamIfValid(foundUrl, "Xtremestream");
                }
            }

            // --- METHOD 2: Generic Video Tags & Iframes Extraction ("Video" Source) ---
            const videoPattern = /<source[^>]*src="([^"]+)"[^>]*>/gi;
            while ((match = videoPattern.exec(html)) !== null) {
                addStreamIfValid(match[1], "Video");
            }

            const iframePattern = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
            while ((match = iframePattern.exec(html)) !== null) {
                let iframeUrl = match[1];
                let lowerIframe = iframeUrl.toLowerCase();
                
                let isPremium = ["streamtape", "stape", "voe", "upstream", "filemoon", "mixdrop", "dood", "xtremestream"].some(k => lowerIframe.includes(k));
                
                if (!isPremium && (iframeUrl.includes('player') || iframeUrl.includes('embed') || iframeUrl.includes('.mp4'))) {
                    addStreamIfValid(iframeUrl, "Video");
                }
            }

            // --- METHOD 3: Data-Attributes Fallback (Hidden Players) ---
            const dataAttrPattern = /data-(?:src|link|video|url)=["']([^"']+)["']/gi;
            let attrMatch;
            while ((attrMatch = dataAttrPattern.exec(html)) !== null) {
                let content = attrMatch[1];
                let lowerContent = content.toLowerCase();
                
                if (lowerContent.includes("streamtape") || lowerContent.includes("stape")) addStreamIfValid(content, "Streamtape");
                else if (lowerContent.includes("voe")) addStreamIfValid(content, "VOE");
                else if (lowerContent.includes("upstream")) addStreamIfValid(content, "Upstream");
                else if (lowerContent.includes("filemoon")) addStreamIfValid(content, "Filemoon");
                else if (lowerContent.includes("mixdrop")) addStreamIfValid(content, "Mixdrop");
                else if (lowerContent.includes("dood")) addStreamIfValid(content, "Doodstream");
                else if (lowerContent.includes("xtremestream")) addStreamIfValid(content, "Xtremestream");
            }

            // Final Response Handling
            if (streams.length > 0) {
                cb({ success: true, data: streams });
            } else {
                cb({ success: false, errorCode: "NO_STREAMS", message: "No supported premium streams found." });
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
