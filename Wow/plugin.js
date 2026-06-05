(function () {
    const HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.wow.xxx/"
    };

    // Based on REAL HTML: <div class="item"><a href="URL" class="item-link"><img src="SRC" alt="TITLE">
    function parseVideoItems(html) {
        const items = [];
        const itemPattern =  /<div class="item">[\s\S]*?<a href="(https:\/\/www\.wow\.xxx\/videos\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[\s\S]*?<\/div>/g;
        
        let match;
        while ((match = itemPattern.exec(html)) !== null) {
            const href = match[1];
            const posterSrc = match[2];
            const altText = match[3];
            
            const title = altText.split('(')[0].trim();
            const fullUrl = href.startsWith('http') ? href : (manifest.baseUrl || "https://www.wow.xxx") + href;
            const posterUrl = posterSrc.startsWith('http') ? posterSrc : (manifest.baseUrl || "https://www.wow.xxx") + posterSrc;
            
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
            const baseUrl = manifest.baseUrl || "https://www.wow.xxx";
            const categories = {
                "Latest Updates": `${baseUrl}/latest-updates/`,
                "Most Popular Today": `${baseUrl}/most-popular/today/`,
                "Most Popular Week": `${baseUrl}/most-popular/week/`,
                "Most Popular All": `${baseUrl}/most-popular/all/`, 
                "18 Years Old": `${baseUrl}/18-years-old/`,
    "19 Years Old": `${baseUrl}/19-years-old/`,
    "4th of July": `${baseUrl}/4th-of-july/`,
    "50+": `${baseUrl}/50-plus/`,
    "60+": `${baseUrl}/60-plus/`,
    "69": `${baseUrl}/69/`,
    "Acoustic Intimacy": `${baseUrl}/acoustic-intimacy/`,
    "African": `${baseUrl}/african/`,
    "Amateur": `${baseUrl}/amateur/`,
    "Amsterdam": `${baseUrl}/amsterdam/`,
    "Anal": `${baseUrl}/anal/`,
    "Anal Creampie": `${baseUrl}/anal-creampie/`,
    "Anal Play": `${baseUrl}/anal-play/`,
    "Animation": `${baseUrl}/animation/`,
    "Arab": `${baseUrl}/arab/`,
    "Asian": `${baseUrl}/asian/`,
    "Ass Fingering": `${baseUrl}/ass-fingering/`,
    "Ass Licking": `${baseUrl}/ass-licking/`,
    "Ass-To-Mouth": `${baseUrl}/ass-to-mouth/`,
    "Athletic": `${baseUrl}/athletic/`,
    "Audition": `${baseUrl}/audition/`,
    "Australian": `${baseUrl}/australian/`,
    "Babe": `${baseUrl}/babe/`,
    "Babysitter": `${baseUrl}/babysitter/`,
    "Ball Busting": `${baseUrl}/ball-busting/`,
    "Ball Licking": `${baseUrl}/ball-licking/`,
    "Ball Play": `${baseUrl}/ball-play/`,
    "Ball Sucking": `${baseUrl}/ball-sucking/`,
    "Ballerina": `${baseUrl}/ballerina/`,
    "Bathroom": `${baseUrl}/bathroom/`,
    "BBC (Big Black Cock)": `${baseUrl}/bbc/`,
    "BBW": `${baseUrl}/bbw/`,
    "BDSM": `${baseUrl}/bdsm/`,
    "Beach": `${baseUrl}/beach/`,
    "Beautiful": `${baseUrl}/beautiful/`,
    "Beautiful Ass": `${baseUrl}/beautiful-ass/`,
    "Beautiful Sex": `${baseUrl}/beautiful-sex/`,
    "Behind the Scenes": `${baseUrl}/behind-the-scenes/`,
    "Best Friend": `${baseUrl}/best-friend/`,
    "Big Areolas": `${baseUrl}/big-areolas/`,
    "Big Ass": `${baseUrl}/big-ass/`,
    "Big Cock": `${baseUrl}/big-cock/`,
    "Big Natural Tits": `${baseUrl}/big-natural-tits/`,
    "Big Nipples": `${baseUrl}/big-nipples/`,
    "Big Tits": `${baseUrl}/big-tits/`,
    "Bikini": `${baseUrl}/bikini/`,
    "Bisexual": `${baseUrl}/bisexual/`,
    "Black": `${baseUrl}/black/`,
    "Blindfold": `${baseUrl}/blindfold/`,
    "Blonde": `${baseUrl}/blonde/`,
    "Blowjob": `${baseUrl}/blowjob/`,
    "Blue Eyes": `${baseUrl}/blue-eyes/`,
    "Bondage": `${baseUrl}/bondage/`,
    "Bra": `${baseUrl}/bra/`,
    "Braces": `${baseUrl}/braces/`,
    "Brazilian": `${baseUrl}/brazilian/`,
    "Breath Play": `${baseUrl}/breath-play/`,
    "Breeding Material": `${baseUrl}/breeding-material/`,
    "British": `${baseUrl}/british/`,
    "Brunette": `${baseUrl}/brunette/`,
    "Bubble Butt": `${baseUrl}/bubble-butt/`,
    "Bukkake": `${baseUrl}/bukkake/`,
    "Bulgarian": `${baseUrl}/bulgarian/`,
    "Bush": `${baseUrl}/bush/`,
    "Buttplug": `${baseUrl}/buttplug/`,
    "Cage": `${baseUrl}/cage/`,
    "Cameltoe": `${baseUrl}/cameltoe/`,
    "Canadian": `${baseUrl}/canadian/`,
    "Candaulism": `${baseUrl}/candaulism/`,
    "Car": `${baseUrl}/car/`,
    "Casting": `${baseUrl}/casting/`,
    "Cat Fights": `${baseUrl}/cat-fights/`,
    "Catholic": `${baseUrl}/catholic/`,
    "Celebrity": `${baseUrl}/celebrity/`,
    "CFNM": `${baseUrl}/cfnm/`,
    "Changing Room": `${baseUrl}/changing-room/`,
    "Cheating": `${baseUrl}/cheating/`,
    "Cheerleader": `${baseUrl}/cheerleader/`,
    "Chinese": `${baseUrl}/chinese/`,
    "Christmas": `${baseUrl}/christmas/`,
    "Close Up": `${baseUrl}/close-up/`,
    "College Girl": `${baseUrl}/college-girl/`,
    "Colombian": `${baseUrl}/colombian/`,
    "Compilation": `${baseUrl}/compilation/`,
    "Condom": `${baseUrl}/condom/`,
    "Cop": `${baseUrl}/cop/`,
    "Corporal Punishment": `${baseUrl}/corporal-punishment/`,
    "Cosplay": `${baseUrl}/cosplay/`,
    "Cougar": `${baseUrl}/cougar/`,
    "Couple": `${baseUrl}/couple/`,
    "Cowgirl": `${baseUrl}/cowgirl/`,
    "Creample": `${baseUrl}/creample/`,
    "Crying": `${baseUrl}/crying/`,
    "Cuckold": `${baseUrl}/cuckold/`,
    "Cum in Mouth": `${baseUrl}/cum-in-mouth/`,
    "Cum on Pussy": `${baseUrl}/cum-on-pussy/`,
    "Cum on Tits": `${baseUrl}/cum-on-tits/`,
    "Cum Swallowing": `${baseUrl}/cum-swallowing/`,
    "Cum Swapping": `${baseUrl}/cum-swapping/`,
    "Cumplay": `${baseUrl}/cumplay/`,
    "Cumshot": `${baseUrl}/cumshot/`,
    "Curly": `${baseUrl}/curly/`,
    "Czech": `${baseUrl}/czech/`,
    "Danish": `${baseUrl}/danish/`,
    "Deepthroat": `${baseUrl}/deepthroat/`,
    "Dildo": `${baseUrl}/dildo/`,
    "Doctor": `${baseUrl}/doctor/`,
    "Doggystyle": `${baseUrl}/doggystyle/`,
    "Domination": `${baseUrl}/domination/`,
    "Double Anal": `${baseUrl}/double-anal/`,
    "Double Blowjob": `${baseUrl}/double-blowjob/`,
    "Double Penetration": `${baseUrl}/double-penetration/`,
    "Double Pussy": `${baseUrl}/double-pussy/`,
    "Dutch": `${baseUrl}/dutch/`,
    "Ebony": `${baseUrl}/ebony/`,
    "Electricity Play": `${baseUrl}/electricity-play/`,
    "Emo": `${baseUrl}/emo/`,
    "Enhanced Body": `${baseUrl}/enhanced-body/`,
    "European": `${baseUrl}/european/`,
    "European Vacation": `${baseUrl}/european-vacation/`,
    "Exclusive": `${baseUrl}/exclusive/`,
    "Exhibitionist": `${baseUrl}/exhibitionist/`,
    "Face Sitting": `${baseUrl}/face-sitting/`,
    "Facefucking": `${baseUrl}/facefucking/`,
    "Facial": `${baseUrl}/facial/`,
    "Fair Skin": `${baseUrl}/fair-skin/`,
    "Fathers Day": `${baseUrl}/fathers-day/`,
    "Feet": `${baseUrl}/feet/`,
    "Female Orgasm": `${baseUrl}/female-orgasm/`,
    "Femdom": `${baseUrl}/femdom/`,
    "Fetish": `${baseUrl}/fetish/`,
    "FFF+": `${baseUrl}/fff-plus/`,
    "FFFMM": `${baseUrl}/fffmm/`,
    "FFM": `${baseUrl}/ffm/`,
    "Fight": `${baseUrl}/fight/`,
    "Finger Licking": `${baseUrl}/finger-licking/`,
    "Fingering": `${baseUrl}/fingering/`,
    "First Anal": `${baseUrl}/first-anal/`,
    "First Time Porn": `${baseUrl}/first-time-porn/`,
    "First Time Sex": `${baseUrl}/first-time-sex/`,
    "Fishnet": `${baseUrl}/fishnet/`,
    "Fisting": `${baseUrl}/fisting/`,
    "Fitness": `${baseUrl}/fitness/`,
    "Flexible": `${baseUrl}/flexible/`,
    "Flogging": `${baseUrl}/flogging/`,
    "Foot Fetish": `${baseUrl}/foot-fetish/`,
    "Footjob": `${baseUrl}/footjob/`,
    "Foursome": `${baseUrl}/foursome/`,
    "FreeUse": `${baseUrl}/freeuse/`,
    "French": `${baseUrl}/french/`,
    "Fucking Machine": `${baseUrl}/fucking-machine/`,
    "Gagging": `${baseUrl}/gagging/`,
    "Gangbang": `${baseUrl}/gangbang/`,
    "Gaping": `${baseUrl}/gaping/`,
    "German": `${baseUrl}/german/`,
    "GILF": `${baseUrl}/gilf/`,
    "Girlfriend": `${baseUrl}/girlfriend/`,
    "Glasses": `${baseUrl}/glasses/`,
    "Gloryhole": `${baseUrl}/gloryhole/`,
    "Gonzo": `${baseUrl}/gonzo/`,
    "Goth": `${baseUrl}/goth/`,
    "Grandpa": `${baseUrl}/grandpa/`,
    "Granny": `${baseUrl}/granny/`,
    "Greek": `${baseUrl}/greek/`,
    "Group Sex": `${baseUrl}/group-sex/`,
    "Gym": `${baseUrl}/gym/`,
    "Gyno Exam": `${baseUrl}/gyno-exam/`,
    "Hairy": `${baseUrl}/hairy/`,
    "Hairy Bush": `${baseUrl}/hairy-bush/`,
    "Hairy Pussy": `${baseUrl}/hairy-pussy/`,
    "Halloween": `${baseUrl}/halloween/`,
    "Handjob": `${baseUrl}/handjob/`,
    "Hardcore": `${baseUrl}/hardcore/`,
    "HC": `${baseUrl}/hc/`,
    "High Heels": `${baseUrl}/high-heels/`,
    "Hijab": `${baseUrl}/hijab/`,
    "Horror": `${baseUrl}/horror/`,
    "Hotel": `${baseUrl}/hotel/`,
    "Housewife": `${baseUrl}/housewife/`,
    "Humiliation": `${baseUrl}/humiliation/`,
    "Hungarian": `${baseUrl}/hungarian/`,
    "Indian": `${baseUrl}/indian/`,
    "Interracial": `${baseUrl}/interracial/`,
    "Interview": `${baseUrl}/interview/`,
    "Iranian": `${baseUrl}/iranian/`,
    "Italian": `${baseUrl}/italian/`,
    "Japanese": `${baseUrl}/japanese/`,
    "JAV Censored": `${baseUrl}/jav-censored/`,
    "JAV Uncensored": `${baseUrl}/jav-uncensored/`,
    "JOI (Jerk Off Instructions)": `${baseUrl}/joi/`,
    "Kissing": `${baseUrl}/kissing/`,
    "Korean": `${baseUrl}/korean/`,
    "Lactating": `${baseUrl}/lactating/`,
    "Latex": `${baseUrl}/latex/`,
    "Latina": `${baseUrl}/latina/`,
    "Lesbian": `${baseUrl}/lesbian/`,
    "Lesbian in Threesome": `${baseUrl}/lesbian-in-threesome/`,
    "Lesdom": `${baseUrl}/lesdom/`,
    "Lingerie": `${baseUrl}/lingerie/`,
    "Lithuanian": `${baseUrl}/lithuanian/`,
    "Long Hair": `${baseUrl}/long-hair/`,
    "Maid": `${baseUrl}/maid/`,
    "Maledom": `${baseUrl}/maledom/`,
    "Massage": `${baseUrl}/massage/`,
    "Masturbation": `${baseUrl}/masturbation/`,
    "Mature": `${baseUrl}/mature/`,
    "Medical": `${baseUrl}/medical/`,
    "Mediterranean": `${baseUrl}/mediterranean/`,
    "Medium Tits": `${baseUrl}/medium-tits/`,
    "Mexican": `${baseUrl}/mexican/`,
    "Midget": `${baseUrl}/midget/`,
    "MILF": `${baseUrl}/milf/`,
    "Military": `${baseUrl}/military/`,
    "Miniskirt": `${baseUrl}/miniskirt/`,
    "Missionary": `${baseUrl}/missionary/`,
    "MMF": `${baseUrl}/mmf/`,
    "MMMF": `${baseUrl}/mmmf/`,
    "MMMFF": `${baseUrl}/mmmff/`,
    "Mom": `${baseUrl}/mom/`,
    "Money": `${baseUrl}/money/`,
    "Mormon": `${baseUrl}/mormon/`,
    "Muscular": `${baseUrl}/muscular/`,
    "Natural Tits": `${baseUrl}/natural-tits/`,
    "Nipples": `${baseUrl}/nipples/`,
    "Nudist": `${baseUrl}/nudist/`,
    "Nurse": `${baseUrl}/nurse/`,
    "Office": `${baseUrl}/office/`,
    "Oiled": `${baseUrl}/oiled/`,
    "Old and Young": `${baseUrl}/old-and-young/`,
    "Orgy": `${baseUrl}/orgy/`,
    "Outdoor": `${baseUrl}/outdoor/`,
    "Pale": `${baseUrl}/pale/`,
    "Panties": `${baseUrl}/panties/`,
    "Pantyhose": `${baseUrl}/pantyhose/`,
    "Parody": `${baseUrl}/parody/`,
    "Party": `${baseUrl}/party/`,
    "Passionate": `${baseUrl}/passionate/`,
    "PAWG": `${baseUrl}/pawg/`,
    "Pasing": `${baseUrl}/pasing/`,
    "Petite": `${baseUrl}/petite/`,
    "Pick up": `${baseUrl}/pick-up/`,
    "Pierding": `${baseUrl}/pierding/`,
    "Pissing": `${baseUrl}/pissing/`,
    "Police": `${baseUrl}/police/`,
    "Polish": `${baseUrl}/polish/`,
    "Pool": `${baseUrl}/pool/`,
    "Pornstar": `${baseUrl}/pornstar/`,
    "Portuguese": `${baseUrl}/portuguese/`,
    "POV": `${baseUrl}/pov/`,
    "Pregnant": `${baseUrl}/pregnant/`,
    "Priest": `${baseUrl}/priest/`,
    "Prison": `${baseUrl}/prison/`,
    "Public": `${baseUrl}/public/`,
    "Puffy Nipples": `${baseUrl}/puffy-nipples/`,
    "Punished": `${baseUrl}/punished/`,
    "Pussy Licking": `${baseUrl}/pussy-licking/`,
    "Pussy to Mouth": `${baseUrl}/pussy-to-mouth/`,
    "Raw": `${baseUrl}/raw/`,
    "Reality": `${baseUrl}/reality/`,
    "Redhead": `${baseUrl}/redhead/`,
    "Religious": `${baseUrl}/religious/`,
    "Restraints": `${baseUrl}/restraints/`,
    "Reverse Cowgirl": `${baseUrl}/reverse-cowgirl/`,
    "Riding": `${baseUrl}/riding/`,
    "Rimming": `${baseUrl}/rimming/`,
    "Role Play": `${baseUrl}/role-play/`,
    "Rope Suspension": `${baseUrl}/rope-suspension/`,
    "Rough Sex": `${baseUrl}/rough-sex/`,
    "Russian": `${baseUrl}/russian/`,
    "School": `${baseUrl}/school/`,
    "Schoolgirl": `${baseUrl}/schoolgirl/`,
    "Scissoring": `${baseUrl}/scissoring/`,
    "Secretary": `${baseUrl}/secretary/`,
    "Seduced": `${baseUrl}/seduced/`,
    "Sex Doll": `${baseUrl}/sex-doll/`,
    "Sex Toys": `${baseUrl}/sex-toys/`,
    "Share": `${baseUrl}/share/`,
    "Shaved": `${baseUrl}/shaved/`,
    "Shaving": `${baseUrl}/shaving/`,
    "Shemale": `${baseUrl}/shemale/`,
    "Shemale Fuck Guy": `${baseUrl}/shemale-fuck-guy/`,
    "Shemale Fuck Shemale": `${baseUrl}/shemale-fuck-shemale/`,
    "Shemale Threesome": `${baseUrl}/shemale-threesome/`,
    "Short Hair": `${baseUrl}/short-hair/`,
    "Shower": `${baseUrl}/shower/`,
    "Skinny": `${baseUrl}/skinny/`,
    "Skirt": `${baseUrl}/skirt/`,
    "Slave": `${baseUrl}/slave/`,
    "Sloppy": `${baseUrl}/sloppy/`,
    "Small Tits": `${baseUrl}/small-tits/`,
    "Smoking": `${baseUrl}/smoking/`,
    "Socks": `${baseUrl}/socks/`,
    "Softcore": `${baseUrl}/softcore/`,
    "Solo": `${baseUrl}/solo/`,
    "Spandex": `${baseUrl}/spandex/`,
    "Spanish": `${baseUrl}/spanish/`,
    "Spanking": `${baseUrl}/spanking/`,
    "Spit Roast": `${baseUrl}/spit-roast/`,
    "Spooning": `${baseUrl}/spooning/`,
    "Sport": `${baseUrl}/sport/`,
    "Sportsball": `${baseUrl}/sportsball/`,
    "Spycam": `${baseUrl}/spycam/`,
    "Squirt": `${baseUrl}/squirt/`,
    "St. Patrick's Day": `${baseUrl}/st-patricks-day/`,
    "Step Fantasy": `${baseUrl}/step-fantasy/`,
    "Stepbrother": `${baseUrl}/stepbrother/`,
    "Stepdad": `${baseUrl}/stepdad/`,
    "Stepdaughter": `${baseUrl}/stepdaughter/`,
    "Stepfamily": `${baseUrl}/stepfamily/`,
    "Stepmom": `${baseUrl}/stepmom/`,
    "Stepsister": `${baseUrl}/stepsister/`,
    "Stepson": `${baseUrl}/stepson/`,
    "Stockings": `${baseUrl}/stockings/`,
    "Strap-on": `${baseUrl}/strap-on/`,
    "Striptease": `${baseUrl}/striptease/`,
    "Stuck": `${baseUrl}/stuck/`,
    "Super Skinny": `${baseUrl}/super-skinny/`,
    "Suspenders": `${baseUrl}/suspenders/`,
    "Swap": `${baseUrl}/swap/`,
    "Swinger": `${baseUrl}/swinger/`,
    "Taboo": `${baseUrl}/taboo/`,
    "Tall Girls": `${baseUrl}/tall-girls/`,
    "Tan Lines": `${baseUrl}/tan-lines/`,
    "Tanned": `${baseUrl}/tanned/`,
    "Tattoo": `${baseUrl}/tattoo/`,
    "Taxi": `${baseUrl}/taxi/`,
    "Teacher": `${baseUrl}/teacher/`,
    "Teen": `${baseUrl}/teen/`,
    "Tentacles": `${baseUrl}/tentacles/`,
    "Thai": `${baseUrl}/thai/`,
    "Thanksgiving": `${baseUrl}/thanksgiving/`,
    "Thong": `${baseUrl}/thong/`,
    "Threesome": `${baseUrl}/threesome/`,
    "Tied Up": `${baseUrl}/tied-up/`,
    "Titty Fuck": `${baseUrl}/titty-fuck/`,
    "Toe Sucking": `${baseUrl}/toe-sucking/`,
    "Trimmed": `${baseUrl}/trimmed/`,
    "Turkish": `${baseUrl}/turkish/`,
    "Twins": `${baseUrl}/twins/`,
    "Ukrainian": `${baseUrl}/ukrainian/`,
    "Uniform": `${baseUrl}/uniform/`,
    "Upskirt": `${baseUrl}/upskirt/`
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
            const baseUrl = manifest.baseUrl || "https://www.wow.xxx/";
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
            
            // Try multiple patterns for title
                 // Extract title
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*WOW\.XXX$/, '').trim() : "Unknown";
            
            // Extract poster
            const posterMatch = html.match(/poster='([^']+)'/);
            const posterUrl = posterMatch ? posterMatch[1] : "";
            
            // Create episode with the video page URL
            // When user clicks this episode, loadStreams will be called with this URL
            const episode = new Episode({
                name: "Play Video",
                url: url,  // This URL will be passed to loadStreams
                season: 1,
                episode: 1,
                posterUrl: posterUrl
            });
            
            // Create MultimediaItem with episodes array
            const item = new MultimediaItem({
                title: title,
                url: url,
                posterUrl: posterUrl,
                type: "movie",
                isAdult: true,
                episodes: [episode]  // THIS IS REQUIRED FOR PLAY BUTTON TO APPEAR
            });
            
            cb({ success: true, data: item });
        } catch (e) {
            console.error("load error: " + e.message);
            cb({ success: false, errorCode: "PARSE_ERROR", message: e.message });
        }
    }

    async function loadStreams(url, cb) {
        try {
            const res = await http_get(url, HEADERS);
            if (res.status !== 200) return cb({ success: false, errorCode: "NETWORK_ERROR" });
            
            const html = res.body || "";
            const streams = [];
            
            // Look for iframes with video sources
            const iframePattern = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
            let match;
            while ((match = iframePattern.exec(html)) !== null) {
                const iframeUrl = match[1];
                // Check if it looks like a video player
                if (iframeUrl.includes('player') || iframeUrl.includes('video') || iframeUrl.includes('embed') || iframeUrl.includes('.mp4') || iframeUrl.includes('.m3u8')) {
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(iframeUrl),
                        source: "Wow",
                        headers: { "Referer": "https://www.wow.xxx", 
 "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Also check for video tag with source
            if (streams.length === 0) {
                const videoPattern = /<video[^>]*>[\s\S]*?<source[^>]*src="([^"]+)"[^>]*>/gi;
                while ((match = videoPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(videoUrl),
                        source: "Video",
                        headers: { "Referer": "https://www.wow.xxx", "User-Agent": HEADERS["User-Agent"] }
                    }));
                }
            }
            
            // Direct video file link
            if (streams.length === 0) {
                const directPattern = /href="([^"]+\.mp4)"[^>]*>/gi;
                while ((match = directPattern.exec(html)) !== null) {
                    const videoUrl = match[1];
                    streams.push(new StreamResult({
                        url: "MAGIC_PROXY_v1" + btoa(videoUrl),
                        source: "Direct",
                        headers: { "Referer": ",https://www.wow.xxx", 
"User-Agent": HEADERS["User-Agent"] }
                    }));
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

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
