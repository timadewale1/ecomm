// src/providers/WalletSocketProvider.jsx
import { createContext, useContext, useEffect } from "react";
import { io } from "socket.io-client";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.config";
import { VendorContext } from "../components/Context/Vendorcontext";

export const WalletSocketContext = createContext(); // (exposed in case you want live numbers)

export default function WalletSocketProvider({ children }) {
  const { vendorData } = useContext(VendorContext); // has vendorId

  useEffect(() => {
    if (!vendorData?.vendorId) return; // not logged-in yet
    const socket = io("https://staging.mythriftpayments.site/wallet", {
      path: "/wallet",
      transports: ["websocket"],
      auth: {
        token: import.meta.env.VITE_RESOLVE_TOKEN,
        myThriftId: vendorData.vendorId,
      },
    });

    socket.on("connect", () =>
      console.log("✅ Wallet WS connected – sid:", socket.id)
    );

    socket.on("walletUpdate", async ({ wallet }) => {
      const balance = wallet?.balance ?? 0;
      const pending = wallet?.pendingBalance ?? 0;

      /* 1) Persist to Firestore – all pages that use onSnapshot() update instantly */
      await updateDoc(doc(db, "vendors", vendorData.vendorId), {
        balance,
        pendingBalance: pending,
        balancesSyncedAt: serverTimestamp(),
      }).catch(console.error);

      /* 2) (Optional) expose live numbers through context */
      // setState / dispatch here if you need immediate UI access
      console.log("🪙 walletUpdate", { balance, pending });
    });

    socket.on("disconnect", (reason) =>
      console.log("🔌 Wallet WS disconnected:", reason)
    );

    return () => socket.disconnect(); // clean up on sign-out
  }, [vendorData?.vendorId]);

  return children; // no extra JSX needed
}
