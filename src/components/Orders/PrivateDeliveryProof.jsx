import React, {useEffect, useState} from "react";
import {onAuthStateChanged} from "firebase/auth";
import {auth} from "../../firebase.config";
import {loadDeliveryProof} from "../../services/privateMedia";
import {appHaptics} from "../../services/haptics";

export default function PrivateDeliveryProof({entityType, entityId, proof, onView}) {
  const [state, setState] = useState({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const session = auth.currentUser;
    let url;
    setState({});
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user !== session) {
        controller.abort();
        if (url) URL.revokeObjectURL(url);
        onView(null);
        setState({error: "Please sign in again to view this image."});
      }
    });
    loadDeliveryProof(entityType, entityId, {signal: controller.signal}).then(blob => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setState({url});
    }).catch(error => {
      if (!controller.signal.aborted) setState({error: error.message});
    });
    return () => {controller.abort(); unsubscribe(); if (url) URL.revokeObjectURL(url);};
  }, [entityType, entityId, proof?.generation, proof?.storagePath, attempt, onView]);
  return <section className="order-detail-section">
    <h2 className="order-section-title">Delivery proof</h2>
    {state.url ? <button type="button" className="order-delivery-proof" aria-label="View delivery proof image"
      onClick={() => {appHaptics.selection(); onView(state.url);}}>
      <img src={state.url} alt={proof.kind === "pickup_collection" ? "Proof of pickup collection" : "Proof of courier handover"} />
      <span>Tap to view</span>
    </button> : <div role="status" className="order-delivery-proof-note">
      {state.error || "Loading delivery proof…"}
      {state.error && <button type="button" onClick={() => setAttempt(n => n + 1)}>Try again</button>}
    </div>}
    <p className="order-delivery-proof-note">{proof.kind === "pickup_collection"
      ? "Added by the vendor when collection was confirmed."
      : "Added by the vendor when the parcel was handed to the courier."}</p>
  </section>;
}
