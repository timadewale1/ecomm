// src/components/TopVendors.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTopVendors } from "../../redux/reducers/topVendorsSlice";
import { useNavigate } from "react-router-dom";
import IkImage from "../../services/IkImage";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../../firebase.config";
import { handleUserActionLimit } from "../../services/userWriteHandler";
import toast from "react-hot-toast";
import { useAuth } from "../../custom-hooks/useAuth";
import Skeleton from "react-loading-skeleton";
import Modal from "react-modal";
import { RiHeart3Fill, RiHeart3Line } from "react-icons/ri";
import { GoDotFill } from "react-icons/go";
import { FaStar } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import RotatingCategoryPill from "./CategoryPills";
import { CiLogin } from "react-icons/ci";
import { LiaTimesSolid } from "react-icons/lia";

Modal.setAppElement("#root");

export default function TopVendors() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const { list: vendors, status } = useSelector((s) => s.topVendors);
  const [followed, setFollowed] = useState({});
  const [showLogin, setShowLogin] = useState(false);

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
      setShowLogin(true);
      return;
    }
    const willFollow = !followed[vendorId];
    setFollowed((p) => ({ ...p, [vendorId]: willFollow }));

    try {
      await handleUserActionLimit(
        currentUser.uid,
        "follow",
        {},
        { collectionName: "usage_metadata", writeLimit: 50, minuteLimit: 8 }
      );
      const ref = doc(db, "follows", `${currentUser.uid}_${vendorId}`);
      if (willFollow) {
        await setDoc(ref, {
          userId: currentUser.uid,
          vendorId,
          createdAt: new Date(),
        });
      } else {
        await deleteDoc(ref);
      }
    } catch (err) {
      setFollowed((p) => ({ ...p, [vendorId]: !willFollow }));
      toast.error(err.message);
    }
  };

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
    <div className="my-1 mb-2 bg-white py-2 px-4">
      <div className="-mx-4 h-1.5 bg-gray-50" />
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
   <div className="-mx-4 h-1.5 bg-gray-50" />
      {/* login modal */}
      <Modal
        isOpen={showLogin}
        onRequestClose={() => setShowLogin(false)}
        overlayClassName="fixed inset-0 modal-overlay bg-black bg-opacity-50 z-50 flex items-center justify-center"
        className="bg-transparent flex items-center justify-center p-4"
      >
        <div
          className="bg-white w-11/12 max-w-md rounded-lg px-3 py-4 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
                <CiLogin className="text-customRichBrown" />
              </div>
              <h2 className="text-lg font-opensans font-semibold">
                Please Log In
              </h2>
            </div>
            <LiaTimesSolid
              onClick={() => setShowLogin(false)}
              className="text-black text-xl mb-6 cursor-pointer"
            />
          </div>
          <p className="mb-6 text-xs font-opensans text-gray-800">
            You need to be logged in to follow vendors and get updates. Please
            log in or create a new account to continue.
          </p>
          <div className="flex space-x-16">
            <button
              onClick={() => {
                navigate("/signup");
                setShowLogin(false);
              }}
              className="flex-1 bg-transparent py-2 text-customRichBrown font-medium text-xs font-opensans border-customRichBrown border rounded-full"
            >
              Sign Up
            </button>
            <button
              onClick={() => {
                navigate("/login");
                setShowLogin(false);
              }}
              className="flex-1 bg-customOrange py-2 text-white text-xs font-opensans rounded-full"
            >
              Login
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
