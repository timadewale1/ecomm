// src/components/TopVendors.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTopVendors } from "../../redux/reducers/topVendorsSlice";
import { useNavigate } from "react-router-dom";
import IkImage from "../../services/IkImage";
import { RotatingLines } from "react-loader-spinner";
import {
  FaStar,
  FaPlus,
  FaStarHalfAlt,
  FaRegStar,
  FaCheck,
} from "react-icons/fa";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase.config";
import { handleUserActionLimit } from "../../services/userWriteHandler";
import toast from "react-hot-toast";
import { useAuth } from "../../custom-hooks/useAuth";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Modal from "react-modal";
import { CiLogin } from "react-icons/ci";
import { LiaTimesSolid } from "react-icons/lia";
Modal.setAppElement("#root");
export default function TopVendors() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  // 1️⃣ Fetch top vendors slice
  const {
    list: vendors,
    status,
    error,
  } = useSelector((state) => state.topVendors);

  // 2️⃣ Which vendors the user follows
  const [followedVendors, setFollowedVendors] = useState({});

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchTopVendors());
    }
  }, [status, dispatch]);

  // 3️⃣ Keep track of follows
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        (async () => {
          const snap = await getDocs(
            query(collection(db, "follows"), where("userId", "==", user.uid))
          );
          const map = {};
          snap.forEach((d) => (map[d.data().vendorId] = true));
          setFollowedVendors(map);
        })();
      } else {
        setFollowedVendors({});
      }
    });
    return () => unsubscribe();
  }, []);

  const handleFollowClick = async (vendorId) => {
    if (!currentUser) {
      // trigger login/signup modal
      setIsLoginModalOpen(true);
      return;
    }

    const newState = !followedVendors[vendorId];
    setFollowedVendors((prev) => ({ ...prev, [vendorId]: newState }));

    try {
      await handleUserActionLimit(
        currentUser.uid,
        "follow",
        {},
        {
          collectionName: "usage_metadata",
          writeLimit: 50,
          minuteLimit: 8,
          hourLimit: 40,
        }
      );

      const ref = doc(db, "follows", `${currentUser.uid}_${vendorId}`);
      if (newState) {
        await setDoc(ref, {
          userId: currentUser.uid,
          vendorId,
          createdAt: new Date(),
        });
        toast.success("Now following!");
      } else {
        await deleteDoc(ref);
        toast.success("Unfollowed.");
      }
    } catch (err) {
      // roll back on error
      setFollowedVendors((prev) => ({
        ...prev,
        [vendorId]: !newState,
      }));
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
            <div key={i} className="min-w-[250px] max-w-[250px] cursor-pointer">
              {/* image skeleton */}
              <Skeleton className="w-full h-36 rounded-md" />

              {/* title & desc skeleton */}
              <div className="mt-2">
                <Skeleton width="60%" height={20} />
                <Skeleton width="80%" height={14} className="mt-1" />
              </div>

              {/* follow button skeleton
              <Skeleton className="mt-3 w-24 h-9 rounded-md" /> */}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (status === "failed") {
    return (
      <p className="text-red-600 font-opensans text-center py-6">
        We are having some technical issues. Please try again later.
      </p>
    );
  }
  if (vendors.length === 0) return null;

  return (
    <div className="my-1 mb-2 mt-6 px-4">
      <h2 className="text-xl font-medium mb-3 font-ubuntu mt-4">
        Handpicked just for you 🧡
      </h2>
      <div className="flex space-x-8 overflow-x-scroll scrollbar-hide pb-4">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            className="min-w-[250px] max-w-[250px] cursor-pointer"
            onClick={() => navigate(`/store/${vendor.id}`)}
          >
            <div className="relative">
              <IkImage
                src={
                  vendor.coverImageUrl ||
                  "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg"
                }
                alt={vendor.shopName || "Vendor"}
                className="w-full h-36 object-cover rounded-md"
              />
              {vendor.ratingCount > 0 && (
                <div className="absolute top-2 right-2 flex items-center space-x-0.5 bg- bg-opacity-20 px-2 py-1 rounded">
                  {(() => {
                    const avg = vendor.rating / vendor.ratingCount;
                    const fullStars = Math.floor(avg);
                    const hasHalf = avg - fullStars >= 0.5;
                    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
                    return (
                      <>
                        {Array.from({ length: fullStars }).map((_, i) => (
                          <FaStar
                            key={"f" + i}
                            className="text-yellow-400 text-base"
                          />
                        ))}
                        {hasHalf && (
                          <FaStarHalfAlt className="text-yellow-400 text-base" />
                        )}
                        {Array.from({ length: emptyStars }).map((_, i) => (
                          <FaRegStar
                            key={"e" + i}
                            className="text-yellow-400 text-base"
                          />
                        ))}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div>
                <h3 className="mt-2 text-lg font-opensans font-medium">
                  {vendor.shopName?.length > 15
                    ? `${vendor.shopName.slice(0, 15)}…`
                    : vendor.shopName}
                </h3>
                <p className="text-xs font-opensans text-gray-700">
                  {vendor.description
                    ? vendor.description.length > 20
                      ? `${vendor.description.slice(0, 20)}...`
                      : vendor.description
                    : ""}
                </p>
              </div>
              <button
                className={`flex items-center justify-center w-24 h-9 text-sm mt-3 px-4 py-2 rounded-md ${
                  followedVendors[vendor.id]
                    ? "bg-customOrange text-white border-transparent"
                    : "bg-transparent text-black border border-black"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFollowClick(vendor.id);
                }}
              >
                {followedVendors[vendor.id] ? (
                  <>
                    <span className="text-xs font-opensans">Followed</span>
                    <FaCheck className="ml-2 text-xs" />
                  </>
                ) : (
                  <>
                    <span className="text-xs font-opensans font-medium">
                      Follow
                    </span>
                    <FaPlus className="ml-2 text-xs" />
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* ——— Login / Sign Up Modal ——— */}
      <Modal
        isOpen={isLoginModalOpen}
        onRequestClose={() => setIsLoginModalOpen(false)}
        overlayClassName="fixed inset-0 modal-overlay bg-black bg-opacity-50 z-50 flex items-center justify-center"
        className="bg-transparent flex items-center justify-center p-4"
      >
        <div
          className="bg-white w-11/12 max-w-md rounded-lg px-3 py-4 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
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
              onClick={() => setIsLoginModalOpen(false)}
              className="text-black text-xl mb-6 cursor-pointer"
            />
          </div>

          <p className="mb-6 text-xs font-opensans text-gray-800">
            You need to be logged in to follow vendors and get updates. Please
            log in to your account, or create a new account if you don’t have
            one, to continue.
          </p>

          <div className="flex space-x-16">
            <button
              onClick={() => {
                navigate("/signup", { state: { from: location.pathname } });
                setIsLoginModalOpen(false);
              }}
              className="flex-1 bg-transparent py-2 text-customRichBrown font-medium text-xs font-opensans border-customRichBrown border rounded-full"
            >
              Sign Up
            </button>
            <button
              onClick={() => {
                navigate("/login", { state: { from: location.pathname } });
                setIsLoginModalOpen(false);
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
