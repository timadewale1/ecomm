// src/pages/VendorChatList.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../../firebase.config";
import ChatListItem from "../../components/Chats/ChatListItem";
import OfferListItem from "../../components/Chats/OfferListItem"; // <- NEW
import { useNavigate } from "react-router-dom";
import { CiSearch } from "react-icons/ci";
import NoMessage from "../../components/Loading/NoMessage";
import SEO from "../../components/Helmet/SEO";

export default function VendorChatList() {
  const [inquiries, setInquiries] = useState([]);
  const [offers, setOffers] = useState([]); // <- NEW
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("offers"); // <- default to Offers
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    const vendorUid = auth.currentUser.uid;

    // Inquiries subscription (unchanged)
    const qInq = query(
      collection(db, "inquiries"),
      where("vendorId", "==", vendorUid),
      orderBy("createdAt", "desc")
    );
    const unsubInq = onSnapshot(qInq, (snap) => {
      setInquiries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Offers subscription (NEW)
    const qOff = query(
      collection(db, "offers"),
      where("vendorId", "==", vendorUid),
      orderBy("createdAt", "desc")
    );
    const unsubOff = onSnapshot(qOff, (snap) => {
      setOffers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubInq();
      unsubOff();
    };
  }, [navigate]);

  // Filter logic
  const filteredInquiries = inquiries
    .filter((inq) => inq.status === selectedTab || selectedTab === "offers")
    .filter((inq) =>
      (inq.question || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  const groupedOffers = React.useMemo(() => {
    const byThread = new Map();
    for (const off of offers) {
      const tid = `${off.buyerId}__${off.productId}`;
      const cur = byThread.get(tid);
      if (!cur) {
        byThread.set(tid, {
          threadKey: tid,
          buyerId: off.buyerId,
          productId: off.productId,
          vendorId: off.vendorId,
          productName: off.productName,
          productCover: off.productCover,
          unread: off.vendorRead ? 0 : 1,
          latest: off,
        });
      } else {
        // latest by updatedAt
        const curTs = cur.latest?.updatedAt?.toMillis?.() ?? 0;
        const offTs = off?.updatedAt?.toMillis?.() ?? 0;
        if (offTs > curTs) cur.latest = off;
        if (!off.vendorRead) cur.unread += 1;
      }
    }
    // turn to array & search
    const arr = Array.from(byThread.values());
    return arr
      .filter((t) => {
        const hay = `${t.productName || ""} ${
          t.latest?.amount
            ? `i want to get this item for ₦${t.latest.amount}`
            : ""
        }`.toLowerCase();
        return hay.includes(searchTerm.toLowerCase());
      })
      .sort(
        (a, b) =>
          (b.latest?.updatedAt?.toMillis?.() ?? 0) -
          (a.latest?.updatedAt?.toMillis?.() ?? 0)
      );
  }, [offers, searchTerm]);

  // then use groupedOffers only when selectedTab === "offers"

  return (
    <>
      <SEO
        title={`Messages - My Thrift`}
        description={`Manage and view your chats and offers.`}
        url={`https://www.shopmythrift.store/vchats`}
      />

      <div className="max-w-xl mx-auto h-full flex flex-col">
        {/* HEADER */}
        <header className="sticky top-0 bg-white z-10 p-4 relative">
          <h1 className="text-2xl font-medium font-ubuntu text-gray-800">
            Message Box
          </h1>
          <span className="absolute top-3 right-48 bg-customOrange text-[10px] text-white px-1 rounded-md font-bold">
            Beta
          </span>
        </header>

        {/* SEARCH */}
        <div className="px-4 py-2 bg-white border-gray-100 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder={
                selectedTab === "offers"
                  ? "Search offers..."
                  : "Search messages..."
              }
              className="w-full border border-gray-200 rounded-full px-4 py-2 pr-10 text-base font-opensans focus:outline-none focus:ring-2 focus:ring-customOrange"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <CiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        {/* TABS (Offers first, then Open / Closed) */}
        <div className="px-4 py-2 bg-white ">
          <div className="inline-flex space-x-2">
            <button
              onClick={() => setSelectedTab("offers")}
              className={`px-4 py-1 rounded-full text-sm font-medium font-opensans transition ${
                selectedTab === "offers"
                  ? "bg-customOrange text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Offers
            </button>
            <button
              onClick={() => setSelectedTab("open")}
              className={`px-4 py-1 rounded-full text-sm font-medium font-opensans transition ${
                selectedTab === "open"
                  ? "bg-customOrange text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setSelectedTab("closed")}
              className={`px-4 py-1 rounded-full text-sm font-opensans transition ${
                selectedTab === "closed"
                  ? "bg-customOrange text-white"
                  : "border border-gray-300 font-medium text-gray-600 hover:bg-gray-100"
              }`}
            >
              Closed
            </button>
          </div>
        </div>

        {/* LIST */}
        <div className="flex-1 overflow-auto ">
          {selectedTab === "offers" ? (
            groupedOffers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500">
                <NoMessage />
                <p className="font-opensans text-xs text-center text-gray-600">
                  You don’t have any offers yet. When a customer submits or
                  responds to an offer, you’ll see it here.
                </p>
              </div>
            ) : (
              groupedOffers.map((t) => (
                <OfferListItem
                  key={t.threadKey}
                  offer={t.latest}
                  unreadCount={t.unread}
                  onClick={() =>
                    navigate(
                      `/vchats/thread?type=offerThread&buyerId=${t.buyerId}&productId=${t.productId}`
                    )
                  }
                />
              ))
            )
          ) : filteredInquiries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500">
              <NoMessage />
              {selectedTab === "open" ? (
                <p className="font-opensans text-xs text-center text-gray-600">
                  You don’t have any open chats right now. When a customer wants
                  to know more about one of your products, you’ll see it here.
                  Please check your email spams as notifications may be there
                </p>
              ) : (
                <p className="font-opensans text-xs text-center text-gray-600">
                  You don’t have any closed chats yet. Once you reply to a
                  question, it will appear here.
                </p>
              )}
            </div>
          ) : (
            filteredInquiries.map((inq) => (
              <ChatListItem key={inq.id} inquiry={inq} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
