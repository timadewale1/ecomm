import React, { useEffect, useState } from "react";
import { FaShop } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import { ChevronLeft, User } from "lucide-react";

import useAuth from "../../custom-hooks/useAuth";
import { db } from "../../firebase.config";
import { toast } from "react-toastify";
import { doc, getDoc } from "firebase/firestore";
import Loading from "../../components/Loading/Loading";

const VprofileDetails = ({ showDetails, setShowDetails }) => {
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // State variables
  const [userData, setUserData] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");

  // Fetch user data on component mount or when currentUser changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        setLoading(true);
        try {
          const vendorDoc = await getDoc(doc(db, "vendors", currentUser.uid));
          if (vendorDoc.exists()) {
            const data = vendorDoc.data();
            setUserData(data);
            setDisplayName(`${data.firstName} ${data.lastName}`);
            setEmail(data.email || "");
            setShopName(data.shopName || "");
          } else {
            console.error("No such document!");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error("Failed to fetch user data.", {
            className: "custom-toast",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [currentUser]);

  // If user data is loading, show a loader
  if (loading && !userData) {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col items-center">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex -translate-y-4 h-24 w-full">
          <div className="flex items-center space-x-2">
            <ChevronLeft
              className="text-2xl text-black cursor-pointer"
              onClick={() => setShowDetails(false)}
            />
            <h1 className="text-xl font-medium font-ubuntu text-black">
              Profile Details
            </h1>
          </div>
        </div>

        {/* Profile Information */}
        <div className="w-full mt-4">
          {/* Display Name */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              User Name
            </h1>
            <div className="flex items-center justify-between w-full px-4 py-3">
              <User className="text-black text-xl mr-4" />
              <p className="text-size font-medium text-black capitalize w-full">
                {displayName}
              </p>
            </div>
          </div>

          {/* Store Name */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              Store Name
            </h1>
            <div className="flex items-center justify-between w-full px-4 py-3">
              <FaShop className="text-black text-xl mr-4" />
              <p className="text-lg text-black w-full font-medium">
                {shopName}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col border-none rounded-xl bg-customGrey mb-2 items-center w-full">
            <h1 className="text-xs w-full translate-y-3 translate-x-6 font-medium text-gray-500">
              Email
            </h1>
            <div className="flex items-center justify-between w-full px-4 py-3">
              <MdEmail className="text-black text-xl mr-4" />
              <p className="text-size text-black w-full font-medium overflow-x-auto">
                {email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VprofileDetails;
