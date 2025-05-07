// lib/imageKit.js

/**
 * Build a 1.91:1, 1200×630 crop URL for any Firebase Storage raw URL.
 */
export function getOgImageUrl(firebaseUrl) {
    if (!firebaseUrl) return "";
  
    // Parse out the “/o/…?token=” portion
    let path = "";
    try {
      const url = new URL(firebaseUrl);
      const [, encoded] = url.pathname.split("/o/");
      path = decodeURIComponent(encoded);
    } catch (e) {
      // fallback if parsing fails
      return firebaseUrl;
    }
  
    // Compose your ImageKit proxy + transformation string
    // NOTE: must end your endpoint with a slash
    const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    return `${endpoint}tr:w-1200,h-630,cm-center/${path}`;
  }
  