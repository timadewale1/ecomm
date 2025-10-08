// src/pages/VendorChat.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { db, auth } from "../../firebase.config";
import { useSelector, useDispatch } from "react-redux";
import { GrClose } from "react-icons/gr";
import {
  fetchInquiryDetails,
  subscribeToInquiry,
  clearChat,
} from "../../redux/reducers/chatSlice";
import { fetchCustomerProfile } from "../../redux/reducers/vendorChatSlice";
import { GoChevronLeft } from "react-icons/go";
import { FiMoreHorizontal } from "react-icons/fi";
import { MdOutlineClose, MdFlag } from "react-icons/md";
import { Oval } from "react-loader-spinner";
import { IoMdContact, IoMdSend } from "react-icons/io";
import toast from "react-hot-toast";
import {
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  getDoc,
  collection,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import Loading from "../../components/Loading/Loading";
import SEO from "../../components/Helmet/SEO";
import { GiCheckMark } from "react-icons/gi";

export default function VendorChat() {
  const { inquiryId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const dispatch = useDispatch();
  const queryType = new URLSearchParams(location.search).get("type"); // "offer" | null
  const IS_OFFER = queryType === "offer";
  const isOfferThread =
    new URLSearchParams(location.search).get("type") === "offerThread";
  const buyerIdParam = new URLSearchParams(location.search).get("buyerId");
  const productIdParam = new URLSearchParams(location.search).get("productId");

  const [offerDoc, setOfferDoc] = useState(null);
  const [offerProduct, setOfferProduct] = useState(null);
  const [showCounterInput, setShowCounterInput] = useState(false);

  const [offerLoading, setOfferLoading] = useState(IS_OFFER);
  const [offerError, setOfferError] = useState(null);
  // ── 1) Fetch the full inquiry/product/customer payload as before ─────────────
  const { inquiry, product, customer, loading, error } = useSelector(
    (state) => state.chat
  );
  const buyerId = IS_OFFER ? offerDoc?.buyerId : inquiry?.customerId;
  const customerData = useSelector((state) =>
    buyerId ? state.vendorChats.profiles[buyerId] : null
  );
  React.useEffect(() => {
    if (buyerId && !customerData) {
      dispatch(fetchCustomerProfile(buyerId));
    }
  }, [dispatch, buyerId, customerData]);

  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // ── report‐chat UI state ─────────────────────────────────────────
  const [showActions, setShowActions] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [counterValue, setCounterValue] = useState("");
  const [ackOpen, setAckOpen] = useState(false);
  const [showAlreadyReportedModal, setShowAlreadyReportedModal] =
    useState(false);

  // ── 3) On mount: fetch inquiry/product/customer once, then subscribe ─────────
  useEffect(() => {
    if (!inquiryId) return;

    if (isOfferThread) {
      // subscribe to all offers in this (vendor, buyer, product) thread
      const vendorId = auth.currentUser?.uid;
      if (!vendorId || !buyerIdParam || !productIdParam) return;

      const qRef = query(
        collection(db, "offers"),
        where("vendorId", "==", vendorId),
        where("buyerId", "==", buyerIdParam),
        where("productId", "==", productIdParam),
        orderBy("createdAt", "asc")
      );

      const unsub = onSnapshot(
        qRef,
        async (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (!arr.length) {
            setOfferError("No offers in this thread.");
            setOfferLoading(false);
            return;
          }

          // latest controls (accept/counter/decline apply to this one)
          const latest = arr[arr.length - 1];
          setOfferDoc(latest);

          // fetch product once
          if (latest.productId && !offerProduct) {
            const p = await getDoc(doc(db, "products", latest.productId));
            if (p.exists()) setOfferProduct({ id: p.id, ...p.data() });
          }

          // mark unread in the thread as read
          arr.forEach((o) => {
            if (!o.vendorRead) {
              updateDoc(doc(db, "offers", o.id), { vendorRead: true }).catch(
                () => {}
              );
            }
          });

          setOfferLoading(false);
        },
        (err) => {
          console.error(err);
          setOfferError("Failed to load thread");
          setOfferLoading(false);
        }
      );
      return () => unsub();
    }

    // Fallbacks: existing single-offer or inquiry flows
    if (IS_OFFER) {
      const offRef = doc(db, "offers", inquiryId);
      const unsub = onSnapshot(
        offRef,
        async (snap) => {
          if (!snap.exists()) {
            setOfferError("Offer not found");
            setOfferLoading(false);
            return;
          }
          const data = { id: snap.id, ...snap.data() };
          setOfferDoc(data);

          if (!data.vendorRead) {
            updateDoc(offRef, { vendorRead: true }).catch(() => {});
          }

          if (data.productId) {
            const p = await getDoc(doc(db, "products", data.productId));
            if (p.exists()) setOfferProduct({ id: p.id, ...p.data() });
          }

          setOfferLoading(false);
        },
        (err) => {
          console.error(err);
          setOfferError("Failed to load offer");
          setOfferLoading(false);
        }
      );
      return () => unsub();
    } else {
      dispatch(fetchInquiryDetails(inquiryId));
      dispatch(subscribeToInquiry(inquiryId));
      return () => dispatch(clearChat());
    }
  }, [
    dispatch,
    inquiryId,
    IS_OFFER,
    isOfferThread,
    buyerIdParam,
    productIdParam,
    offerProduct,
  ]);

  const chatCustomerName = useMemo(() => {
    return (
      customerData?.displayName || customer?.username || buyerId || "Customer"
    );
  }, [customerData?.displayName, customer?.username, buyerId]);

  const loadingDerived = IS_OFFER ? offerLoading : loading;
  const errorDerived = IS_OFFER ? offerError : error;
  /* ---- put near top of file (outside component or inside, above return) ---- */
  const STATUS_CONFIG = {
    pending: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      ring: "ring-amber-200",
      dot: "bg-amber-500",
      label: "Pending",
    },
    countered: {
      bg: "bg-sky-50",
      text: "text-sky-800",
      ring: "ring-sky-200",
      dot: "bg-sky-500",
      label: "Countered",
    },
    accepted: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      ring: "ring-emerald-200",
      dot: "bg-emerald-500",
      label: "Accepted",
    },
    declined: {
      bg: "bg-rose-50",
      text: "text-rose-800",
      ring: "ring-rose-200",
      dot: "bg-rose-500",
      label: "Declined",
    },
    expired: {
      bg: "bg-slate-50",
      text: "text-slate-700",
      ring: "ring-slate-200",
      dot: "bg-slate-400",
      label: "Expired",
    },
  };

  if (loadingDerived) return <Loading />;
  if (errorDerived) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 font-opensans">
          Error: We’re looking into this
        </div>
      </div>
    );
  }
  // Only allow vendor actions while the offer is still pending
  const showOfferActions =
    IS_OFFER && offerDoc && offerDoc.status === "pending";

  // Helper to format Firestore Timestamp
  const formatTimestamp = (ts) =>
    ts instanceof Timestamp
      ? ts.toDate().toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
  const NGN = (n) =>
    Number(n || 0).toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    });

  const onAccept = async () => {
    if (!offerDoc) return;
    try {
      await updateDoc(doc(db, "offers", offerDoc.id), {
        status: "accepted",
        acceptedAt: serverTimestamp(),
        vendorRead: true,
        buyerRead: false,
      });
      toast.success("Offer accepted.");
    } catch (e) {
      console.error(e);
      toast.error("Could not accept. Try again.");
    }
  };

  const onDecline = async () => {
    if (!offerDoc) return;
    try {
      await updateDoc(doc(db, "offers", offerDoc.id), {
        status: "declined",
        declinedAt: serverTimestamp(),
        vendorRead: true,
        buyerRead: false,
      });
      toast.success("Offer declined.");
    } catch (e) {
      console.error(e);
      toast.error("Could not decline. Try again.");
    }
  };

  const onCounter = async () => {
    if (!offerDoc) return;

    // Only allow countering when the offer is still actionable
    if (!["pending", "countered"].includes(offerDoc.status)) {
      return toast.error("This offer can no longer be countered.");
    }

    const val = Math.round(Number(counterValue));
    if (!Number.isFinite(val) || val <= 0) {
      return toast.error("Enter a valid counter price.");
    }

    // Bounds
    const buyerOffer = Number(offerDoc.amount || 0);
    const upperBound = Number(listPrice || 0);
    const minAllowed = buyerOffer + 1; // strictly greater than buyer's offer
    const maxAllowed = upperBound - 1; // strictly less than list price

    // If there’s no valid counter window, disallow
    if (!(minAllowed <= maxAllowed)) {
      return toast.error(
        "Counter not possible (offer is already near list price)."
      );
    }

    // Enforce rules
    if (val <= buyerOffer) {
      return toast.error(
        `Counter must be more than the buyer’s offer (${NGN(buyerOffer)}).`
      );
    }
    if (val >= upperBound) {
      return toast.error(
        `Counter must be less than the list price (${NGN(upperBound)}).`
      );
    }

    try {
      await updateDoc(doc(db, "offers", offerDoc.id), {
        status: "countered",
        counterAmount: val,
        counteredAt: serverTimestamp(),
        vendorRead: true,
        buyerRead: false,
      });
      toast.success("Counter sent.");
      setCounterValue("");
    } catch (e) {
      console.error(e);
      toast.error("Could not send counter. Try again.");
    }
  };

  // tap product card
  const handleTapToView = () => {
    const pid = IS_OFFER ? offerDoc?.productId : inquiry?.productId;
    if (!pid) return;
    navigate("/vendor-products", { state: { highlightId: pid } });
  };

  // derive pieces for rendering
  const productToShow = IS_OFFER ? offerProduct : product;
  const productName = productToShow?.name || "Product";
  const listPrice = productToShow?.price || 0;

  // Send the vendor’s reply
  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error("Please type a reply before sending.");
      return;
    }
    setSending(true);
    try {
      const inquiryRef = doc(db, "inquiries", inquiryId);
      await updateDoc(inquiryRef, {
        vendorReply: replyText.trim(),
        repliedAt: serverTimestamp(),
        status: "closed",
      });
      toast.success("Reply sent.");
      setTimeout(() => navigate("/vchats"), 500);
    } catch (err) {
      console.error("Failed to send reply:", err);
      toast.error("Could not send reply. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SEO
        title={
          IS_OFFER
            ? `Offer from ${chatCustomerName} – My Thrift`
            : `Chat with ${chatCustomerName} – My Thrift`
        }
        description={
          IS_OFFER
            ? `Review and respond to an offer on "${productName}".`
            : `Continue your conversation about "${productName}".`
        }
        url={`https://www.shopmythrift.store/vchats/${inquiryId}${
          IS_OFFER ? "?type=offer" : ""
        }`}
      />

      <div className="flex flex-col h-[100dvh] w-full mx-auto bg-white">
        {/* ── TOP BAR ────────────────────────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-white z-20 border-b px-4 py-3 flex items-center">
          <GoChevronLeft
            className="cursor-pointer mr-4 text-2xl text-gray-700"
            onClick={() => navigate("/vchats")}
          />
          <div className="flex-1 flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg text-gray-800 font-opensans">
                {productName}
              </div>
              <div className="text-sm text-gray-500 font-opensans">
                {/* ← Use displayName from customerData, fallback to whatever was in chat.customer */}
                Chat with{" "}
                {customerData?.displayName ||
                  customer?.username ||
                  inquiry?.customerId}
              </div>
            </div>

            {/* “…” button */}
            <div className="relative">
              <FiMoreHorizontal
                className="text-2xl text-gray-700 cursor-pointer"
                onClick={() => setShowActions((prev) => !prev)}
              />
              {showActions && (
                <div
                  className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border z-30"
                  onMouseLeave={() => setShowActions(false)}
                >
                  {inquiry?.reported ? (
                    // If already reported, show a "View report status" menu item
                    <button
                      className="flex items-center px-4 py-2 text-sm font-opensans w-full hover:bg-gray-100"
                      onClick={() => {
                        setShowActions(false);
                        setShowAlreadyReportedModal(true);
                      }}
                    >
                      <MdFlag className="mr-2 text-customOrange" />
                      View report status
                    </button>
                  ) : (
                    // If not yet reported, show the normal "Report chat" item
                    <button
                      className="flex items-center px-4 py-2 text-sm font-opensans w-full hover:bg-gray-100"
                      onClick={() => {
                        setShowActions(false);
                        setIsReportModalOpen(true);
                      }}
                    >
                      <MdFlag className="mr-2 text-customOrange" />
                      Report chat
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── PRODUCT INFO + “Tap to View” OVERLAY ─────────────────────────────────── */}
        {productToShow && (
          <div className="relative px-4 py-4 flex flex-col items-start">
            <div
              onClick={handleTapToView}
              className="relative w-64 h-64 rounded-lg overflow-hidden cursor-pointer"
            >
              <img
                src={productToShow.coverImageUrl}
                alt={productToShow.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 right-3 bg-black bg-opacity-70 text-white text-[11px] px-3 py-1 rounded-full font-opensans shadow-lg">
                Tap to View Details
              </div>
            </div>

            <p className="text-xs font-opensans mt-2">
              {IS_OFFER ? (
                <>
                  {customerData?.displayName ||
                    customer?.username ||
                    inquiry?.customerId}{" "}
                  made an offer for{" "}
                  <span className="uppercase text-customOrange font-semibold">
                    {productName}
                  </span>
                  .
                </>
              ) : (
                <>
                  One‐way chat —{" "}
                  {customerData?.displayName ||
                    customer?.username ||
                    inquiry?.customerId}{" "}
                  asked about{" "}
                  <span className="uppercase text-customOrange font-semibold">
                    {productName}
                  </span>
                  . You have one reply; please be clear. Thanks!
                </>
              )}
            </p>
          </div>
        )}

        {/* ── SCROLLABLE CHAT AREA ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          <div className="flex">
            {/* ← Show avatar from customerData.photoURL, fallback to icon */}
            {customerData?.photoURL ? (
              <img
                src={customerData.photoURL}
                alt="customer avatar"
                className="w-10 h-10 rounded-full object-cover mr-3"
              />
            ) : (
              <IoMdContact className="w-10 h-10 text-gray-400 mr-3" />
            )}

            <div>
              {!IS_OFFER ? (
                <>
                  <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-2 font-opensans max-w-xs">
                    {inquiry?.question}
                  </div>
                  <div className="mt-1 text-xs font-opensans text-gray-400">
                    {formatTimestamp(inquiry?.createdAt)}
                  </div>
                </>
              ) : (
                <>
                  {/* Offer bubble: list price (striked) → offered price */}
                  <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-2 font-opensans max-w-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="line-through font-opensans text-gray-500">
                        {NGN(listPrice)}
                      </span>
                      <span className="text-black  font-opensans font-semibold">
                        {NGN(offerDoc?.amount)}
                      </span>
                    </div>
                    <div>
                      <p className="font-opensans text-sm">
                        I want to get this item for {NGN(offerDoc?.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1 text-xs font-opensans text-gray-400">
                    {formatTimestamp(offerDoc?.createdAt)}
                  </div>

                  {/* show vendor’s counter/accept/decline status bubbles */}
                  {offerDoc?.status === "countered" &&
                    offerDoc?.counterAmount && (
                      <div className="mt-3">
                        <div className="bg-blue-50 text-blue-900 rounded-lg px-4 py-2 font-opensans max-w-xs">
                          Countered at {NGN(offerDoc.counterAmount)} — waiting
                          for buyer
                        </div>
                        <div className="mt-1 text-xs font-opensans text-gray-400">
                          {formatTimestamp(offerDoc?.counteredAt)}
                        </div>
                      </div>
                    )}
                  {offerDoc?.status === "accepted" && (
                    <div className="mt-3">
                      <div className="bg-green-50 text-green-900 rounded-lg px-4 py-2 font-opensans max-w-xs">
                        You accepted this offer. Buyer will be notified.
                      </div>
                      <div className="mt-1 text-xs font-opensans text-gray-400">
                        {formatTimestamp(offerDoc?.acceptedAt)}
                      </div>
                    </div>
                  )}
                  {offerDoc?.status === "declined" && (
                    <div className="mt-3">
                      <div className="bg-red-50 text-red-900 rounded-lg px-4 py-2 font-opensans max-w-xs">
                        You declined this offer.
                      </div>
                      <div className="mt-1 text-xs font-opensans text-gray-400">
                        {formatTimestamp(offerDoc?.declinedAt)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {inquiry?.status === "closed" && inquiry.vendorReply && (
            <div className="flex justify-end">
              <div>
                <div className="bg-customOrange text-white rounded-lg px-4 py-2 font-opensans max-w-xs">
                  {inquiry.vendorReply}
                </div>
                <div className="mt-1 text-xs text-gray-400 text-right font-opensans">
                  {formatTimestamp(inquiry.repliedAt)}
                </div>
              </div>
            </div>
          )}
        </div>
        {IS_OFFER && showOfferActions && (
          <>
            {/* ── REPLY INPUT AREA ─────────────────────────────────────────────────────── */}
            {!IS_OFFER && inquiry?.status === "open" && (
              <div className="border-t px-4 py-3">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-full px-4 py-2 pr-16 text-base font-opensans focus:outline-none focus:ring-2 focus:ring-customOrange"
                    placeholder="Type your reply…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 bg-customOrange text-white rounded-full p-1.5 text-xl ${
                      sending || !replyText.trim()
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-orange-600"
                    }`}
                  >
                    {sending ? (
                      <Oval
                        height={20}
                        width={20}
                        strokeWidth={4}
                        color="#ffffff"
                        secondaryColor="transparent"
                        visible={true}
                      />
                    ) : (
                      <IoMdSend />
                    )}
                  </button>
                </div>
              </div>
            )}
            {IS_OFFER && (
              <div className="border-t px-4 py-3">
                {(() => {
                  const canCounter =
                    offerDoc &&
                    productToShow &&
                    !["accepted", "declined"].includes(offerDoc.status) &&
                    Number(productToShow.price || 0) >
                      Number(offerDoc.amount || 0) + 1;

                  const canAcceptDecline =
                    offerDoc &&
                    !["accepted", "declined"].includes(offerDoc.status);

                  // WHEN COUNTER IS OPEN → show ONLY input + send/cancel
                  if (showCounterInput) {
                    return (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Enter counter price"
                          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-base font-opensans focus:outline-none focus:ring-2 focus:ring-customOrange"
                          value={counterValue}
                          onChange={(e) => setCounterValue(e.target.value)}
                          min={
                            offerDoc
                              ? Number(offerDoc.amount || 0) + 1
                              : undefined
                          }
                          max={
                            productToShow
                              ? Math.max(
                                  offerDoc
                                    ? Number(offerDoc.amount || 0) + 1
                                    : 0,
                                  Number(productToShow.price || 0) - 1
                                )
                              : undefined
                          }
                          disabled={!canCounter}
                        />

                        <button
                          onClick={onCounter}
                          disabled={
                            !counterValue ||
                            Number(counterValue) <= 0 ||
                            !canCounter
                          }
                          className={`px-4 py-4 rounded-full text-white font-opensans ${
                            !counterValue ||
                            Number(counterValue) <= 0 ||
                            !canCounter
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-customRichBrown hover:opacity-95"
                          }`}
                        >
                          <GiCheckMark />
                        </button>

                        <button
                          onClick={() => {
                            setShowCounterInput(false);
                            setCounterValue("");
                          }}
                          className="px-4 py-4 rounded-full border border-gray-300 font-opensans hover:bg-gray-50"
                        >
                          <GrClose />
                        </button>
                      </div>
                    );
                  }

                  // WHEN COUNTER IS CLOSED → show the three inline buttons
                  return (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onDecline}
                        disabled={!canAcceptDecline}
                        className={`flex-1 border text-red-400 border-gray-300 rounded-full py-2 font-opensans ${
                          !canAcceptDecline
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        Decline
                      </button>

                      <button
                        onClick={() => setShowCounterInput(true)}
                        disabled={!canCounter}
                        className={`flex-1 rounded-full py-2 font-opensans ${
                          !canCounter
                            ? "bg-gray-300 text-white cursor-not-allowed"
                            : "bg-customRichBrown text-white hover:opacity-95"
                        }`}
                      >
                        Counter
                      </button>

                      <button
                        onClick={onAccept}
                        disabled={!canAcceptDecline}
                        className={`flex-1 bg-customOrange text-white rounded-full py-2 font-opensans ${
                          !canAcceptDecline
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-orange-600"
                        }`}
                      >
                        Accept
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
        {(() => {
          const statusKey = (offerDoc?.status || "pending").toLowerCase();
          const sc = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;

          return (
            <div className="mt-2 flex flex-col items-center justify-center">
              <span
                className={[
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-semibold",
                  "ring-1",
                  sc.bg,
                  sc.text,
                  sc.ring,
                  "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]",
                ].join(" ")}
              >
                <span
                  className={`w-1 h-1 rounded-full ${sc.dot} ${
                    statusKey === "pending" ? "animate-pulse" : ""
                  }`}
                />
                <span>{sc.label}</span>
                {statusKey === "countered" && offerDoc?.counterAmount ? (
                  <span className="opacity-70">
                    · {NGN(offerDoc.counterAmount)}
                  </span>
                ) : null}
              </span>

              {/* subtle helper text (optional) */}
              <div className="mt-1 text-[8px] text-gray-500 font-opensans">
                {statusKey === "pending" && "Waiting for your action"}
                {statusKey === "countered" && "Sent to buyer "}
                {statusKey === "accepted" && "Buyer will be notified"}
                {statusKey === "declined" && "Offer closed"}
                {statusKey === "expired" && "No longer valid"}
              </div>
            </div>
          );
        })()}
        {/* ── FOOTER DISCLAIMER ────────────────────────────────────────────────────── */}
        {IS_OFFER ? (
          <div className="text-center text-xs text-gray-500 py-2 px-3 font-opensans">
            We take measures to prevent spam or unrealistic offers. Want to
            improve this experience?{" "}
            <span
              className="text-customOrange underline cursor-pointer"
              onClick={() => navigate("/send-us-feedback")}
            >
              Send feedback
            </span>
            .
          </div>
        ) : inquiry?.status === "open" ? (
          <div className="text-center text-xs text-gray-500 py-2 font-opensans">
            Chats are monitored in real-time.
          </div>
        ) : (
          <div className="text-center text-xs text-gray-500 py-2 px-3 font-opensans">
            This chat is closed. You’ve answered their question—now focus on
            making that sale!
          </div>
        )}

        {/* ── REPORT CHAT “MODAL” REPLACEMENT ──────────────────────────────────────── */}
        {showAlreadyReportedModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
            onClick={() => setShowAlreadyReportedModal(false)}
          >
            <div
              className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-opensans text-lg font-semibold">
                  Report Status
                </h2>
                <MdOutlineClose
                  className="text-black text-xl cursor-pointer"
                  onClick={() => setShowAlreadyReportedModal(false)}
                />
              </div>

              {/* Body */}
              <p className="font-opensans text-sm">
                You’ve already reported this chat. Our team is reviewing it and
                will keep you updated. Thanks for bringing this to our
                attention.
              </p>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  className="bg-customOrange text-white px-4 py-2 rounded-full"
                  onClick={() => setShowAlreadyReportedModal(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {isReportModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
            onClick={() => setIsReportModalOpen(false)}
          >
            {/* 
            Stop propagation if the user clicks inside the white box 
            so that clicking inside doesn’t close the overlay.
          */}
            <div
              className="bg-white rounded-lg shadow-lg w-full  mx-4 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                    <MdFlag className="text-customRichBrown" />
                  </div>
                  <h2 className="font-opensans text-lg font-semibold">
                    Report Chat
                  </h2>
                </div>
                <MdOutlineClose
                  className="text-black text-xl cursor-pointer"
                  onClick={() => setIsReportModalOpen(false)}
                />
              </div>

              {/* reasons list */}
              <div className="space-y-3  mb-4">
                {["Harassment", "Spam", "Inappropriate language", "Other"].map(
                  (reason) => (
                    <div
                      key={reason}
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        setSelectedReason(reason);
                        if (reason !== "Other") {
                          setOtherReason("");
                        }
                      }}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex justify-center items-center mr-3 ${
                          selectedReason === reason
                            ? "border-customOrange"
                            : "border-customOrange/60"
                        }`}
                      >
                        {selectedReason === reason && (
                          <div className="w-3 h-3 rounded-full bg-customOrange" />
                        )}
                      </div>
                      <span className="font-opensans">{reason}</span>
                    </div>
                  )
                )}

                {selectedReason === "Other" && (
                  <textarea
                    rows={3}
                    className="border w-full rounded font-opensans p-2 text-base mt-2 resize-none overflow-hidden"
                    placeholder="Tell us what's wrong..."
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                  />
                )}
              </div>

              {/* submit button */}
              <div className="flex justify-end">
                <button
                  disabled={
                    submittingReport ||
                    !selectedReason ||
                    (selectedReason === "Other" && !otherReason.trim())
                  }
                  className="bg-customOrange text-white px-10 py-2 rounded-full disabled:opacity-40"
                  onClick={async () => {
                    setSubmittingReport(true);
                    try {
                      const inquiryRef = doc(db, "inquiries", inquiryId);
                      await updateDoc(inquiryRef, {
                        reported: true,
                        reportReason:
                          selectedReason === "Other"
                            ? otherReason.trim()
                            : selectedReason,
                        status:
                          inquiry?.status === "open"
                            ? "closed"
                            : inquiry?.status,
                        reportedAt: serverTimestamp(),
                      });
                      setIsReportModalOpen(false);
                      setAckOpen(true);
                    } catch (err) {
                      toast.error("Could not submit report. Please retry.");
                      console.error(err);
                    } finally {
                      setSubmittingReport(false);
                    }
                  }}
                >
                  {submittingReport ? (
                    <Oval height={18} width={18} strokeWidth={4} color="#fff" />
                  ) : (
                    "Send"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ACKNOWLEDGEMENT POPUP ──────────────────────────────────────────────── */}
        {ackOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
            onClick={() => setAckOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <MdFlag className="mx-auto text-4xl text-customOrange mb-4" />
              <p className="font-opensans text-sm mb-6">
                Thanks for letting us know. We’re reviewing this chat and will
                keep you updated.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
