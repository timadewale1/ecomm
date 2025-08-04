import React, { useState, useEffect, useRef } from "react";
import { CiSearch } from "react-icons/ci";
import { CiLocationOn } from "react-icons/ci";
import { FaLocationArrow } from "react-icons/fa";

export default function LocationPicker({
  onLocationSelect,
  initialAddress = "",
  initialCoords = null,
}) {
  const [inputValue, setInputValue] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const wrapperRef = useRef();
  const autoSvcRef = useRef();
  const geoCoderRef = useRef();

  useEffect(() => {
    if (window.google && window.google.maps.places) {
      autoSvcRef.current = new window.google.maps.places.AutocompleteService();
      geoCoderRef.current = new window.google.maps.Geocoder();
    }
  }, []);
  useEffect(() => {
    // 1) if address provided, show it
    if (initialAddress) {
      setInputValue(initialAddress);
    }
    // 2) if only coords provided, reverse-geocode them
    if (
      !initialAddress &&
      initialCoords?.lat &&
      initialCoords?.lng &&
      geoCoderRef.current
    ) {
      geoCoderRef.current.geocode(
        { location: { lat: initialCoords.lat, lng: initialCoords.lng } },
        (results, status) => {
          if (status === "OK" && results?.[0]) {
            setInputValue(results[0].formatted_address);
          }
        }
      );
    }
  }, [initialAddress, initialCoords]);

  useEffect(() => {
    const svc = autoSvcRef.current;
    if (!svc || inputValue.length < 3) {
      setPredictions([]);
      return;
    }

    svc.getPlacePredictions(
      { input: inputValue, componentRestrictions: { country: "ng" } },
      (res, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          setPredictions(res);
        } else {
          setPredictions([]);
        }
      }
    );
  }, [inputValue]);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setPredictions([]);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const handleSelect = (pred) => {
    const ps = new window.google.maps.places.PlacesService(
      document.createElement("div")
    );
    ps.getDetails(
      {
        placeId: pred.place_id,
        fields: ["formatted_address", "geometry"],
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address;
          setInputValue(address);
          setPredictions([]);
          onLocationSelect({ lat, lng, address });
        }
      }
    );
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        geoCoderRef.current.geocode(
          { location: { lat, lng } },
          (results, status) => {
            setLoadingLocation(false);
            if (status === "OK" && results[0]) {
              const address = results[0].formatted_address;
              setInputValue(address);
              onLocationSelect({ lat, lng, address });
            } else {
              alert("Could not reverse geocode your location");
            }
          }
        );
      },
      (err) => {
        setLoadingLocation(false);
        console.error("🛰 geolocation error:", err);
        alert("Failed to get your location");
      }
    );
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
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter your address"
          className="w-full h-12 pl-10 pr-4 border border-gray-300 font-opensans rounded-md focus:outline-none focus:ring-2 focus:ring-customOrange"
        />
      </div>

      {predictions.length > 0 && (
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
            fontFamily: "Open Sans, sans-serif",
          }}
        >
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onClick={() => handleSelect(p)}
              style={{
                padding: "10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#f97316")}
              onMouseLeave={(e) => (e.target.style.background = "#fff")}
              className="flex items-center font-opensans text-sm gap-2"
            >
              <FaLocationArrow className="text-customOrange" /> {p.description}
            </li>
          ))}
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
