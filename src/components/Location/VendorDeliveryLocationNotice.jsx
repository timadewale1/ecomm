import React, {useEffect, useState} from "react";
import {httpsCallable} from "firebase/functions";
import {MapPin, RotateCw} from "lucide-react";
import {auth, functions} from "../../firebase.config";
import {useAuth} from "../../custom-hooks/useAuth";
import {useTawk} from "../Context/TawkProvider";
import {appHaptics} from "../../services/haptics";
import {createVendorDeliveryLocationCheck} from "../../services/vendorDeliveryLocationCheck.mjs";

const checkLocation = createVendorDeliveryLocationCheck({
  currentUser: () => auth.currentUser,
  call: data => httpsCallable(functions, "flagMyVendorDeliveryLocationV1", {timeout: 15000})(data),
});

export default function VendorDeliveryLocationNotice({vendor}) {
  const {currentUser} = useAuth();
  const {openChat} = useTawk();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const uid = vendor?.vendorId;
  const eligible = Boolean(vendor?.profileComplete === true || vendor?.isApproved === true || vendor?.profileCompletedAt);
  // Check independently of dashboard loading. Counter/revenue snapshots must
  // not make another request, and late responses must not cross accounts.
  const scope = JSON.stringify([uid, eligible, vendor?.Address, vendor?.location]);
  useEffect(() => {
    let active = true;
    if (!eligible || !uid || currentUser?.uid !== uid) return undefined;
    setResult({scope, state: "checking"});
    checkLocation(uid).then(needsSupport => {
      if (active) setResult({scope, state: needsSupport ? "flagged" : "clear"});
    }).catch(() => {
      if (active && auth.currentUser?.uid === uid) setResult({scope, state: "error"});
    });
    return () => {active = false;};
  }, [currentUser, eligible, uid, scope, attempt]);

  if (!eligible || currentUser?.uid !== uid || result?.scope !== scope ||
      !["flagged", "error"].includes(result.state)) return null;
  const failed = result.state === "error";
  return (
    <section className="!my-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-gray-900" aria-label="Delivery location support">
      <div className="flex items-start gap-2">
        <MapPin size={19} className="mt-0.5 shrink-0 text-orange-600" aria-hidden="true"/>
        <div>
          <p className="font-bold">{failed ? "Delivery location check unavailable" : "Your delivery location needs attention"}</p>
          <p className="mt-1 leading-relaxed">{failed
            ? "We couldn’t check your saved delivery location. Try again or contact support."
            : "We’ve flagged this for our support team. Contact us to confirm your store’s delivery collection address."}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" className="min-h-10 font-semibold text-orange-700" onClick={() => {
              void appHaptics.selection();
              void openChat({"support-entry": "vendor-delivery-location", screen: "vendordashboard", "vendor-id": uid});
            }}>Contact support</button>
            {failed && <button type="button" className="inline-flex min-h-10 items-center gap-1 font-semibold" onClick={() => setAttempt(value => value + 1)}><RotateCw size={15} aria-hidden="true"/>Retry check</button>}
          </div>
        </div>
      </div>
    </section>
  );
}
