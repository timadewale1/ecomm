import React, { useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Banknote,
  Building2,
  CalendarDays,
  Clock3,
  Edit3,
  Info,
  LockKeyhole,
  Mail,
  MapPin,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Store,
  Tags,
  UserRound,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { VendorContext } from "../../components/Context/Vendorcontext";
import { AccessContext } from "../../components/Context/AccesContext";
import { useTawk } from "../../components/Context/TawkProvider";
import Loading from "../../components/Loading/Loading";
import AppPageHeader from "../../components/layout/AppPageHeader";
import { setVendorProfile } from "../../redux/vendorProfileSlice";
import { appHaptics } from "../../services/haptics";
import {
  updateVendorProfileField,
  vendorProfileErrorMessage,
} from "../../services/vendorProfileManagement";
import EditFieldModal from "./EditFieldModal";
import "./vendor-profile-details.css";

const POLICY_TEXT = {
  NO_RETURNS: "All sales final — no returns",
  NO_RETURNS_AFTER_24HRS: "No returns after 24 hours",
  NO_RETURNS_IF_CORRECT_ITEM: "No returns if the item matches the order",
  NO_RETURNS_SIZE_COLOR: "No returns for buyer size or colour errors",
  RETURNS_EXCHANGE_ONLY: "Returns accepted — exchange only",
  RETURNS_REFUND_IF_DEFECT: "Return and refund if defective",
  RETURNS_REFUND_FLEX: "Flexible returns and refunds",
  NONE: "Not set",
};

const asMillis = (value) => {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
};
const maskAccount = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return [];
  return digits.split("").map((digit, index) =>
    index < digits.length - 4 ? "•" : digit,
  );
};
const readableDate = (value) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
}).format(new Date(value));

function DetailRow({icon: Icon, label, value, note, onEdit, actionLabel, locked = false}) {
  return (
    <div className="vendor-detail-row">
      <Icon aria-hidden="true" />
      <div className="vendor-detail-copy">
        <span>{label}</span>
        <strong>{value || "Not set"}</strong>
        {note && <small>{note}</small>}
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label={actionLabel || `Edit ${label}`}>
          {locked ? <LockKeyhole /> : <Edit3 />}
        </button>
      )}
    </div>
  );
}

export default function VprofileDetails({onBack}) {
  const dispatch = useDispatch();
  const reduxProfile = useSelector((state) => state.vendorProfile.data);
  const {vendorData, loading} = useContext(VendorContext);
  const {setHideBottomBar} = useContext(AccessContext);
  const {openChat} = useTawk();
  const [profile, setProfile] = useState(vendorData || reduxProfile || {});
  const [editingField, setEditingField] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Details shares /vendor-profile with the parent menu, so route-based hiding
  // cannot distinguish it. Restore navigation when the detail view unmounts.
  useLayoutEffect(() => {
    setHideBottomBar(true);
    return () => setHideBottomBar(false);
  }, [setHideBottomBar]);

  useEffect(() => {
    if (vendorData) {
      setProfile(vendorData);
      dispatch(setVendorProfile({...vendorData}));
    }
  }, [dispatch, vendorData]);

  const descriptionNextAt = asMillis(profile.descriptionUpdatedAt) + 7 * 86400000;
  const descriptionLocked = asMillis(profile.descriptionUpdatedAt) > 0 && descriptionNextAt > Date.now();
  const policyLocked = Boolean(profile.returnPolicySelfServiceUpdatedAt);
  const maskedAccount = useMemo(
    () => maskAccount(profile.bankDetails?.accountNumber).join(""),
    [profile.bankDetails?.accountNumber],
  );

  if (loading && !vendorData && !reduxProfile) {
    return <div className="vendor-detail-loading"><Loading /></div>;
  }

  const openSupport = (topic) => openChat({
    "support-entry": "vendor-profile-details",
    screen: "vendor-profile-details",
    topic,
    "vendor-id": profile.vendorId || profile.uid,
  });

  const edit = (field, value, locked, message) => {
    if (locked) {
      toast(message);
      return;
    }
    void appHaptics.selection();
    setEditingField({field, value});
  };

  const handleSave = async (field, value) => {
    if (processing) return false;
    setProcessing(true);
    try {
      const result = await updateVendorProfileField(field, value);
      const patch = {
        [field]: result.value,
        ...(field === "description" ? {descriptionUpdatedAt: result.committedAt} : {}),
        ...(field === "returnPolicy" ? {returnPolicySelfServiceUpdatedAt: result.committedAt} : {}),
      };
      setProfile((current) => ({...current, ...patch}));
      dispatch(setVendorProfile({...profile, ...patch}));
      setEditingField(null);
      void appHaptics.success();
      toast.success("Profile updated");
      return true;
    } catch (error) {
      console.error("Vendor profile update failed:", error);
      void appHaptics.error();
      toast.error(vendorProfileErrorMessage(error));
      return false;
    } finally {
      setProcessing(false);
    }
  };

  const returnPolicy = profile.returnPolicy || {type: "NONE", notes: ""};
  const sourcingMarket = Array.isArray(profile.sourcingMarket)
    ? profile.sourcingMarket.join(", ")
    : profile.sourcingMarket;

  return (
    <main className="vendor-detail-page">
      <AppPageHeader title="Profile details" onBack={onBack} />

      <div className="vendor-detail-content">
        <section>
          <h2>Store identity</h2>
          <DetailRow icon={UserRound} label="Owner" value={`${profile.firstName || ""} ${profile.lastName || ""}`.trim()} />
          <DetailRow icon={Store} label="Store name" value={profile.shopName} />
          <DetailRow icon={Mail} label="Email" value={profile.email} />
          <DetailRow
            icon={ShoppingBag}
            label="Store description"
            value={profile.description}
            note={descriptionLocked ? `Editable again ${readableDate(descriptionNextAt)}` : "You can update this once every 7 days."}
            locked={descriptionLocked}
            onEdit={() => edit("description", profile.description || "", descriptionLocked, `Your description can be edited again ${readableDate(descriptionNextAt)}.`)}
          />
          <DetailRow icon={Tags} label="Categories" value={(profile.categories || []).join(", ")} />
        </section>

        <section>
          <h2>Addresses</h2>
          <DetailRow
            icon={MapPin}
            label="Main delivery address"
            value={profile.Address}
            note="Used by My Thrift and courier partners for order collection. Contact support to change it."
            locked
            actionLabel="Contact support to change main delivery address"
            onEdit={() => openSupport("change-main-delivery-address")}
          />
          <DetailRow
            icon={PackageCheck}
            label="Buyer pickup address"
            value={profile.pickupAddress}
            note="Contact support to change your buyer pickup address."
            locked
            actionLabel="Contact support to change buyer pickup address"
            onEdit={() => openSupport("change-buyer-pickup-address")}
          />
        </section>

        <section>
          <h2>Payout account</h2>
          <DetailRow
            icon={Banknote}
            label="Bank"
            value={profile.bankDetails?.bankName}
          />
          <DetailRow
            icon={UserRound}
            label="Account name"
            value={profile.bankDetails?.accountName}
          />
          <DetailRow
            icon={LockKeyhole}
            label="Account number"
            value={maskedAccount}
            note="Withdrawals are paid only to this verified account. Contact support if it needs to change."
          />
        </section>

        <section>
          <h2>Store preferences</h2>
          <DetailRow
            icon={RotateCcw}
            label="Return / refund policy"
            value={POLICY_TEXT[returnPolicy.type] || "Not set"}
            note={policyLocked ? "Your self-service change has been used. Contact support for another update." : "You have one self-service policy change."}
            locked={policyLocked}
            onEdit={() => policyLocked
              ? openSupport("change-return-policy")
              : edit("returnPolicy", returnPolicy, false)}
          />
          <DetailRow icon={ShoppingBag} label="Sourcing markets" value={sourcingMarket} onEdit={() => edit("sourcingMarket", Array.isArray(profile.sourcingMarket) ? profile.sourcingMarket : [], false)} />
          <DetailRow icon={Clock3} label="Restock frequency" value={profile.restockFrequency} onEdit={() => edit("restockFrequency", profile.restockFrequency || "", false)} />
          <DetailRow icon={Info} label="Wear readiness" value={profile.wearReadinessRating ? `${profile.wearReadinessRating}/10` : "Not set"} locked={Boolean(profile.wearReadinessRating)} onEdit={() => edit("wearReadinessRating", profile.wearReadinessRating || "", Boolean(profile.wearReadinessRating), "Wear readiness can only be set once. Contact support if it needs correcting.")} />
          <DetailRow icon={PackageCheck} label="Delivery mode" value={profile.deliveryMode} />
        </section>

        {profile.marketPlaceType === "marketplace" && (
          <section>
            <h2>Marketplace schedule</h2>
            <DetailRow icon={Building2} label="Complex number" value={profile.complexNumber} onEdit={() => edit("complexNumber", profile.complexNumber || "", false)} />
            <DetailRow icon={CalendarDays} label="Available days" value={(profile.daysAvailability || []).join(", ")} onEdit={() => edit("daysAvailability", profile.daysAvailability || [], false)} />
            <DetailRow icon={Clock3} label="Opening time" value={profile.openTime} onEdit={() => edit("openTime", profile.openTime || "", false)} />
            <DetailRow icon={Clock3} label="Closing time" value={profile.closeTime} onEdit={() => edit("closeTime", profile.closeTime || "", false)} />
          </section>
        )}
      </div>

      {editingField && (
        <EditFieldModal
          show
          handleClose={() => !processing && setEditingField(null)}
          field={editingField.field}
          currentValue={editingField.value}
          onSave={handleSave}
          processing={processing}
        />
      )}
    </main>
  );
}
