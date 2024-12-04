const fetch = require("node-fetch");

// Define constants for bot detection and ignored file extensions
const bots = [
  "googlebot",
  "yahoo! slurp",
  "bingbot",
  "yandex",
  "baiduspider",
  "facebookexternalhit",
  "twitterbot",
  "rogerbot",
  "linkedinbot",
  "embedly",
  "quora link preview",
  "showyoubot",
  "outbrain",
  "pinterest/0.",
  "developers.google.com/+/web/snippet",
  "slackbot",
  "vkshare",
  "w3c_validator",
  "redditbot",
  "applebot",
  "whatsapp",
  "flipboard",
  "tumblr",
  "bitlybot",
  "skypeuripreview",
  "nuzzel",
  "discordbot",
  "google page speed",
  "qwantify",
  "pinterestbot",
  "bitrix link preview",
  "xing-contenttabreceiver",
  "chrome-lighthouse",
  "telegrambot",
  "integration-test", // Integration testing
];

const IGNORE_EXTENSIONS = [
  ".js",
  ".css",
  ".xml",
  ".less",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".pdf",
  ".doc",
  ".txt",
  ".ico",
  ".rss",
  ".zip",
  ".mp3",
  ".rar",
  ".exe",
  ".wmv",
  ".doc",
  ".avi",
  ".ppt",
  ".mpg",
  ".mpeg",
  ".tif",
  ".wav",
  ".mov",
  ".psd",
  ".ai",
  ".xls",
  ".mp4",
  ".m4a",
  ".swf",
  ".dat",
  ".dmg",
  ".iso",
  ".flv",
  ".m4v",
  ".torrent",
  ".woff",
  ".ttf",
  ".svg",
  ".webmanifest",
];

// Define the middleware function
module.exports = async function handler(req, res) {
  const userAgent = req.headers["user-agent"] || "";
  const isBot = bots.some((bot) => userAgent.toLowerCase().includes(bot));
  const isPrerender = req.headers["x-prerender"];
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const extension = pathname.slice(((pathname.lastIndexOf(".") - 1) >>> 0) + 1);

  // Skip if it's a prerender request, not a bot, or matches ignored extensions
  if (
    isPrerender ||
    !isBot ||
    (extension.length && IGNORE_EXTENSIONS.includes(`.${extension}`))
  ) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Normal request, continue serving React app.");
    return;
  }

  // Fetch prerendered content for bot requests
  if (isBot) {
    const prerenderUrl = `http://service.prerender.io/${req.url}`;
    const headers = {
      "X-Prerender-Token": "DgWjIfRQHarYIzZX44Vg",
      "X-Prerender-Int-Type": "React",
    };

    try {
      const response = await fetch(prerenderUrl, { headers });
      if (!response.ok) {
        console.error(`Failed to fetch prerendered content. Status: ${response.status}`);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Error fetching prerendered content.");
        return;
      }

      const html = await response.text();
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      });
      res.end(html);
    } catch (error) {
      console.error("Error fetching prerendered content:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("An error occurred while fetching prerendered content.");
    }
    return;
  }

  // Fallback for non-bot requests
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Not a bot, continue serving React app.");
};


// const fetch = require("node-fetch");

// module.exports = async function handler(req, res) {
//     console.log("Prerender function invoked");
//     const userAgent = req.headers["user-agent"] || "";
//     const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

//     if (isBot) {
//         console.log("Bot detected: Fetching prerendered content");
//         const prerenderUrl = `https://service.prerender.io/${req.url}`;
//         const headers = { "X-Prerender-Token": "DgWjIfRQHarYIzZX44Vg" };

//         try {
//             const snapshot = await fetch(prerenderUrl, { headers });

//             if (!snapshot.ok) {
//                 console.error(`Failed to fetch prerendered content. Status: ${snapshot.status}`);
//                 return res.status(500).send(`Failed to fetch prerendered content. Status: ${snapshot.status}`);
//             }

//             const html = await snapshot.text();

//             res.setHeader("Content-Type", "text/html");
//             res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

//             console.log("Prerendered content served");
//             return res.status(200).send(html);
//         } catch (error) {
//             console.error("Error fetching prerendered content:", error);
//             return res.status(500).send("Error fetching prerendered content:", error);
//         }
//     }

//     // If not a bot, return the original React app

//     console.log("Non-bot user detected: Serving React app");
//     res.status(200).sendFile("index.html", { root: "./public" });
// };
