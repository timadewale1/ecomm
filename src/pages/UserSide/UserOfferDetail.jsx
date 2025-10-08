import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../firebase.config";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
  orderBy,
} from "firebase/firestore";
import { GoChevronLeft } from "react-icons/go";
import { IoMdContact } from "react-icons/io";
import SEO from "../../components/Helmet/SEO";
import toast from "react-hot-toast";
import Loading from "../../components/Loading/Loading";

const NGN = (n) =>
  Number(n || 0).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

export default function UserOfferDetail() {
  const { offerId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // thread mode?
  const isThread =
    new URLSearchParams(location.search).get("type") === "offerThread";
  const vendorIdParam = new URLSearchParams(location.search).get("vendorId");
  const productIdParam = new URLSearchParams(location.search).get("productId");

  const [offer, setOffer] = useState(null); // latest in thread (or single)
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subscribe (thread mode OR single doc)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }

    // THREAD VIEW: subscribe to all offers by this buyer for this (vendor, product)
    if (isThread && vendorIdParam && productIdParam) {
      const qRef = query(
        collection(db, "offers"),
        where("buyerId", "==", user.uid),
        where("vendorId", "==", vendorIdParam),
        where("productId", "==", productIdParam),
        orderBy("createdAt", "asc")
      );
      const unsub = onSnapshot(
        qRef,
        async (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (!arr.length) {
            setOffer(null);
            setLoading(false);
            return;
          }
          const latest = arr[arr.length - 1];
          setOffer(latest);

          // mark all as read for buyer in this thread
          arr.forEach((o) => {
            if (!o.buyerRead) {
              updateDoc(doc(db, "offers", o.id), { buyerRead: true }).catch(
                () => {}
              );
            }
          });

          // fetch product once
          if (latest.productId && !product) {
            try {
              const ps = await getDoc(doc(db, "products", latest.productId));
              if (ps.exists()) setProduct({ id: ps.id, ...ps.data() });
            } catch (e) {
              console.error(e);
            }
          }
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setLoading(false);
          toast.error("Could not load thread.");
        }
      );
      return () => unsub();
    }

    // SINGLE DOC VIEW (legacy deep-links)
    const ref = doc(db, "offers", offerId);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          setOffer(null);
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        setOffer(data);

        // mark as read for buyer
        if (!data.buyerRead) {
          updateDoc(ref, { buyerRead: true }).catch(() => {});
        }

        // fetch product
        if (data.productId && !product) {
          try {
            const ps = await getDoc(doc(db, "products", data.productId));
            if (ps.exists()) setProduct({ id: ps.id, ...ps.data() });
          } catch (e) {
            console.error(e);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
        toast.error("Could not load offer.");
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId, isThread, vendorIdParam, productIdParam, navigate]);

  const listPrice = product?.price ?? offer?.listPrice ?? 0;

  const time = (ts) =>
    ts?.toDate
      ? ts.toDate().toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const honoredPrice =
    offer?.status === "countered"
      ? offer?.counterAmount
      : offer?.status === "accepted"
      ? offer?.amount
      : null;

  const goToProductWithOffer = () => {
    if (!offer?.productId || honoredPrice == null) return;
    navigate(`/product/${offer.productId}?shared=true`, {
      state: { offerPrice: Number(honoredPrice) },
    });
  };

  if (loading) return <Loading />;
  if (!offer) {
    return (
      <div className="h-[100dvh] grid place-items-center text-gray-500">
        Offer not found.
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`Offer – ${offer.productName || "Item"}`}
        description="View your offer and the vendor’s response."
        url={
          isThread
            ? `https://www.shopmythrift.store/offers/thread?vendorId=${vendorIdParam}&productId=${productIdParam}`
            : `https://www.shopmythrift.store/offers/${offerId}`
        }
      />
      <div className="flex flex-col h-[100dvh] bg-white">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center">
          <GoChevronLeft
            className="text-2xl text-gray-700 cursor-pointer mr-4"
            onClick={() => navigate("/offers")}
          />
          <div className="flex-1">
            <div className="text-lg font-opensans font-semibold">
              {offer.productName || "Product"}
            </div>
            <div className="text-sm text-gray-500 font-opensans">
              {offer.vendorShopName || "Vendor"}
            </div>
          </div>
        </div>

        <div className="overflow-auto scrollbar-hide">
          {/* Product header (image aligned right) */}
          <div className="px-4 py-4">
            <div className="w-64 h-64 rounded-lg overflow-hidden ml-auto">
              <img
                src={offer.productCover || "/placeholder.png"}
                alt="product"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs text-right font-opensans mt-2">
              Your offer for{" "}
              <span className="uppercase text-customOrange font-semibold">
                {offer.productName || "Item"}
              </span>
              .
            </p>
          </div>

          {/* Conversation bubbles (kept simple, latest-focused) */}
          <div className="flex-1 px-4 space-y-6">
            {/* Your (latest) offer — RIGHT aligned */}
            <div className="flex justify-end">
              <div>
                <div className="bg-customOrange text-white rounded-lg px-4 py-2 font-opensans max-w-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="line-through opacity-80">
                      {NGN(listPrice)}
                    </span>
                    <span className="font-semibold">{NGN(offer.amount)}</span>
                  </div>
                  <div>I want to get this item for {NGN(offer.amount)}</div>
                </div>
                <div className="mt-1 text-xs text-gray-400 text-right font-opensans">
                  {time(offer.createdAt)}
                </div>
              </div>
            </div>

            {/* Vendor responses — LEFT aligned */}
            {offer.status === "countered" && offer.counterAmount && (
              <div className="flex">
                <IoMdContact className="w-10 h-10 text-gray-400 mr-3" />
                <div>
                  <div className="bg-blue-50 text-blue-900 rounded-lg px-4 py-2 font-opensans max-w-xs">
                    <div className="mb-2">
                      Vendor countered at {NGN(offer.counterAmount)}.{" "}
                    </div>
                    <button
                      onClick={goToProductWithOffer}
                      className="text-xs px-3 py-1.5 rounded-md bg-customRichBrown text-white font-opensans"
                    >
                      Buy now
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-gray-400 font-opensans">
                    {time(offer.counteredAt)}
                  </div>
                </div>
              </div>
            )}

            {offer.status === "accepted" && (
              <div className="flex">
                <IoMdContact className="w-10 h-10 text-gray-400 mr-3" />
                <div>
                  <div className="bg-green-50 text-green-900 rounded-lg px-4 py-2 font-opensans max-w-xs">
                    <div className="mb-2">
                      Offer accepted — proceed to checkout.{" "}
                    </div>
                    <button
                      onClick={goToProductWithOffer}
                      className="text-xs px-3 py-1.5 rounded-md bg-customRichBrown text-white font-opensans"
                    >
                      Buy now
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-gray-400 font-opensans">
                    {time(offer.acceptedAt)}
                  </div>
                </div>
              </div>
            )}

            {offer.status === "declined" && (
              <div className="flex">
                <IoMdContact className="w-10 h-10 text-gray-400 mr-3" />
                <div>
                  <div className="bg-red-50 text-red-900 rounded-lg px-4 py-2 font-opensans max-w-xs">
                    Offer declined.
                  </div>
                  <div className="mt-1 text-xs text-gray-400 font-opensans">
                    {time(offer.declinedAt)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status pill */}
        <div className="border-t px-4 py-3">
          {(() => {
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

            const key = String(offer?.status || "pending").toLowerCase();
            const sc = STATUS_CONFIG[key] || STATUS_CONFIG.pending;

            return (
              <div className="w-full flex items-center justify-center">
                <span
                  className={[
                    "inline-flex items-center gap-2 font-opensans px-3 py-1 rounded-full text-[10px] font-semibold",
                    "ring-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]",
                    sc.bg,
                    sc.text,
                    sc.ring,
                  ].join(" ")}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${
                      key === "pending" ? "animate-pulse" : ""
                    }`}
                  />
                  <span>{sc.label}</span>
                </span>
              </div>
            );
          })()}
        </div>

        {/* Policy / info footer – centered card */}
        <div className="px-4 pb-5">
          <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 text-center shadow-sm">
            {(offer.status === "accepted" || offer.status === "countered") && (
              <p className="text-xs text-gray-800 font-opensans leading-relaxed">
                Offers that are <b>accepted</b> or <b>countered</b> with a lower
                price than your initial offer will have their price{" "}
                <b className="text-customOrange">locked for 6 hours</b>. After
                this window, the item returns to its initial price. Offers are{" "}
                <b>unique to your account</b>.
              </p>
            )}

            {offer.status === "declined" && (
              <p className="text-xs text-gray-800 font-opensans leading-relaxed">
                A declined offer means the price wasn’t fair for the vendor. If
                you improve your offer by{" "}
                <b className="text-customOrange">20% or more</b>, they may
                reconsider — though acceptance isn’t guaranteed.
              </p>
            )}

            {offer.status === "pending" && (
              <p className="text-xs text-gray-800 font-opensans leading-relaxed">
                Your offer is pending. We’ll notify you when the vendor
                responds. You can always return here to check the status.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
