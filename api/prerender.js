const prerender = require("prerender-node");

prerender.set("prerenderToken", "DgWjIfRQHarYIzZX44Vg");

export default async function handler(req, res) {
  const userAgent = req.headers["user-agent"] || "";
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

  if (isBot) {
    const url = `https://service.prerender.io/${req.url}`;
    const headers = { "X-Prerender-Token": "DgWjIfRQHarYIzZX44Vg" };

    const snapshot = await fetch(url, { headers });
    const html = await snapshot.text();

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  } else {
    res.status(404).send("Not Found");
  }
}
