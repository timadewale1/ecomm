import React, { useEffect, useRef, useState } from "react";
import { GoogleMap, LatLngBounds } from "@capacitor/google-maps";
import {
  configureNativeMaps,
  getMapsErrorMessage,
  getNativeMapsKey,
  getNativeRoute,
  isNativeIOSMaps,
  loadGoogleMapsWeb,
} from "../../services/maps/platformMaps";

const isCoordinate = (value) =>
  Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng));

const normalizeCoordinate = (value) => ({
  lat: Number(value.lat),
  lng: Number(value.lng),
});

const calculateBounds = (coordinates) => {
  const latitudes = coordinates.map(({ lat }) => Number(lat));
  const longitudes = coordinates.map(({ lng }) => Number(lng));
  const southwest = {
    lat: Math.min(...latitudes),
    lng: Math.min(...longitudes),
  };
  const northeast = {
    lat: Math.max(...latitudes),
    lng: Math.max(...longitudes),
  };
  return new LatLngBounds({
    southwest,
    northeast,
    center: {
      lat: (southwest.lat + northeast.lat) / 2,
      lng: (southwest.lng + northeast.lng) / 2,
    },
  });
};

export default function PickupRouteMap({ origin, destination }) {
  const containerRef = useRef(null);
  const nativeMapRef = useRef(null);
  const webMapRef = useRef(null);
  const webRendererRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [routeNotice, setRouteNotice] = useState("");

  useEffect(() => {
    if (!isCoordinate(origin) || !isCoordinate(destination)) {
      setStatus("error");
      setMessage("This pick-up route does not have valid location details.");
      return undefined;
    }

    let cancelled = false;
    const routeOrigin = normalizeCoordinate(origin);
    const routeDestination = normalizeCoordinate(destination);
    setStatus("loading");
    setMessage("");
    setRouteNotice("");

    const startNativeMap = async () => {
      await configureNativeMaps();
      if (cancelled || !containerRef.current) return;

      let routeCoordinates = [];
      try {
        const route = await getNativeRoute({
          origin: routeOrigin,
          destination: routeDestination,
        });
        routeCoordinates = Array.isArray(route?.coordinates) ? route.coordinates : [];
      } catch (error) {
        if (!cancelled) {
          setRouteNotice(
            "The map is available, but driving directions could not be loaded right now."
          );
        }
      }

      if (cancelled || !containerRef.current) return;
      const map = await GoogleMap.create({
        id: "mythrift-pickup-route",
        element: containerRef.current,
        apiKey: getNativeMapsKey(),
        forceCreate: true,
        config: {
          center: routeOrigin,
          zoom: 12,
          disableDefaultUI: true,
        },
      });

      if (cancelled) {
        await map.destroy();
        return;
      }

      nativeMapRef.current = map;
      await map.addMarkers([
        { coordinate: routeOrigin, title: "Your location" },
        { coordinate: routeDestination, title: "Pick-up location" },
      ]);

      if (routeCoordinates.length >= 2) {
        await map.addPolylines([
          {
            path: routeCoordinates,
            strokeColor: "#f9531e",
            strokeOpacity: 1,
            strokeWeight: 5,
            geodesic: false,
          },
        ]);
      }

      const visibleCoordinates =
        routeCoordinates.length >= 2
          ? routeCoordinates
          : [routeOrigin, routeDestination];
      await map.fitBounds(calculateBounds(visibleCoordinates), 52);
      if (!cancelled) setStatus("ready");
    };

    const startWebMap = async () => {
      const maps = await loadGoogleMapsWeb();
      if (cancelled || !containerRef.current) return;

      const map = new maps.Map(containerRef.current, {
        zoom: 12,
        center: routeOrigin,
      });
      webMapRef.current = map;

      const renderer = new maps.DirectionsRenderer({
        map,
        preserveViewport: true,
        suppressMarkers: false,
      });
      webRendererRef.current = renderer;

      const routeTimeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setRouteNotice(
          "The map is available, but driving directions could not be loaded right now."
        );
        setStatus("ready");
      }, 12000);

      new maps.DirectionsService().route(
        {
          origin: routeOrigin,
          destination: routeDestination,
          travelMode: maps.TravelMode.DRIVING,
        },
        (result, directionStatus) => {
          if (cancelled) return;
          window.clearTimeout(routeTimeoutId);
          if (directionStatus === "OK" && result?.routes?.length) {
            renderer.setDirections(result);
            setRouteNotice("");
          } else {
            setRouteNotice(
              "The map is available, but driving directions could not be loaded right now."
            );
          }
          setStatus("ready");
        }
      );
    };

    const start = isNativeIOSMaps() ? startNativeMap : startWebMap;
    start().catch((error) => {
      if (cancelled) return;
      setStatus("error");
      setMessage(getMapsErrorMessage(error));
    });

    return () => {
      cancelled = true;
      webRendererRef.current?.setMap?.(null);
      webRendererRef.current = null;
      webMapRef.current = null;

      const nativeMap = nativeMapRef.current;
      nativeMapRef.current = null;
      if (nativeMap) void nativeMap.destroy();
    };
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-100">
      <capacitor-google-map
        ref={containerRef}
        aria-label="Route to the pick-up location"
        className="block h-full w-full"
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
          <div
            aria-label="Loading map"
            className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-customOrange"
          />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white px-8 text-center">
          <p className="font-opensans text-sm text-gray-600">{message}</p>
        </div>
      )}

      {status === "ready" && routeNotice && (
        <div className="absolute left-4 right-4 top-4 z-10 rounded-xl bg-white/95 px-3 py-2 shadow-sm">
          <p className="font-opensans text-xs text-gray-600">{routeNotice}</p>
        </div>
      )}
    </div>
  );
}
