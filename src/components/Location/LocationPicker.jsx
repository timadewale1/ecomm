import React, { useState, useEffect, useRef } from "react";
import { CiSearch } from "react-icons/ci";
import { FaLocationArrow } from "react-icons/fa";
import toast from "react-hot-toast";
import {
  createPlacesSessionId,
  getAddressPlaceDetails,
  getCurrentCoordinates,
  getMapsErrorMessage,
  isNativeIOSMaps,
  reverseGeocodeAddress,
  searchAddressPredictions,
  selectNativeAddress,
} from "../../services/maps/platformMaps";

export default function LocationPicker({
  onLocationSelect,
  initialAddress = "",
  initialCoords = null,
}) {
  const [inputValue, setInputValue] = useState(initialAddress || "");
  const [predictions, setPredictions] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searching, setSearching] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const wrapperRef = useRef();
  const sessionIdRef = useRef(createPlacesSessionId());
  const searchGenerationRef = useRef(0);
  const suppressNextSearchRef = useRef(Boolean(initialAddress));
  const nativeIOS = isNativeIOSMaps();

  useEffect(() => {
    if (initialAddress) {
      suppressNextSearchRef.current = true;
      setInputValue(initialAddress);
    }
  }, [initialAddress]);

  useEffect(() => {
    if (initialAddress || !initialCoords) return undefined;
    const lat = Number(initialCoords.lat);
    const lng = Number(initialCoords.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

    let cancelled = false;
    reverseGeocodeAddress({ lat, lng })
      .then(({ address }) => {
        if (!cancelled && address) {
          suppressNextSearchRef.current = true;
          setInputValue(address);
        }
      })
      .catch(() => {
        // Existing saved coordinates remain valid even if display lookup fails.
      });

    return () => {
      cancelled = true;
    };
  }, [initialAddress, initialCoords?.lat, initialCoords?.lng]);

  useEffect(() => {
    if (nativeIOS) return undefined;
    const query = inputValue.trim();
    const generation = ++searchGenerationRef.current;

    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      setPredictions([]);
      setSearching(false);
      setServiceError("");
      return undefined;
    }

    if (query.length < 3) {
      setPredictions([]);
      setSearching(false);
      setServiceError("");
      return undefined;
    }

    setSearching(true);
    setServiceError("");
    const timeoutId = window.setTimeout(() => {
      searchAddressPredictions({
        input: query,
        sessionId: sessionIdRef.current,
      })
        .then((results) => {
          if (generation !== searchGenerationRef.current) return;
          setPredictions(results);
        })
        .catch((error) => {
          if (generation !== searchGenerationRef.current) return;
          setPredictions([]);
          setServiceError(getMapsErrorMessage(error));
        })
        .finally(() => {
          if (generation === searchGenerationRef.current) setSearching(false);
        });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [inputValue, nativeIOS]);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setPredictions([]);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const handleSelect = async (prediction) => {
    setSearching(true);
    setServiceError("");
    try {
      const location = await getAddressPlaceDetails({
        placeId: prediction.place_id,
        sessionId: sessionIdRef.current,
      });
      suppressNextSearchRef.current = true;
      setInputValue(location.address);
      setPredictions([]);
      sessionIdRef.current = createPlacesSessionId();
      onLocationSelect(location);
    } catch (error) {
      toast.error(getMapsErrorMessage(error));
    } finally {
      setSearching(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    setServiceError("");
    try {
      const { lat, lng } = await getCurrentCoordinates();
      const { address } = await reverseGeocodeAddress({ lat, lng });
      suppressNextSearchRef.current = true;
      setInputValue(address);
      setPredictions([]);
      sessionIdRef.current = createPlacesSessionId();
      onLocationSelect({ lat, lng, address });
    } catch (error) {
      toast.error(getMapsErrorMessage(error));
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleNativeAddressSelection = async () => {
    setSearching(true);
    setServiceError("");
    try {
      const location = await selectNativeAddress();
      if (!location) return;
      setInputValue(location.address);
      onLocationSelect(location);
    } catch (error) {
      const message = getMapsErrorMessage(error);
      setServiceError(message);
      toast.error(message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative" }}>
        <CiSearch
          style={{
            position: "absolute",
            top: "50%",
            left: 10,
            transform: "translateY(-50%)",
            color: "#999",
            fontSize: "20px",
          }}
        />
        {nativeIOS ? (
          <button
            type="button"
            onClick={handleNativeAddressSelection}
            className="flex h-12 w-full items-center rounded-md border border-gray-300 bg-white pl-10 pr-10 text-left font-satoshi focus:outline-none focus:ring-2 focus:ring-customOrange"
            aria-label={inputValue ? `Change address, currently ${inputValue}` : "Choose an address"}
          >
            <span className={inputValue ? "truncate text-gray-900" : "text-gray-400"}>
              {inputValue || "Enter your address"}
            </span>
          </button>
        ) : (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter your address"
            className="w-full h-12 pl-10 pr-4 border border-gray-300 font-satoshi rounded-md focus:outline-none focus:ring-2 focus:ring-customOrange"
          />
        )}
        {searching && !loadingLocation && (
          <span
            aria-label="Searching addresses"
            className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-300 border-t-customOrange"
          />
        )}
      </div>

      {serviceError && (
        <p className="mt-1 text-xs font-opensans text-red-500" role="status">
          {serviceError}
        </p>
      )}

      {!nativeIOS && predictions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            maxHeight: 200,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #ccc",
            borderTop: "none",
            margin: 0,
            padding: 0,
            listStyle: "none",
            zIndex: 1000,
            fontFamily: "Satoshi, sans-serif",
          }}
        >
          {predictions.map((prediction) => (
            <li key={prediction.place_id}>
              <button
                type="button"
                onClick={() => handleSelect(prediction)}
                className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2.5 text-left font-opensans text-sm active:bg-gray-50"
              >
                <FaLocationArrow className="shrink-0 text-customOrange" />
                <span>{prediction.description}</span>
              </button>
            </li>
          ))}
          <li className="px-3 py-1.5 text-right font-opensans text-[10px] text-gray-400">
            Powered by Google
          </li>
        </ul>
      )}

      <div className="border-b border-gray-200 mt-4"></div>

      <button
        type="button"
        onClick={handleUseCurrentLocation}
        className="flex items-center gap-2 text-sm text-customOrange font-opensans font-semibold py-2"
      >
        {loadingLocation ? (
          <div className="w-4 h-4 border-2 border-customOrange border-t-transparent rounded-full animate-spin" />
        ) : (
          <FaLocationArrow style={{ fontSize: "18px" }} />
        )}
        Use current location
      </button>
    </div>
  );
}
