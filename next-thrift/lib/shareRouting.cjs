// Server-side settings: changing the app destination never changes the share URL.
function configuredOrigin(value, fallback, hosts) {
  const url = new URL(value || fallback);
  if (url.protocol !== "https:" || !hosts.includes(url.hostname) || url.port ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Invalid My Thrift share routing configuration");
  }
  return url.origin;
}

function getOrigins(env = process.env) {
  return {
    app: configuredOrigin(env.MYTHRIFT_APP_ORIGIN, "https://shopmythrift.store", [
      "shopmythrift.store", "www.shopmythrift.store", "app.shopmythrift.com",
    ]),
    public: configuredOrigin(env.MYTHRIFT_PUBLIC_ORIGIN, "https://mx.shopmythrift.store", [
      "mx.shopmythrift.store", "shopmythrift.com", "www.shopmythrift.com",
    ]),
  };
}

function isPreviewCrawler(ua = "") {
  return /(facebookexternalhit|Facebot|Twitterbot|Slackbot|WhatsApp|SnapchatExternalHit|LinkedInBot|TelegramBot|Discordbot|Pinterestbot|Googlebot|bingbot|Applebot)/i.test(ua);
}

function prepareShareResponse(res) {
  // The same URL returns a redirect to people and metadata to crawlers. Never
  // let a CDN cache one response and accidentally serve it to the other group.
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  const existing = String(res.getHeader("Vary") || "");
  const values = existing.split(",").map((value) => value.trim()).filter(Boolean);
  if (!values.some((value) => value.toLowerCase() === "user-agent")) values.push("User-Agent");
  res.setHeader("Vary", values.join(", "));
}

function appDestination(kind, id, resolvedUrl = "", env) {
  if (!["product", "store"].includes(kind)) throw new Error("Invalid share route");
  const destination = new URL(`/${kind}/${encodeURIComponent(id)}`, getOrigins(env).app);
  // resolvedUrl avoids Next's dynamic params being injected as query params.
  destination.search = new URL(resolvedUrl || "/", "https://share.invalid").search;
  destination.searchParams.set("shared", "true");
  return destination.href;
}

function canonicalUrl(kind, { id, slug }, env) {
  const path = kind === "store" && slug
    ? `/${encodeURIComponent(slug)}`
    : `/${kind}/${encodeURIComponent(id)}`;
  return new URL(path, getOrigins(env).public).href;
}

// Do not put entire Firestore documents (e.g. bank/contact/verification fields)
// into publicly readable __NEXT_DATA__ just to render a social preview.
function previewProduct(id, data) {
  return {
    id, name: data.name || "My Thrift product", description: data.description || "",
    price: data.price ?? null, discountPrice: data.discountPrice ?? null,
    coverImageUrl: data.coverImageUrl || "", imageUrls: data.imageUrls || [],
  };
}

function previewVendor(id, data) {
  return {
    id, slug: data.slug || "", shopName: data.shopName || "My Thrift store",
    description: data.description || "", coverImageUrl: data.coverImageUrl || "",
  };
}

module.exports = { getOrigins, isPreviewCrawler, prepareShareResponse, appDestination, canonicalUrl, previewProduct, previewVendor };
