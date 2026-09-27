import { useEffect, useState } from "react";
import { loadGoogleMapsWeb } from "./maps/platformMaps";

export function useGoogleReady() {
  const [state, setState] = useState(() => ({
    ready: Boolean(window.google?.maps),
    error: null,
  }));

  useEffect(() => {
    if (state.ready) return undefined;
    let active = true;

    loadGoogleMapsWeb()
      .then(() => {
        if (active) setState({ ready: true, error: null });
      })
      .catch((error) => {
        if (active) setState({ ready: false, error });
      });

    return () => {
      active = false;
    };
  }, [state.ready]);

  return state;
}
