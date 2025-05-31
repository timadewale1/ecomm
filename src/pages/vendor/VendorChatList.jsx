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
import { useNavigate } from "react-router-dom";

// Icons (make sure you have react-icons installed)
import { FiSearch } from "react-icons/fi";
import { MdChatBubbleOutline } from "react-icons/md";
import { CiSearch } from "react-icons/ci";
import NoMessage from "../../components/Loading/NoMessage";
import SEO from "../../components/Helmet/SEO";

export default function VendorChatList() {
  const [inquiries, setInquiries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("open"); // "open" or "closed"
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    const vendorUid = auth.currentUser.uid;
    // 1) Query all inquiries for this vendor (no status filter)
    const q = query(
      collection(db, "inquiries"),
      where("vendorId", "==", vendorUid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const arr = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setInquiries(arr);
    });

    return () => unsubscribe();
  }, [navigate]);

  // 2) Compute filtered inquiries based on tab & search term
  const filteredInquiries = inquiries
    .filter((inq) => inq.status === selectedTab)
    .filter((inq) => {
      const qText = inq.question || "";
      return qText.toLowerCase().includes(searchTerm.toLowerCase());
    });

  return (
    <>
      <SEO
        title={`Messages - My Thrift`}
        description={`Manage and view all your open and closed customer chats in one place on My Thrift.`}
        url={`https://www.shopmythrift.store/vchats`}
      />

      <div className="max-w-xl mx-auto h-full flex flex-col">
        {/* HEADER */}
        <header className="sticky top-0 bg-white z-10 p-4 relative">
          <h1 className="text-2xl font-medium font-ubuntu text-gray-800">
            Message Box
          </h1>

          {/* “Beta” badge, positioned exactly like your example */}
          <span className="absolute top-3 right-48 bg-customOrange text-[10px] text-white px-1 rounded-md font-bold">
            Beta
          </span>
        </header>

        {/* SEARCH BAR */}
        <div className="px-4 py-2 bg-white border-gray-100 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full border border-gray-200 rounded-full px-4 py-2 pr-10 text-base font-opensans focus:outline-none focus:ring-2 focus:ring-customOrange"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <CiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        {/* PILL TABS (left-aligned, small gap) */}
        <div className="px-4 py-2 bg-white ">
          <div className="inline-flex space-x-2">
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
                  : "border border-gray-300 font-medium text-gray-800 hover:bg-gray-100"
              }`}
            >
              Closed
            </button>
          </div>
        </div>

        {/* LIST OR EMPTY PLACEHOLDER */}
        <div className="flex-1 overflow-auto ">
          {filteredInquiries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-gray-500">
              <NoMessage />
              {selectedTab === "open" ? (
                <p className="font-opensans text-xs  text-center text-gray-600">
                  {" "}
                  You don’t have any open chats right now. When a customer wants
                  to know more about one of your products, you’ll see it here.
                  Please check your email spams as notifications may be there
                </p>
              ) : (
                <p className="font-opensans  text-xs  text-center text-gray-600">
                  {" "}
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
