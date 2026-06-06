/**
 * Xprimehub.vip Plugin for SkyStream
 * Source: https://xprimehub.vip
 * Features: Kotlin MainAPI & Extractor (VCloud/Pixeldrain) Integration
 */

(function () {
    /**
     * @type {import('@skystream/sdk').Manifest}
     */
    // मैनिफेस्ट रनटाइम पर कोर फ्रेमवर्क द्वारा इन्जेक्ट किया जाता है

    // ग्लोबल एंटी-क्लाउडफ्लेयर और ब्राउज़र हेडर्स कॉन्फ़िगरेशन
    const BASE_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
    };

    /**
     * इंटरनल नेटवर्क कोर रिक्वेस्ट हैंडलर
     */
    async function secureFetch(url, customReferer = "") {
        const headers = { ...BASE_HEADERS };
        if (customReferer) {
            headers["Referer"] = customReferer;
        }

        // SkyStream एनवायरनमेंट के अनुसार बेस्ट रिक्वेस्ट मेथड का चुनाव
        if (typeof http_browser !== 'undefined') {
            return await http_browser(url, { headers: headers, wait: 3000 });
        } else {
            return await http_get(url, headers);
        }
    }

    /**
     * HTML पार्सर (कोटलिन 'div.bw_thumb_title' डिकॉम्पोजिशन रूल के अनुसार)
     */
    function parseVideoItems(html) {
        const items = [];
        
        // <div class="bw_thumb_title"> स्ट्रक्चर से टाइटल, यूआरएल और थंबनेल निकालने का रेगुलर एक्सप्रेशन
        const itemPattern = /<div[^>]+class=["']bw_thumb_title["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>[\s\S]*?<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const url = match[1];
            let title = match[2].replace(/<[^>]*>/g, '').trim(); 
            const posterUrl = match[3];
            
            // टाइटल क्लीनिंग - कोटलिन .substringAfter("[18+]").substringBefore("UNRATED") का क्लोन
            title = title.replace(/\[18\+\]/i, '').replace(/UNRATED/i, '').trim();
            
            if (url && title) {
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

    /**
     * API: होमपेज कैटगरी लोडर (कोटलिन mainPageOf रूट्स के साथ सिंक)
     */
    async function getHome(cb) {
        try {
            const baseUrl = (typeof manifest !== 'undefined' && manifest.baseUrl) ? manifest.baseUrl : "https://xprimehub.vip";
            
            // कोटलिन के mainPageOf() मैप के अनुसार सही रूट्स
            const categories = {
                "Home - Latest": `${baseUrl}/`,
                "Ullu Originals": `${baseUrl}/c/ullu-originals`,
                "Bindas Times": `${baseUrl}/c/bindastimes`,
                "Kooku Content": `${baseUrl}/c/kooku`,
                "PrimeShots": `${baseUrl}/c/primeshots`,
                "Primeflix": `${baseUrl}/c/primeflix`,
                "Rabbit Content": `${baseUrl}/c/rabbit`,
                "OnlyFans Content": `${baseUrl}/c/onlyfans`
            };
            
            const data = {};
            
            for (const [categoryName, url] of Object.entries(categories)) {
                try {
                    const res = await secureFetch(url);
                    if (res.status === 200 && res.body) {
                        const items = parseVideoItems(res.body);
                        if (items.length > 0) {
                            data[categoryName] = items.slice(0, 24); // प्रति रो लिमिट
                        }
                    }
                } catch (e) {
                    console.error(`Error loading category [${categoryName}]: ${e.message}`);
                }
            }
            
            cb({ success: true, data });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * API: सर्च इंजन रिज़ॉल्वर (${mainUrl}/search/$query)
     */
    async function search(query, cb) {
        try {
            const baseUrl = (typeof manifest !== 'undefined' && manifest.baseUrl) ? manifest.baseUrl : "https://xprimehub.vip";
            const searchUrl = `${baseUrl}/search/${encodeURIComponent(query)}`;
            const res = await secureFetch(searchUrl);
            
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    /**
     * API: मूवी और एपिसोड डिटेल्स लोडर (कोटलिन load() फंक्शन का रिज़ॉल्वर)
     */
    async function load(url, cb) {
        try {
            const res = await secureFetch(url);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            
            // टाइटल और मेटा पार्सिंग
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            let title = titleMatch ? titleMatch[1].trim() : "XPrimeHub Premium Stream";
            title = title.replace(/\[18\+\]/i, '').replace(/UNRATED/i, '').replace(/\s*-\s*XPrimeHub.*$/i, '').trim();
            
            // कोटलिन डोम सेलेक्टर 'div.bw_desc > p > img' के अनुसार पोस्टर निकालना
            const posterMatch = html.match(/<div[^>]+class=["']bw_desc["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            // डिस्क्रिप्शन/प्लॉट पार्सर
            const descMatch = html.match(/<div[^>]+class=["']bw_desc["'][^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
            const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : "";
            
            const episode = new Episode({
                name: "Play Direct Stream",
                url: url,  
                season: 1,
                episode: 1,
                posterUrl: posterUrl
            });
            
            const item = new MultimediaItem({
                title: title,
                url: url,
                posterUrl: posterUrl,
                plot: description,
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
     * API: लोड स्ट्रीम्स लिंक एक्सट्रैक्टर (कोटलिन VCloud + PixelDrain Extractor का कॉम्बिनेशन)
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
                let serverUrl = match[1];
                const buttonContent = match[2];
                const cleanText = buttonContent.replace(/<[^>]*>/g, '').trim(); 
                
                // एक्टिव स्ट्रीमिंग डोमेन्स फ़िल्टर सूची
                if (serverUrl && (
                    serverUrl.includes('drive') || serverUrl.includes('cloud') || 
                    serverUrl.includes('press') || serverUrl.includes('direct') || 
                    serverUrl.includes('link') || serverUrl.includes('lol') || 
                    serverUrl.includes('site') || serverUrl.includes('hubcloud') ||
                    serverUrl.includes('fsl') || serverUrl.includes('vegamovies') ||
                    serverUrl.includes('vcloud')
                )) {
                    
                    if (!serverUrl.includes('adscore') && !serverUrl.includes('wp-content')) {
                        
                        // KOTLIN LOGIC: api/index.php रीडायरेक्ट पासर
                        if (serverUrl.includes("api/index.php")) {
                            try {
                                const apiRes = await secureFetch(serverUrl);
                                const redirectMatch = (apiRes.body || "").match(/<div class="main">[\s\S]*?<h4[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
                                if (redirectMatch && redirectMatch[1]) serverUrl = redirectMatch[1];
                            } catch (err) { console.error("Index redirect bypassed", err); }
                        }

                        // KOTLIN LOGIC: VCloud स्क्रिप्ट यूआरएल डिकोडर ('var url = ...')
                        if (serverUrl.includes("vcloud") || serverUrl.includes("lol")) {
                            try {
                                const vcloudRes = await secureFetch(serverUrl);
                                const scriptUrlMatch = (vcloudRes.body || "").match(/var\s+url\s*=\s*'([^']+)'/i);
                                
                                if (scriptUrlMatch && scriptUrlMatch[1]) {
                                    const gatewayRes = await secureFetch(scriptUrlMatch[1]);
                                    const gatewayHtml = gatewayRes.body || "";
                                    
                                    // फाइल साइज निकालना (i id="size")
                                    const sizeMatch = gatewayHtml.match(/<i[^>]+id="size"[^>]*>([^<]+)<\/i>/i);
                                    const fileSize = sizeMatch ? ` [${sizeMatch[1].trim()}]` : "";
                                    
                                    const innerBtnPattern = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
                                    let innerMatch;
                                    
                                    while ((innerMatch = innerBtnPattern.exec(gatewayHtml)) !== null) {
                                        let targetLink = innerMatch[1];
                                        const innerText = innerMatch[2].replace(/<[^>]*>/g, '').trim();
                                        if (innerText.toLowerCase().includes("telegram")) continue;

                                        let label = "🌐 V-Cloud Server";
                                        
                                        // A. Technorozen Workers (10 Gbps Super Fast Link)
                                        if (targetLink.includes("technorozen.workers.dev")) {
                                            const trRes = await secureFetch(targetLink);
                                            const trMatch = (trRes.body || "").match(/id="vd"[^>]+href=["']([^"']+)["']/i);
                                            if (trMatch && trMatch[1]) targetLink = trMatch[1];
                                            label = "🚀 V-Cloud 10 Gbps" + fileSize;
                                        } 
                                        // B. Pixeldrain Extractor Integration
                                        else if (targetLink.includes("pixeldra")) {
                                            label = "📁 Pixeldrain Direct" + fileSize;
                                        } 
                                        // C. dl.php डायरेक्ट स्ट्रीम रिज़ॉल्वर
                                        else if (targetLink.includes("dl.php")) {
                                            label = "🔥 V-Cloud [Download]" + fileSize;
                                        } 
                                        // D. FSL / Cloud Ext (.lol, .dev, .hubcdn.xyz)
                                        else if ([".dev", ".hubcdn.xyz", ".lol"].some(ext => targetLink.includes(ext))) {
                                            label = targetLink.includes(".lol") ? "⚡ V-Cloud [FSL]" + fileSize : "🌐 V-Cloud" + fileSize;
                                        }

                                        if (!streams.some(s => s.url === targetLink)) {
                                            streams.push(new StreamResult({
                                                url: targetLink,
                                                source: label,
                                                headers: { "Referer": "", "User-Agent": BASE_HEADERS["User-Agent"] },
                                                isDirect: true,
                                                actionType: "play" // डायरेक्ट इन-ऐप प्लेयर ट्रिगर
                                            }));
                                        }
                                    }
                                }
                            } catch (err) { console.error("VCloud deeper extract fail", err); }
                        }

                        // सामान्य सर्वर्स के लिए फॉलबैक लेबलिंग
                        let serverLabel = "🌐 SkyStream Fast Server";
                        if (/fsl/i.test(cleanText) || /fsl/i.test(serverUrl)) {
                            serverLabel = "🚀 [FSL Server] Direct Play";
                        } else if (/g-direct/i.test(cleanText) || /g-direct/i.test(buttonContent)) {
                            serverLabel = "⚡ G-Direct Link";
                        } else if (/v-cloud/i.test(cleanText) || /v-cloud/i.test(buttonContent)) {
                            serverLabel = "🔥 V-Cloud Link";
                        } else if (/filepress/i.test(cleanText) || /filepress/i.test(buttonContent)) {
                            serverLabel = "📁 Filepress Link";
                        }

                        if (!streams.some(s => s.url === serverUrl)) {
                            streams.push(new StreamResult({
                                url: serverUrl, 
                                source: serverLabel,
                                headers: { "Referer": url, "User-Agent": BASE_HEADERS["User-Agent"] },
                                isDirect: true, 
                                actionType: "play" 
                            }));
                        }
                    }
                }
            }
            
            if (streams.length > 0) {
                cb({ success: true, data: streams });
            } else {
                cb({ success: false, errorCode: "NO_STREAMS", message: "No active Vegamovies or Cloud servers detected." });
            }
        } catch (e) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // SkyStream Framework API हुक्स बाइंडिंग
    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
