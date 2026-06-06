/**
 * Xprimehub.hair Plugin for SkyStream (Auto-Resolver Edition)
 * Source: https://xprimehub.hair (Vegamovies Template Based)
 * Features: Cloudflare Bypass, Automated VCloud/Hubcloud Link Resolver to Direct Matroska (.mkv) Stream
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // manifest is injected at runtime

    const BASE_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Upgrade-Insecure-Requests": "1"
    };

    async function secureFetch(url, customReferer = "") {
        const headers = { ...BASE_HEADERS };
        if (customReferer) headers["Referer"] = customReferer;

        if (typeof http_browser !== 'undefined') {
            return await http_browser(url, { headers: headers, wait: 3000 });
        } else {
            return await http_get(url, headers);
        }
    }

    function parseVideoItems(html) {
        const items = [];
        const itemPattern = /<a href="(https?:\/\/xprimehub\.hair\/download-[^"]+)"[^>]*>[\s\S]*?<div class="poster-card">[\s\S]*?<img src="([^"]+)" alt="([^"]+)"/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const url = match[1];
            const posterUrl = match[2];
            const title = match[3].replace(/Download\s*\[.*?\]\s*/i, '').trim();
            
            if (url && posterUrl && title) {
                items.push(new MultimediaItem({
                    title: title,
                    url: url,
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
            const baseUrl = manifest.baseUrl || "https://xprimehub.hair";
            const categories = { "Latest Releases": `${baseUrl}/`, "Brazzers Collection": `${baseUrl}/by-genres/brazzers/` };
            const data = {};
            
            for (const [categoryName, url] of Object.entries(categories)) {
                const res = await secureFetch(url);
                if (res.status === 200 && res.body) {
                    const items = parseVideoItems(res.body);
                    if (items.length > 0) data[categoryName] = items.slice(0, 24);
                }
            }
            cb({ success: true, data });
        } catch (e) { cb({ success: false, errorCode: "PARSE_ERROR" }); }
    }

    async function search(query, cb) {
        try {
            const baseUrl = manifest.baseUrl || "https://xprimehub.hair";
            const res = await secureFetch(`${baseUrl}/?s=${encodeURIComponent(query)}`);
            cb({ success: true, data: parseVideoItems(res.body || "") });
        } catch (e) { cb({ success: false, errorCode: "PARSE_ERROR" }); }
    }

    async function load(url, cb) {
        try {
            const res = await secureFetch(url);
            const html = res.body || "";
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*XprimeHub.*$/i, '').trim() : "Xprime Video";
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            const episode = new Episode({ name: "Play Movie", url: url, season: 1, episode: 1, posterUrl });
            cb({ success: true, data: new MultimediaItem({ title, url, posterUrl, type: "movie", isAdult: true, episodes: [episode] }) });
        } catch (e) { cb({ success: false, errorCode: "PARSE_ERROR" }); }
    }

    /**
     * UPDATED: AUTOMATED STREAM RESOLVER
     * यह फंक्शन शॉर्टनर पेज के अंदर घुसकर सीधे क्लाउड स्टोरेज (.mkv) का डायरेक्ट लिंक निकालेगा।
     */
    async function loadStreams(url, cb) {
        try {
            const res = await secureFetch(url);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            const btnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            
            while ((match = btnPattern.exec(html)) !== null) {
                const serverUrl = match[1];
                const buttonContent = match[2];
                const cleanText = buttonContent.replace(/<[^>]*>/g, '').trim(); 
                
                // केवल वेगाक्लाउड, वीक्लाउड या हबक्लाउड जैसे डाउनलोड गेटवे को टारगेट करें
                if (serverUrl && (serverUrl.includes('cloud') || serverUrl.includes('direct') || serverUrl.includes('link') || serverUrl.includes('hubcloud') || serverUrl.includes('vcloud.zip'))) {
                    if (!serverUrl.includes('adscore') && !serverUrl.includes('wp-content') && !serverUrl.includes('xprimehub')) {
                        
                        try {
                            // स्टेप 1: शॉर्टनर/डाउनलोड पेज (जैसे vcloud.zip) को बैकग्राउंड में फेज करें
                            const step1Res = await secureFetch(serverUrl, url);
                            if (step1Res.status === 200 && step1Res.body) {
                                const step1Html = step1Res.body;

                                // स्टेप 2: पेज के अंदर से असली Cloudflare Storage (.mkv/.mp4) direct link को खोजें
                                // यह पैटर्न आपके द्वारा निकाले गए 'cloudflarestorage.com' वाले लिंक को टारगेट करता है
                                const directFilePattern = /(https?:\/\/[^\s"'`<>]+(?:\.cloudflarestorage\.com|\.r2\.)[^\s"'`<>]+(?:\.mkv|\.mp4)[^\s"'`<>]*)/i;
                                const fileMatch = step1Html.match(directFilePattern);

                                if (fileMatch && fileMatch[1]) {
                                    let cleanDirectLink = fileMatch[1].replace(/&amp;/g, '&'); // HTML entities को क्लीन करें
                                    
                                    // स्टेप 3: अगर डायरेक्ट लिंक मिल गया, तो उसे True Direct Stream के रूप में पुश करें
                                    streams.push(new StreamResult({
                                        url: cleanDirectLink,
                                        source: `⚡ HighSpeed Cloud Server (${cleanText || "Direct"})`,
                                        headers: {
                                            "User-Agent": BASE_HEADERS["User-Agent"],
                                            "Referer": serverUrl
                                        },
                                        isDirect: true, // अब यह प्लेयर को सीधे वीडियो सौंपेगा
                                        actionType: "play_video" // ब्राउज़र खोलने के बजाय सीधे वीडियो चलाएगा
                                    }));
                                } else {
                                    // फॉलबैक: अगर ऑटो-रिजॉल्व फेल हो जाए, तो यूजर के लिए ब्राउज़र मोड ओपन करें
                                    streams.push(new StreamResult({
                                        url: serverUrl,
                                        source: `🌐 Open Link in Browser: ${cleanText}`,
                                        headers: { "Referer": url },
                                        isDirect: false,
                                        actionType: "open_browser"
                                    }));
                                }
                            }
                        } catch (err) {
                            console.error("Error resolving stream: " + err.message);
                        }
                    }
                }
            }
            
            if (streams.length > 0) {
                cb({ success: true, data: streams });
            } else {
                cb({ success: false, errorCode: "NO_STREAMS", message: "No active video streams could be parsed." });
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
