    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];

            // Xtremestream logic: Extracting from script tags
            const videoId = html.match(/var video_id = `(.*?)`;/)?.[1];
            const m3u8LoaderUrl = html.match(/var m3u8_loader_url = `(.*?)`;/)?.[1];

            if (videoId && m3u8LoaderUrl) {
                const finalStreamUrl = `${m3u8LoaderUrl}/${videoId}`;
                streams.push(new StreamResult({
                    url: finalStreamUrl,
                    source: "Xtremestream",
                    headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                }));
            }

            // Fallback logic agar upar wala match na ho (original logic)
            if (streams.length === 0) {
                const iframePattern = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
                let match;
                while ((match = iframePattern.exec(html)) !== null) {
                    const iframeUrl = match[1];
                    if (iframeUrl.includes('player') || iframeUrl.includes('video') || iframeUrl.includes('embed') || iframeUrl.includes('.mp4') || iframeUrl.includes('.m3u8')) {
                        streams.push(new StreamResult({
                            url: "MAGIC_PROXY_v1" + btoa(iframeUrl),
                            source: "Youperv",
                            headers: { "Referer": url, "User-Agent": HEADERS["User-Agent"] }
                        }));
                    }
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
