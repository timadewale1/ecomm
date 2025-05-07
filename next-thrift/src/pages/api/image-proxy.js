import fetch from "node-fetch";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    res.status(400).send("Missing `url` parameter");
    return;
  }

  try {
    // decode incoming URL
    const imageUrl = decodeURIComponent(url);

    // fetch from Firebase Storage (or wherever)
    const upstream = await fetch(imageUrl);
    if (!upstream.ok) {
      res.status(upstream.status).send("Upstream error");
      return;
    }

    // stream the buffer back to client
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // cache on CDN / crawlers for 1 day
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");

    const arrayBuffer = await upstream.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (e) {
    console.error("Proxy error:", e);
    res.status(500).send("Proxy failed");
  }
}
