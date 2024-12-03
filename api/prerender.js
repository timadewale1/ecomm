const fetch = require("node-fetch");

module.exports = async function handler(req, res) {
    console.log("Prerender function invoked");
    const userAgent = req.headers["user-agent"] || "";
    const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

    if (isBot) {
        console.log("Bot detected: Fetching prerendered content");
        const prerenderUrl = `https://service.prerender.io/${req.url}`;
        const headers = { "X-Prerender-Token": "DgWjIfRQHarYIzZX44Vg" };

        try {
            const snapshot = await fetch(prerenderUrl, { headers });

            if (!snapshot.ok) {
                console.error(`Failed to fetch prerendered content. Status: ${snapshot.status}`);
                return res.status(500).send(`Failed to fetch prerendered content. Status: ${snapshot.status}`);
            }

            const html = await snapshot.text();

            res.setHeader("Content-Type", "text/html");
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

            console.log("Prerendered content served");
            return res.status(200).send(html);
        } catch (error) {
            console.error("Error fetching prerendered content:", error);
            return res.status(500).send("Error fetching prerendered content:", error);
        }
    }

    // If not a bot, return the original React app

    console.log("Non-bot user detected: Serving React app");
    res.status(200).sendFile("index.html", { root: "./public" });
};
