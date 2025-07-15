// src/components/Pickup/PickupInfo.jsx
import React, { useEffect, useState, useRef } from "react";
import Modal from "react-modal";
import { AnimatePresence, motion } from "framer-motion";
import { MdDeliveryDining } from "react-icons/md";
import { GoLocation, GoChevronLeft, GoChevronRight } from "react-icons/go";
import Pickup from "../Loading/Pickup";

/* ---------------------------------------------------------------
   tiny helper — translate metres / seconds → friendly copy
---------------------------------------------------------------- */
const getTripAdvice = (meters, seconds) => {
  const km = meters / 1000;
  if (km < 2)
    return { headline: "Quick walk 🚶", sub: "Less than 2 km from you" };
  if (km < 5)
    return {
      headline: "One bus leg 🚌",
      sub: "About 1 short ride away, probably a keke will do",
    };
  return {
    headline: "Plan your trip 🗺️",
    sub: "A bit of a journey to the pickup point",
  };
};

/* ----------------------------------------------------------------
   Lightweight Map modal (same pattern you use in Checkout)
---------------------------------------------------------------- */
const MapModal = ({ isOpen, onClose, origin, destination }) => {
  const [ready, setReady] = useState(Boolean(window.google?.maps));
  const mapRef = useRef(null);
  const rendererRef = useRef(null);
  const [directions, setDirections] = useState(null);

  useEffect(() => {
    if (ready) return;
    window.initMap = () => setReady(true);
  }, [ready]);

  /* call Directions API */
  useEffect(() => {
    if (!ready || !origin || !destination) return;
    new window.google.maps.DirectionsService().route(
      { origin, destination, travelMode: "DRIVING" },
      (res, status) =>
        status === "OK" && res.routes.length && setDirections(res)
    );
  }, [ready, origin, destination]);

  /* push route into renderer when it arrives */
  useEffect(() => {
    if (rendererRef.current && directions) {
      rendererRef.current.setDirections(directions);
    }
  }, [directions]);

  /* mount / un-mount map instance */
  const handleMapMount = (el) => {
    if (!el || mapRef.current) return;
    const map = new window.google.maps.Map(el, { center: origin, zoom: 12 });
    mapRef.current = map;
    rendererRef.current = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
    });
    if (directions) rendererRef.current.setDirections(directions);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName="fixed inset-0 bg-black/50 flex items-end z-50"
      className="bg-white w-full h-[75vh] rounded-t-3xl shadow-xl relative"
      ariaHideApp={false}
    >
      {ready ? (
        <div ref={handleMapMount} className="w-full h-full" />
      ) : (
        <div className="h-full animate-pulse flex items-center justify-center">
          Loading map…
        </div>
      )}

      <button
        onClick={onClose}
        className="absolute bottom-4 left-1/2 -translate-x-1/2
                   px-6 py-3 bg-black/20 backdrop-blur-md text-white
                   rounded-full font-opensans text-sm"
      >
        Close
      </button>
    </Modal>
  );
};

/* ----------------------------------------------------------------
   The pickup-intro modal used in StorePage
---------------------------------------------------------------- */
const PickupInfoModal = ({
  vendor, // full vendor doc (must include pickupLat/Lng)
  currentUserCoords, // { lat, lng }  — null until we know user loc
  isOpen,
  onClose,
}) => {
  const [pickupDistance, setPickupDistance] = useState(null);
  const [tripAdvice, setTripAdvice] = useState(null);
  const [showMap, setShowMap] = useState(false);

  /* call Distance-Matrix when everything is available */
  useEffect(() => {
    if (
      !isOpen ||
      !currentUserCoords ||
      vendor?.pickupLat == null ||
      !window.google?.maps?.DistanceMatrixService
    )
      return;

    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [currentUserCoords],
        destinations: [
          { lat: Number(vendor.pickupLat), lng: Number(vendor.pickupLng) },
        ],
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (res, status) => {
        if (status === "OK" && res.rows?.[0]?.elements?.[0]?.status === "OK") {
          const el = res.rows[0].elements[0];
          setPickupDistance(el.distance.text);
          setTripAdvice(getTripAdvice(el.distance.value, el.duration.value));
        }
      }
    );
  }, [isOpen, currentUserCoords, vendor]);

  const origin = currentUserCoords;
  const destination =
    vendor && vendor.pickupLat != null
      ? { lat: Number(vendor.pickupLat), lng: Number(vendor.pickupLng) }
      : null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <Modal
            isOpen
            onRequestClose={onClose}
            ariaHideApp={false}
            overlayClassName="fixed inset-0 bg-black/50 flex items-end z-50"
            className="bg-white w-full max-w-md h-[60vh] rounded-t-3xl shadow-xl p-4 flex flex-col"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex-1 flex flex-col"
            >
              {/* ─── header ─────────────────────────────────────────────── */}
              <div className="flex flex-col items-center mb-4">
                <Pickup />
                <h2 className="text-lg font-opensans font-semibold">
                  {vendor?.shopName || "This vendor"} offers&nbsp;Pick‑up!
                </h2>
              </div>

              {/* ─── body ───────────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto pr-0.5">
                {/* ① distance / copy  */}
                {currentUserCoords ? (
                  pickupDistance ? (
                    <p className="text-sm font-opensans text-gray-800 mb-2">
                      The pick‑up point is about&nbsp;
                      <span className="font-semibold text-customOrange">
                        {pickupDistance}
                      </span>{" "}
                      from you.
                    </p>
                  ) : (
                    <p className="text-xs animate-pulse font-opensans text-gray-500 mb-2">
                      Calculating estimated distance to pick‑up point…
                    </p>
                  )
                ) : (
                  <p className="text-xs font-opensans text-gray-500 mb-2">
                    Enable location to see distance and map directions.
                  </p>
                )}

                {/* ② trip advice card (only if we’ve got advice) */}
                {tripAdvice && (
                  <div className="bg-orange-50 rounded-lg p-3 flex items-start space-x-2">
                    <GoLocation className="text-orange-600 text-xl mt-0.5" />
                    <div>
                      <p className="text-xs font-opensans font-semibold text-orange-700">
                        {tripAdvice.headline}
                      </p>
                      <p className="text-xs font-opensans text-orange-700">
                        {tripAdvice.sub}
                      </p>
                    </div>
                  </div>
                )}

                <ul className="mt-4 text-xs font-opensans space-y-1">
                  <li className="flex items-start">
                    <GoChevronRight className="text-customOrange mt-0.5 mr-1" />
                    Exact pick‑up point and route shown on the map.
                  </li>
                  <li className="flex items-start">
                    <GoChevronRight className="text-customOrange mt-0.5 mr-1" />
                    Order is protected with Pick‑up codes!
                  </li>
                </ul>
              </div>

              {/* ─── footer ─────────────────────────────────────────────── */}
              <div className="mt-6 flex mb-4 flex-col gap-3">
                {currentUserCoords && (
                  <button
                    onClick={() => {
                      setShowMap(true);
                      onClose(); // hide this intro modal
                    }}
                    className="w-full py-3 rounded-full bg-customOrange text-white font-opensans font-semibold shadow-sm"
                  >
                    View pick‑up location
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-full border border-gray-300 text-gray-700 font-opensans font-medium"
                >
                  {currentUserCoords ? "Maybe later" : "Close"}
                </button>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* nested map modal */}
      <MapModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        origin={origin}
        destination={destination}
      />
    </>
  );
};

export default PickupInfoModal;
