// lib/imageKit.js
/**
 * Build a 1.91:1, 1200×630 center-crop URL for any Firebase Storage raw URL,
 * preserving the encoded path so ImageKit’s proxy can find it.
 */
export function getOgImageUrl(firebaseUrl) {
    if (!firebaseUrl) return "";
  
    try {
      const url = new URL(firebaseUrl);
      // everything after “/o/” is still URL-encoded (e.g. vendorImages%2F…)
      const [, encodedPath] = url.pathname.split("/o/");
      const query = url.search; // “?alt=media&token=…”
      const endpoint = "https://ik.imagekit.io/mythrift/mythrift-proxy";
      // note: no slash after proxy, because encodedPath already starts with vendorImages%2F…
      return `${endpoint}/${encodedPath}${query}&tr=w-1200,h-630,cm-center`;
    } catch {
      return firebaseUrl;
    }
  }
  