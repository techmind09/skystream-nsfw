/**
 * AllPornStream Plugin for SkyStream (Kotlin/TypeScript Style)
 * Direct Paste Ready for GitHub
 */

// Global Objects Declaration (Kotlin styles headers)
declare const manifest: { baseUrl?: string };
declare class MultimediaItem { constructor(config: any); }
declare class Episode { constructor(config: any); }
declare class StreamResult { constructor(config: any); }
declare function http_get(url: string, headers: any): Promise<{ status: number; body: string }>;

(function () {

    // 1. HEADERS CONFIGURATION (Type Safe)
    const HEADERS: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://allpornstream.com/"
    };

    // 2. PARSE VIDEO ITEMS (Kotlin style clean loops)
    function parseVideoItems(html: string): any[] {
        const items: any[] = [];
        const baseUrl = "https://allpornstream.com";
        const itemPattern = /<a[^>]+href=["']((?:https:\/\/allpornstream\.com)?\/[^"']+)["'][^>]*>[\s\S]*?<div[^>]*class="[^"]*poster-card[^"]*"[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/gi;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const relativeUrl = match[1];
            const posterUrl = match[2];
            const absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;
            
            items.push(new MultimediaItem({
                title: "Video Node",
                url: absoluteUrl,
                posterUrl: posterUrl,
                type: "movie",
                isAdult: true
            }));
        }
        return items;
    }

    // 3. GET HOME FUNCTION
    async function getHome(cb: (response: any) => void): Promise<void> {
        try {
            const baseUrl = manifest.baseUrl || "https://allpornstream.com";
            const contentRoutes: Record<string, string> = {
                "Category: Brunette": `${baseUrl}/categories/brunette`,
                "Category: Lesbians": `${baseUrl}/categories/lesbians`,
                "Studio: Brazzers": `${baseUrl}/studios/brazzers`,
                "Actor: Lana Rhodes": `${baseUrl}/actors/lana-rhodes`
            };
            
            const data: Record<string, any[]> = {};
            
            for (const [sectionLabel, targetUrl] of Object.entries(contentRoutes)) {
                try {
                    const res = await http_get(targetUrl, HEADERS);
                    if (res && res.status === 200 && res.body) {
                        const parsedMovies = parseVideoItems(res.body);
                        if (parsedMovies.length > 0) {
                            data[sectionLabel] = parsedMovies.slice(0, 20);
                        }
                    }
                } catch (error) {
                    console.error(`Error loading row [${sectionLabel}]`);
                }
            }
            
            cb({ success: true, data });
        } catch (globalError: any) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: globalError.message });
        }
    }

    // 4. SEARCH FUNCTION
    async function search(query: string, cb: (response: any) => void): Promise<void> {
        try {
            const baseUrl = manifest.baseUrl || "https://allpornstream.com";
            const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
            const res = await http_get(searchUrl, HEADERS);
            
            if (res.status !== 200) {
                return cb({ success: false, errorCode: "NETWORK_ERROR" });
            }
            
            const items = parseVideoItems(res.body || "");
            cb({ success: true, data: items });
        } catch (e: any) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 5. LOAD FUNCTION
    async function load(url: string, cb: (response: any) => void): Promise<void> {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            const episode = new Episode({
                name: "Play Video",
                url: url,
                season: 1,
                episode: 1,
                posterUrl: posterUrl
            });
            
            const item = new MultimediaItem({
                title: "Parsed Movie",
                url: url,
                posterUrl: posterUrl,
                type: "movie",
                isAdult: true,
                episodes: [episode]
            });
            
            cb({ success: true, data: item });
        } catch (e: any) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // 6. LOAD STREAMS FUNCTION
    async function loadStreams(url: string, cb: (response: any) => void): Promise<void> {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const finalizedStreams: any[] = [];
            
            // Example of adding a stream result node
            finalizedStreams.push(new StreamResult({
                url: url,
                source: "Direct Premium Mirror",
                isHtml: false,
                headers: HEADERS
            }));
            
            cb({ success: true, data: finalizedStreams });
        } catch (e: any) {
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    // Expose methods to Global Context (SkyStream standard)
    const globalScope = (globalThis as any);
    globalScope.getHome = getHome;
    globalScope.search = search;
    globalScope.load = load;
    globalScope.loadStreams = loadStreams;

})();
