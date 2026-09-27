import React, {useEffect, useState} from "react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {collection, getDocs, query, where} from "firebase/firestore";
import {db} from "../../firebase.config";
import {useAuth} from "../../custom-hooks/useAuth";
import {ensureOfferConversation} from "../../services/offerConversations";
import Loading from "../../components/Loading/Loading";

const offerTime = (offer) => {
  const value = offer?.updatedAt || offer?.createdAt;
  return typeof value?.toMillis === "function" ? value.toMillis() : Number(value || 0);
};

export default function LegacyOfferConversationRedirect() {
  const {offerId} = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {currentUser} = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let cancelled = false;
    const redirect = async () => {
      try {
        let resolvedOfferId = offerId;
        const params = new URLSearchParams(location.search);
        if (offerId === "thread" || params.get("type") === "offerThread") {
          const vendorId = params.get("vendorId");
          const productId = params.get("productId");
          const snapshot = await getDocs(
            query(
              collection(db, "offers"),
              where("buyerId", "==", currentUser.uid),
              where("vendorId", "==", vendorId),
              where("productId", "==", productId),
            ),
          );
          const latest = snapshot.docs
            .map((entry) => ({id: entry.id, ...entry.data()}))
            .sort((a, b) => offerTime(b) - offerTime(a))[0];
          resolvedOfferId = latest?.id;
        }
        if (!resolvedOfferId) throw new Error("Offer unavailable");
        const conversationId = await ensureOfferConversation(resolvedOfferId);
        if (!conversationId) throw new Error("Conversation unavailable");
        if (!cancelled) {
          navigate(
            `/offer-conversations/${conversationId}?focusOffer=${encodeURIComponent(resolvedOfferId)}`,
            {replace: true},
          );
        }
      } catch (error) {
        console.error("[offers] legacy redirect failed", error);
        if (!cancelled) setFailed(true);
      }
    };
    redirect();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, location.search, navigate, offerId]);

  if (failed) {
    return (
      <div className="grid min-h-[100dvh] place-items-center p-6 text-center font-satoshi">
        <div>
          <p className="text-gray-600">This offer conversation could not be opened.</p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-customOrange px-5 py-3 text-white"
            onClick={() => navigate("/offers", {replace: true})}
          >
            Back to offers
          </button>
        </div>
      </div>
    );
  }
  return <Loading />;
}
