/* useGoogleReady.js ----------------------------------------------------- */
import { useEffect, useState } from "react";

const isMapsLoaded = () => Boolean(window.google && window.google.maps);

export function useGoogleReady() {
  const [ready, setReady] = useState(isMapsLoaded());

  useEffect(() => {
    if (ready) return;                        // already loaded

    // the <script …callback=initMap> tag in index.html calls this
    window.initMap = () => setReady(true);
  }, [ready]);

  return ready;
}
