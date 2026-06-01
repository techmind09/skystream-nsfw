(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15; Infinix X6851 Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/148.0.7778.178 Mobile Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://xmoviesforyou.com/"
    };

    function parseHTML(html) {
        const parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    }

    function parseVideoItems(html) {
        const items = [];
        const doc = parseHTML(html);
        const elements = doc.querySelectorAll('.item');

        elements.forEach(el => {
            const linkEl = el.querySelector('.item-link');
            const imgEl = el.querySelector('img');

            if (linkEl && imgEl) {
                const href = linkEl.getAttribute('href');
                const posterSrc = imgEl.getAttribute('src');
                const altText = imgEl.getAttribute('alt') || "";
                
                const baseUrl = (typeof manifest !== 'undefined' && manifest.baseUrl) ? manifest.baseUrl : "https://xmoviesforyou.com/";
                const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                const posterUrl = posterSrc.startsWith('http') ? posterSrc : baseUrl + posterSrc;

                items.push(new MultimediaItem({
                    title: altText.split('(')[0].trim(),
                    url: fullUrl,
                    posterUrl: posterUrl,
                    type: "movie",
                    isAdult: true
                }));
            }
        });
        return items;
    }

    async function getHome(cb) {
        try {
            const baseUrl = (typeof manifest !== 'undefined' && manifest.baseUrl) ? manifest.baseUrl : "https://xmoviesforyou.com/";
            const categories = {
                "Home": baseUrl,
                "Most Viewed": `${baseUrl}/top-50-most-viewed-videos.html`,
                "Top Rated": `${baseUrl}/top-porn-videos.html`
            };
            
            const data = {};
            for (const [name, url] of Object.entries(categories)) {
                const res = await http_get(url, HEADERS);
                if (res.status === 200 && res.body) {
                    data[name] = parseVideoItems(res.body).slice(0, 20);
                }
            }
            cb({ success: true, data });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    async function search(query, cb) {
        try {
            const baseUrl = (typeof manifest !== 'undefined' && manifest.baseUrl) ? manifest.baseUrl : "https://xmoviesforyou.com/";
            const searchUrl = `${baseUrl}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}`;
            const res = await http_get(searchUrl, HEADERS);
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    async function load(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            const doc = parseHTML(res.body || "");
            
            const title = doc.querySelector('h1')?.innerText || "Unknown";
            const poster = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || "";
            const description = doc.querySelector('.f-desc')?.innerText.trim() || "";
            
            cb({
                success: true,
                data: new MultimediaItem({
                    title, url, posterUrl: poster, type: "movie", isAdult: true,
                    description, episodes: [new Episode({ name: "Play Video", url, season: 1, episode: 1, posterUrl: poster })]
                })
            });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            const doc = parseHTML(res.body || "");
            const streams = [];

            const iframes = doc.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                const src = iframe.getAttribute('src') || "";
                if (src.includes('embed') || src.includes('player') || src.endsWith('.mp4')) {
                    if (!src.includes('guidepaparazzisurface')) {
                        streams.push(new StreamResult({
                            url: "MAGIC_PROXY_v1" + btoa(src),
                            source: "Video Player",
                            headers: { "Referer": url }
                        }));
                    }
                }
            });

            if (streams.length > 0) cb({ success: true, data: streams });
            else cb({ success: false, errorCode: "NO_STREAMS" });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
