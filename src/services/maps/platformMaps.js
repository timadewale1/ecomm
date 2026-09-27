import { Capacitor, registerPlugin } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

const NativeMapsSupport = registerPlugin("NativeMapsSupport");

const IOS_PLATFORM = "ios";
const GOOGLE_MAPS_SCRIPT_ID = "mythrift-google-maps-script";
const GOOGLE_MAPS_CALLBACK = "__myThriftGoogleMapsReady";
const GOOGLE_MAPS_LOAD_TIMEOUT_MS = 15000;

let webMapsPromise = null;
let nativeConfigurationPromise = null;
let nativeMapsKey = "";

export class MapsServiceError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = "MapsServiceError";
    this.code = code;
    this.cause = cause;
  }
}

export const isNativeIOSMaps = () => Capacitor.getPlatform() === IOS_PLATFORM;
const isNativeLocation = () => Capacitor.isNativePlatform();

const readWebKey = () => String(import.meta.env.VITE_GOOGLE_MAPS_KEY || "").trim();

export const getNativeMapsKey = () => nativeMapsKey;

const normalizeNativeError = (error, fallbackCode = "native-maps-unavailable") => {
  const message = String(error?.message || error || "").toLowerCase();

  if (message.includes("permission") || message.includes("denied")) {
    return new MapsServiceError(
      "location-permission-denied",
      "Location access is turned off. Allow location access in Settings and try again.",
      error
    );
  }

  if (message.includes("network") || message.includes("offline")) {
    return new MapsServiceError(
      "network-unavailable",
      "We couldn’t reach the map service. Check your connection and try again.",
      error
    );
  }

  if (message.includes("api key") || message.includes("configured")) {
    return new MapsServiceError(
      "maps-configuration",
      "Maps are temporarily unavailable. Please try again later.",
      error
    );
  }

  return new MapsServiceError(
    fallbackCode,
    "Maps are temporarily unavailable. Please try again.",
    error
  );
};

export const getMapsErrorMessage = (error) => {
  if (error instanceof MapsServiceError && error.message) return error.message;

  const code = String(error?.code || "").replace(/^OS-PLUG-/, "");
  if (code === "location-permission-denied" || code === "1") {
    return "Location access is turned off. Allow location access in Settings and try again.";
  }

  return "Maps are temporarily unavailable. Please try again.";
};

export const configureNativeMaps = async () => {
  if (!isNativeIOSMaps()) return false;
  if (nativeConfigurationPromise) return nativeConfigurationPromise;

  nativeConfigurationPromise = NativeMapsSupport.configure()
    .then((result) => {
      nativeMapsKey = String(result?.apiKey || "").trim();
      if (!nativeMapsKey) {
        throw new MapsServiceError(
          "maps-configuration",
          "Maps are temporarily unavailable. Please try again later."
        );
      }
      return true;
    })
    .catch((error) => {
      nativeConfigurationPromise = null;
      throw normalizeNativeError(error, "maps-configuration");
    });

  return nativeConfigurationPromise;
};

export const loadGoogleMapsWeb = () => {
  if (typeof window === "undefined") {
    return Promise.reject(
      new MapsServiceError("maps-unavailable", "Maps are unavailable in this environment.")
    );
  }

  if (window.google?.maps?.places) return Promise.resolve(window.google.maps);
  if (webMapsPromise) return webMapsPromise;

  const apiKey = readWebKey();
  if (!apiKey) {
    return Promise.reject(
      new MapsServiceError(
        "maps-configuration",
        "Maps are temporarily unavailable. Please try again later."
      )
    );
  }

  webMapsPromise = new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId;
    const previousAuthFailure = window.gm_authFailure;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      if (window[GOOGLE_MAPS_CALLBACK] === handleReady) {
        delete window[GOOGLE_MAPS_CALLBACK];
      }
      if (window.gm_authFailure === handleAuthFailure) {
        window.gm_authFailure = previousAuthFailure;
      }
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      webMapsPromise = null;
      reject(error);
    };

    const handleReady = () => {
      if (settled) return;
      if (!window.google?.maps?.places) {
        fail(
          new MapsServiceError(
            "maps-load-failed",
            "Maps did not finish loading. Please try again."
          )
        );
        return;
      }

      settled = true;
      cleanup();
      resolve(window.google.maps);
    };

    const handleAuthFailure = () => {
      try {
        previousAuthFailure?.();
      } catch {
        // Preserve the app's own failure result even if a previous callback fails.
      }
      fail(
        new MapsServiceError(
          "maps-authorization-failed",
          "Maps are temporarily unavailable. Please try again later."
        )
      );
    };

    window[GOOGLE_MAPS_CALLBACK] = handleReady;
    window.gm_authFailure = handleAuthFailure;

    let script = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (!script) {
      script = document.createElement("script");
      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.dataset.mythriftGoogleMaps = "true";
      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
        `&libraries=places&loading=async&callback=${GOOGLE_MAPS_CALLBACK}`;
      script.onerror = () =>
        fail(
          new MapsServiceError(
            "maps-network-failed",
            "We couldn’t load maps. Check your connection and try again."
          )
        );
      document.head.appendChild(script);
    } else {
      script.onerror = () =>
        fail(
          new MapsServiceError(
            "maps-network-failed",
            "We couldn’t load maps. Check your connection and try again."
          )
        );
    }

    timeoutId = window.setTimeout(() => {
      if (window.google?.maps?.places) {
        handleReady();
        return;
      }
      fail(
        new MapsServiceError(
          "maps-load-timeout",
          "Maps are taking too long to load. Check your connection and try again."
        )
      );
    }, GOOGLE_MAPS_LOAD_TIMEOUT_MS);
  });

  return webMapsPromise;
};

export const createPlacesSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `places-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const selectNativeAddress = async () => {
  if (!isNativeIOSMaps()) return null;
  await configureNativeMaps();
  try {
    const result = await NativeMapsSupport.presentAutocomplete();
    if (result?.cancelled) return null;
    const lat = Number(result?.lat);
    const lng = Number(result?.lng);
    const address = String(result?.address || "").trim();
    if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new MapsServiceError(
        "place-details-failed",
        "We couldn’t load that address. Please choose another result."
      );
    }
    return { address, lat, lng };
  } catch (error) {
    throw normalizeNativeError(error, "places-search-failed");
  }
};

export const searchAddressPredictions = async ({ input, sessionId }) => {
  const query = String(input || "").trim();
  if (query.length < 3) return [];

  if (isNativeIOSMaps()) {
    await configureNativeMaps();
    try {
      const result = await NativeMapsSupport.autocomplete({
        input: query,
        sessionId,
        countries: ["NG"],
      });
      return Array.isArray(result?.predictions) ? result.predictions : [];
    } catch (error) {
      throw normalizeNativeError(error, "places-search-failed");
    }
  }

  const maps = await loadGoogleMapsWeb();
  const service = new maps.places.AutocompleteService();

  return new Promise((resolve, reject) => {
    service.getPlacePredictions(
      { input: query, componentRestrictions: { country: "ng" } },
      (results, status) => {
        if (status === maps.places.PlacesServiceStatus.OK) {
          resolve(results || []);
          return;
        }
        if (status === maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
          return;
        }
        reject(
          new MapsServiceError(
            "places-search-failed",
            "We couldn’t search for that address. Please try again."
          )
        );
      }
    );
  });
};

export const getAddressPlaceDetails = async ({ placeId, sessionId }) => {
  if (!placeId) {
    throw new MapsServiceError("invalid-place", "Please choose a valid address.");
  }

  if (isNativeIOSMaps()) {
    await configureNativeMaps();
    try {
      return await NativeMapsSupport.placeDetails({ placeId, sessionId });
    } catch (error) {
      throw normalizeNativeError(error, "place-details-failed");
    }
  }

  const maps = await loadGoogleMapsWeb();
  const service = new maps.places.PlacesService(document.createElement("div"));

  return new Promise((resolve, reject) => {
    service.getDetails(
      { placeId, fields: ["formatted_address", "geometry"] },
      (place, status) => {
        if (status === maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          resolve({
            address: place.formatted_address || "",
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
          return;
        }
        reject(
          new MapsServiceError(
            "place-details-failed",
            "We couldn’t load that address. Please choose another result."
          )
        );
      }
    );
  });
};

export const reverseGeocodeAddress = async ({ lat, lng }) => {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    throw new MapsServiceError("invalid-coordinates", "We couldn’t read that location.");
  }

  if (isNativeIOSMaps()) {
    try {
      return await NativeMapsSupport.reverseGeocode({
        lat: Number(lat),
        lng: Number(lng),
      });
    } catch (error) {
      throw normalizeNativeError(error, "reverse-geocode-failed");
    }
  }

  const maps = await loadGoogleMapsWeb();
  const geocoder = new maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        resolve({ address: results[0].formatted_address });
        return;
      }
      reject(
        new MapsServiceError(
          "reverse-geocode-failed",
          "We found your position but couldn’t read its address. Please enter it manually."
        )
      );
    });
  });
};

export const getCurrentCoordinates = async () => {
  if (isNativeLocation()) {
    try {
      const permission = await Geolocation.checkPermissions();
      let locationState = permission?.location;

      if (locationState === "prompt" || locationState === "prompt-with-rationale") {
        const requested = await Geolocation.requestPermissions({ permissions: ["location"] });
        locationState = requested?.location;
      }

      if (locationState === "denied") {
        throw new MapsServiceError(
          "location-permission-denied",
          "Location access is turned off. Allow location access in Settings and try again."
        );
      }

      const result = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      });
      return {
        lat: result.coords.latitude,
        lng: result.coords.longitude,
      };
    } catch (error) {
      if (error instanceof MapsServiceError) throw error;
      throw normalizeNativeError(error, "location-unavailable");
    }
  }

  if (!navigator.geolocation) {
    throw new MapsServiceError(
      "location-unavailable",
      "Location is not supported by this browser. Please enter your address manually."
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      (error) => {
        if (Number(error?.code) === 1) {
          reject(
            new MapsServiceError(
              "location-permission-denied",
              "Location access is turned off. Allow it in your browser and try again.",
              error
            )
          );
          return;
        }
        reject(
          new MapsServiceError(
            "location-unavailable",
            "We couldn’t find your location. Please try again or enter your address manually.",
            error
          )
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
};

export const getNativeRoute = async ({ origin, destination }) => {
  if (!isNativeIOSMaps()) return null;
  await configureNativeMaps();
  try {
    return await NativeMapsSupport.route({ origin, destination });
  } catch (error) {
    throw normalizeNativeError(error, "route-unavailable");
  }
};
