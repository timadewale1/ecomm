import fetch from "node-fetch";

export default async function handler(req, res) {
  const userAgent = req.headers["user-agent"] || "";
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

  if (isBot) {
    const prerenderUrl = `https://service.prerender.io/${req.url}`;
    const headers = { "X-Prerender-Token": "DgWjIfRQHarYIzZX44Vg" };

    try {
      const snapshot = await fetch(prerenderUrl, { headers });

      if (!snapshot.ok) {
        console.error(`Failed to fetch prerendered content. Status: ${snapshot.status}`);
        return res.status(500).send("Failed to fetch prerendered content.");
      }

      const html = await snapshot.text();

      res.setHeader("Content-Type", "text/html");
      return res.status(200).send(html);
    } catch (error) {
      console.error("Error fetching prerendered content:", error);
      return res.status(500).send("An error occurred.");
    }
  }

  // If not a bot, return the original React app
  res.status(200).sendFile("index.html", { root: "./public" });
}
