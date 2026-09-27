// Keep legacy defaults until DNS, TLS and authentication have been verified.
// Vercel/mobile builds opt into the new domains using the two VITE_* values.
const LEGACY_APP = "https://shopmythrift.store";
const LEGACY_SHARE = "https://mx.shopmythrift.store";

function origin(value, fallback, allowedHosts) {
  if (!value) return fallback;
  const url = new URL(value);
  if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname) ||
      url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Invalid My Thrift domain configuration");
  }
  return url.origin;
}

export function createSiteUrls({ appOrigin, shareOrigin } = {}) {
  const app = origin(appOrigin, LEGACY_APP, [
    "shopmythrift.store", "www.shopmythrift.store", "app.shopmythrift.com",
  ]);
  const share = origin(shareOrigin, LEGACY_SHARE, [
    "mx.shopmythrift.store", "shopmythrift.com", "www.shopmythrift.com",
  ]);
  const pathUrl = (base, path = "/") => {
    if (!String(path).startsWith("/") || String(path).startsWith("//") || String(path).includes("\\")) {
      throw new Error("Expected a relative My Thrift path");
    }
    return new URL(path, base).href;
  };
  return {
    appOrigin: app,
    shareOrigin: share,
    appUrl: (path) => pathUrl(app, path),
    productShareUrl: (id) => pathUrl(share, `/product/${encodeURIComponent(id)}?shared=true`),
    storeShareUrl: ({ slug, id }) => slug
      ? pathUrl(share, `/${encodeURIComponent(slug)}`)
      : pathUrl(share, `/store/${encodeURIComponent(id)}?shared=true`),
  };
}

export const siteUrls = createSiteUrls({
  appOrigin: import.meta.env?.VITE_APP_ORIGIN,
  shareOrigin: import.meta.env?.VITE_SHARE_ORIGIN,
});

// Public-site pages/slugs are deliberately not treated as React app routes.
// A store slug is resolved by Next.js before it redirects to /store/:id.
export function getAppPath(value) {
  try {
    const url = new URL(value, siteUrls.appOrigin);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port) return null;
    const appHosts = ["shopmythrift.store", "www.shopmythrift.store", "app.shopmythrift.com"];
    const shareHosts = ["mx.shopmythrift.store", "mx.shopmythrift.com", "shopmythrift.com", "www.shopmythrift.com"];
    if (!appHosts.includes(url.hostname) &&
        !(shareHosts.includes(url.hostname) && /^\/(product|store)\/[^/]+\/?$/.test(url.pathname))) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
