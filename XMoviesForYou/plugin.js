/**
 * XMoviesForYou (xmoviesforyou.com) Plugin for SkyStream
 * Features: Redirect Handling, Cloudflare Optimization, Robust Extraction
 */
(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Referer": "https://xmoviesforyou.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Upgrade-Insecure-Requests": "1",
        "Connection": "keep-alive",
        "Cache-Control": "max-age=0"
    };

    async function fetchWithRedirect(url, headers, depth = 0) {
        if (depth > 3) throw new Error("Too many redirects");
        const cacheBuster = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
        const res = await http_get(cacheBuster, headers);
        if (res.status >= 300 && res.status < 400 && res.headers && res.headers.location) {
            return await fetchWithRedirect(res.headers.location, headers, depth + 1);
        }
        return res;
    }

    function parseVideoItems(html) {
        const items = [];
        const baseUrl = "https://xmoviesforyou.com";
        const itemBlockPattern = /<a\s+[^>]*href=["'](\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        
        let match;
        while ((match = itemBlockPattern.exec(html)) !== null) {
            const relativeUrl = match[1];
            if (relativeUrl.includes('/category/') || relativeUrl.includes('/tags/') || relativeUrl === '/') continue;
            
            const titleMatch = match[2].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || match[2].match(/alt=["']([^"']+)["']/i);
            if (titleMatch) {
                items.push(new MultimediaItem({
                    title: titleMatch[1].replace(/<[^>]*>/g, '').trim(),
                    url: relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`,
                    posterUrl: (match[2].match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || "",
                    type: "movie",
                    isAdult: true
                }));
            }
        }
        return items;
    }

    async function getHome(cb) {
        try {
            const categories = {
                "Latest Updates": `${BASE_URL}/latest-updates/`,
                "Most Popular Today": `${BASE_URL}/most-popular/today/`,
                "Most Popular Week": `${BASE_URL}/most-popular/week/`,
                "Most Popular All": `${BASE_URL}/most-popular/all/`,
                "Categories": `${BASE_URL}/categories/`
            };

        async function loadStreams(url, cb) {
        // Whitelist define kari
        const ALLOWED_HOSTS = [
            "mixdrop.top", "mixdrop.ch", "mixdrop.bz", 
            "streamtape.com", "streamtape.xyz", "streamtape.net"
        ]; 

        try {
            const res = await http_get(url, HEADERS);
            const html = res.body || "";
            const streams = [];

            const iframePattern = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
            let match;

            while ((match = iframePattern.exec(html)) !== null) {
                const srcUrl = match[1];

                // FIX: Check logic yahan hona chahiye
                const isAllowed = ALLOWED_HOSTS.some(host => srcUrl.includes(host));

                if (isAllowed) {
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(srcUrl),
                        source: "VerifiedSource",
                        headers: { "Referer": url }
                    }));
                }
            }

            if (streams.length > 0) {
                cb({ success: true, data: streams });
            } else {
                cb({ success: false, errorCode: "NO_VALID_STREAMS_FOUND" });
            }
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR" });
        }
    }

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
    }
     )();
