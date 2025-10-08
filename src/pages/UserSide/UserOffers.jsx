import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase.config";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import OfferListItem from "./UserOfferListItem";
import SEO from "../../components/Helmet/SEO";
import { CiSearch } from "react-icons/ci";
import { GoChevronLeft } from "react-icons/go";

export default function UserOffers() {
  const [offers, setOffers] = useState([]);
  const [search, setSearch] = useState("");

  // Restore the most recently selected tab on load; fall back to "action".
  const [tab, setTab] = useState(() => {
    const saved = localStorage.getItem("userOffersTab");
    return saved &&
      ["action", "pending", "accepted", "declined"].includes(saved)
      ? saved
      : "action";
  });

  const navigate = useNavigate();

  // Persist tab whenever it changes
  useEffect(() => {
    localStorage.setItem("userOffersTab", tab);
  }, [tab]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }
    const qRef = query(
      collection(db, "offers"),
      where("buyerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(qRef, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOffers(arr);
    });
    return () => unsub();
  }, [navigate]);

  // Group offers into threads: one row per (vendorId × productId)
  const groupedThreads = useMemo(() => {
    const map = new Map();
    for (const o of offers) {
      const tid = `${o.vendorId || "v"}__${o.productId || "p"}`;
      const cur = map.get(tid);
      if (!cur) {
        map.set(tid, {
          threadKey: tid,
          vendorId: o.vendorId,
          productId: o.productId,
          productName: o.productName,
          productCover: o.productCover,
          vendorShopName: o.vendorShopName,
          unread: o.buyerRead ? 0 : 1,
          latest: o, // will be replaced as we iterate
        });
      } else {
        // pick the latest by createdAt
        const a = cur.latest?.createdAt?.toMillis?.() ?? 0;
        const b = o?.createdAt?.toMillis?.() ?? 0;
        if (b > a) cur.latest = o;
        if (!o.buyerRead) cur.unread += 1;
      }
    }
    // search + sort by latest createdAt desc
    const needle = search.trim().toLowerCase();
    return Array.from(map.values())
      .filter((t) => {
        if (!needle) return true;
        const A = (t.productName || "").toLowerCase();
        const B = (t.vendorShopName || "").toLowerCase();
        const msg = t.latest?.amount
          ? `i want to get this item for ₦${t.latest.amount}`.toLowerCase()
          : "";
        return A.includes(needle) || B.includes(needle) || msg.includes(needle);
      })
      .sort(
        (x, y) =>
          (y.latest?.createdAt?.toMillis?.() ?? 0) -
          (x.latest?.createdAt?.toMillis?.() ?? 0)
      );
  }, [offers, search]);

  // Tab filter applied at the thread level using the latest status
  const filtered = useMemo(() => {
    if (!groupedThreads.length) return [];
    const statusFilter = (st) => st?.toLowerCase?.() || "";
    return groupedThreads.filter((t) => {
      const s = statusFilter(t.latest?.status);
      if (tab === "action") return s === "countered";
      if (tab === "pending") return s === "pending";
      if (tab === "accepted") return s === "accepted";
      if (tab === "declined") return s === "declined";
      return true;
    });
  }, [groupedThreads, tab]);

  return (
    <>
      <SEO
        title="My Offers – My Thrift"
        description="Track your offers and vendor responses."
        url="https://www.shopmythrift.store/offers"
      />
      <div className="max-w-xl mx-auto h-[100dvh] flex flex-col bg-white">
        {/* Header */}
        <header className="p-4 border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/profile")}
              aria-label="Go back"
              className="p-1 -ml-1 rounded-full hover:bg-gray-100 active:scale-95 transition"
            >
              <GoChevronLeft className="text-2xl text-gray-700" />
            </button>
            <h1 className="text-xl font-ubuntu font-medium text-gray-900">
              My Offers
            </h1>
          </div>
        </header>

        {/* Search */}
        <div className="px-4 py-2 border-b">
          <div className="relative">
            <input
              className="w-full border border-gray-200 rounded-full px-4 py-2 pr-10 text-base font-opensans focus:outline-none focus:ring-2 focus:ring-customOrange"
              placeholder="Search product or vendor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <CiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2">
          <div className="inline-flex gap-2">
            {[
              ["pending", "Pending"],
              ["accepted", "Accepted"],
              ["action", "Countered"],
              ["declined", "Declined"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-1 rounded-full text-xs font-opensans ${
                  tab === key
                    ? "bg-customOrange text-white"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500 font-opensans px-6 text-center">
              Nothing here yet.
            </div>
          ) : (
            filtered.map((t) => (
              <OfferListItem
                key={t.threadKey}
                // Show the latest doc in the thread in your existing row UI
                offer={t.latest}
                // Optional: if your row supports it, show unread badge
                unreadCount={t.unread}
                onClick={() =>
                  navigate(
                    `/offers/thread?type=offerThread&vendorId=${t.vendorId}&productId=${t.productId}`
                  )
                }
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
