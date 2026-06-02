import { MixDrop, StreamTape, FileMoon, DoodStream } from 'skystream-extractors';
(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://youperv.com/"
    };

    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
            
            if (!iframeMatch) return cb({ success: false, errorCode: "NO_STREAMS" });

            let videoHostUrl = iframeMatch[1];
            if (videoHostUrl.startsWith('//')) videoHostUrl = 'https:' + videoHostUrl;

            let streams = [];
            try {
                if (videoHostUrl.includes('mixdrop')) {
                    streams = await new MixDrop().getUrl(videoHostUrl);
                } else if (videoHostUrl.includes('streamtape')) {
                    streams = await new StreamTape().getUrl(videoHostUrl);
                } else if (videoHostUrl.includes('filemoon')) {
                    streams = await new FileMoon().getUrl(videoHostUrl);
                } else if (videoHostUrl.includes('dood')) {
                    streams = await new DoodStream().getUrl(videoHostUrl);
                }
            } catch (e) {
                console.error("Extractor Error:", e);
            }

            if (streams && streams.length > 0) {
                 const results = streams.map(s => new StreamResult({
                    url: "MAGIC_PROXY_v1" + Buffer.from(s.url).toString('base64'),
                    quality: s.quality || "auto",
                    source: "Extracted"
                }));
                return cb({ success: true, data: results });
            }

            cb({ success: false, errorCode: "NO_STREAMS" });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
