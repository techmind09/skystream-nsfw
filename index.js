const axios = require('axios');
const vm = require('vm');
const { JSDOM } = require('jsdom');

async function extractStreamTape(url) {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const dom = new JSDOM(data);
        const scripts = Array.from(dom.window.document.querySelectorAll('script'));

        // 'botlink' wala script dhoondhein
        const targetScript = scripts.find(s => s.textContent.includes("botlink').innerHTML"));

        if (!targetScript) throw new Error("Script not found");

        // Sirf woh line nikalein jismein URL construct ho raha hai
        const scriptLines = targetScript.textContent.split('\n');
        const urlLine = scriptLines.find(l => l.includes("botlink').innerHTML"));

        // Script content ko prepare karein: 
        // 1. '.innerHTML = ' ke baad ka part lenge 
        // 2. Isse ek variable mein daalenge taaki eval kar sakein
        const scriptToEval = urlLine.split(").innerHTML")[1].replace("=", "var result =");

        // VM context mein eval karein
        const sandbox = { result: "" };
        vm.createContext(sandbox);
        vm.runInContext(scriptToEval, sandbox);

        const extractedPath = sandbox.result;
        return `https:${extractedPath}&stream=1`;

    } catch (error) {
        console.error("Extraction Failed:", error.message);
        return null;
    }
}

// Test call
extractStreamTape('https://streamtape.com/e/XXXXXX')
    .then(url => console.log("Direct Video Link:", url));
