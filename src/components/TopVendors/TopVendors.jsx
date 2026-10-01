// src/components/TopVendors.jsx
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTopVendors } from "../../redux/reducers/topVendorsSlice";
import { useLocation, useNavigate } from "react-router-dom";
import IkImage from "../../services/IkImage";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../../firebase.config";
import { setVendorFollowState } from "../../services/vendorFollow";
import toast from "react-hot-toast";
import { useAuth } from "../../custom-hooks/useAuth";
import Skeleton from "react-loading-skeleton";
import { RiHeart3Fill, RiHeart3Line } from "react-icons/ri";
import { GoDotFill } from "react-icons/go";
import { FaStar } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import RotatingCategoryPill from "./CategoryPills";
import LoginRequiredSheet from "../PwaModals/LoginRequiredSheet";
import { rememberAuthIntent, takeAuthIntent } from "../../services/authIntent";

export default function TopVendors() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const { list: vendors, status } = useSelector((s) => s.topVendors);
  const [followed, setFollowed] = useState({});
  const [showLogin, setShowLogin] = useState(false);
  const [pendingVendorId, setPendingVendorId] = useState(null);
  const pendingFollowsRef = useRef(new Set());

  // Load follow state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const snap = await getDocs(
          query(collection(db, "follows"), where("userId", "==", u.uid))
        );
        const map = {};
        snap.forEach((d) => (map[d.data().vendorId] = true));
        setFollowed(map);
      } else {
        setFollowed({});
      }
    });
    return () => unsub();
  }, []);

  // Fetch vendors
  useEffect(() => {
    if (status === "idle") dispatch(fetchTopVendors());
  }, [status, dispatch]);

  const toggleFollow = async (e, vendorId) => {
    e.stopPropagation();
    if (!currentUser) {
      setPendingVendorId(vendorId);
      setShowLogin(true);
      return;
    }
    if (pendingFollowsRef.current.has(vendorId)) return;

    const willFollow = !followed[vendorId];
    pendingFollowsRef.current.add(vendorId);
    setFollowed((p) => ({ ...p, [vendorId]: willFollow }));

    try {
      const result = await setVendorFollowState({
        userId: currentUser.uid,
        vendorId,
        shouldFollow: willFollow,
      });
      setFollowed((p) => ({ ...p, [vendorId]: result.followed }));
    } catch (err) {
      setFollowed((p) => ({ ...p, [vendorId]: !willFollow }));
      toast.error(err.message);
    } finally {
      pendingFollowsRef.current.delete(vendorId);
    }
  };

  useEffect(() => {
    if (!currentUser?.uid) return;
    const intent = takeAuthIntent({types: "follow-vendor", pathname: location.pathname});
    const vendorId = intent?.payload?.vendorId;
    if (!vendorId || pendingFollowsRef.current.has(vendorId)) return;
    pendingFollowsRef.current.add(vendorId);
    setFollowed((current) => ({...current, [vendorId]: true}));
    setVendorFollowState({
      userId: currentUser.uid,
      vendorId,
      shouldFollow: true,
    })
      .then((result) => {
        setFollowed((current) => ({...current, [vendorId]: result.followed}));
      })
      .catch((error) => {
        setFollowed((current) => ({...current, [vendorId]: false}));
        toast.error(error.message || "Could not follow this vendor.");
      })
      .finally(() => pendingFollowsRef.current.delete(vendorId));
  }, [currentUser?.uid, location.pathname]);

  if (status === "loading") {
    return (
      <div className="my-1 mb-2 mt-6 px-4">
        <h2 className="text-xl font-medium mb-3 font-ubuntu mt-4">
          Handpicked just for you 🧡
        </h2>
        <div className="flex space-x-8 overflow-x-scroll scrollbar-hide pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="min-w-[250px] max-w-[250px]">
              <Skeleton className="w-full h-36 rounded-md" />
              <div className="mt-2">
                <Skeleton width="60%" height={20} />
                <Skeleton width="80%" height={14} className="mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!vendors.length) return null;

  const avg = (v) =>
    v.ratingCount ? (v.rating / v.ratingCount).toFixed(1) : "0.0";

  return (
    <div className="my-1 mb-2 overflow-x-hidden bg-white py-2 px-4">
      <div className="h-1.5 bg-gray-50 w-[100vw] relative left-1/2 -translate-x-1/2" />

      <h2 className="text-xl font-semibold mb-5 font-opensans mt-4">
        Handpicked just for you 🧡
      </h2>

      <div className="flex space-x-8  overflow-x-scroll scrollbar-hide pb-4">
        {vendors.map((v) => (
          <div
            key={v.id}
            className="min-w-[250px] max-w-[250px] cursor-pointer"
            onClick={() => navigate(`/store/${v.id}`)}
          >
            <div className="relative">
              <IkImage
                src={
                  v.coverImageUrl ||
                  "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg"
                }
                alt={v.shopName}
                className="w-full h-36 object-cover rounded-md"
              />

              {/* rotating category pill */}
              <div className="absolute top-2 left-2">
                <RotatingCategoryPill
                  categories={v.categories?.length ? v.categories : ["Thrift"]}
                />
              </div>

              {/* follow heart */}
              <button
                onClick={(e) => toggleFollow(e, v.id)}
                className="absolute top-2 right-2 bg-white bg-opacity-75 rounded-full p-1"
              >
                <AnimatePresence mode="wait">
                  {followed[v.id] ? (
                    <motion.div
                      key="filled"
                      initial={{ scale: 0, rotate: -30, opacity: 0 }}
                      animate={{
                        scale: [1, 1.3, 1],
                        rotate: 0,
                        opacity: 1,
                      }}
                      exit={{ scale: 0, rotate: 30, opacity: 0 }}
                      transition={{
                        duration: 0.4,
                        times: [0, 0.4, 1],
                        ease: "easeInOut",
                      }}
                    >
                      <RiHeart3Fill className="text-customOrange text-lg" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="outline"
                      initial={{ scale: 0, rotate: 30, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0, rotate: -30, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <RiHeart3Line className="text-black text-lg" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>

            <div className="flex mt-2 items-center justify-start">
              <h3 className="text-sm font-opensans font-semibold">
                {v.shopName.length > 15
                  ? `${v.shopName.slice(0, 15)}…`
                  : v.shopName}
              </h3>
              <GoDotFill className="mx-1 dot-size text-gray-300" />
              <div className="flex items-center space-x-1">
                <FaStar className="text-yellow-400 text-xs" />
                <span className="text-xs font-opensans text-black">
                  {avg(v)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="h-1.5 bg-gray-50 w-[100vw] relative left-1/2 -translate-x-1/2" />

      <LoginRequiredSheet
        open={showLogin}
        onClose={() => setShowLogin(false)}
        title="Let’s set you up to follow"
        description="Sign in to follow vendors and receive their latest updates, or create an account to continue."
        onSignUp={() => {
          rememberAuthIntent({
            type: "follow-vendor",
            returnTo: `${location.pathname}${location.search}`,
            payload: {vendorId: pendingVendorId},
          });
          navigate("/signup", {state: {from: `${location.pathname}${location.search}`}});
          setShowLogin(false);
        }}
        onLogin={() => {
          rememberAuthIntent({
            type: "follow-vendor",
            returnTo: `${location.pathname}${location.search}`,
            payload: {vendorId: pendingVendorId},
          });
          navigate("/login", {state: {from: `${location.pathname}${location.search}`}});
          setShowLogin(false);
        }}
      />
    </div>
  );
}
