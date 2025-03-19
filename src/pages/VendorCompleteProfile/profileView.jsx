import { ChevronLeft } from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaFacebookF, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { PiLinkBold } from "react-icons/pi";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import SEO from "../../components/Helmet/SEO";

const ProfileView = () => {
  const navigate = useNavigate();

  const defaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  const { data: userData, loading } = useSelector(
    (state) => state.vendorProfile
  );

  const { coverImageUrl, marketPlaceType, uid } = userData || {};
  useEffect(() => {
    if (!userData) {
      navigate("/vendorlogin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  const profileLink = `https://shopmythrift.store/${
    userData && (marketPlaceType === "virtual" ? "store" : "marketstorepage")
  }/${uid}?shared=true`;

  const [copied, setCopied] = useState(false);
  const copyToClipboard = async () => {
    if (!copied) {
      console.log("Clicked");
      try {
        (await navigator.clipboard.writeText(profileLink)) &&
          console.log("copied"); // Ensure the text is copied
        setCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        toast.error("Failed to copy!"); // Handle any errors during copy
        console.error("Failed to copy text: ", err);
      }
    }
  };
  return (
    <>
      <div className="flex w-full flex-col h-actualScreenHeight bg-gray-100">
        <div className="flex flex-col h-full w-full items-center justify-evenly">
          <div className="w-[90%] p-1  mt-4 rounded-2xl border-2 border-dashed border-customBrown">
            <div
              className="h-[400px] w-full bg-cover bg-center bg-customSoftGray flex rounded-2xl"
              style={{
                backgroundImage: loading
                  ? "none"
                  : !loading && marketPlaceType === "virtual"
                  ? `url(${coverImageUrl})`
                  : `url(${defaultImageUrl})`,
                backgroundSize: "cover", // Ensures the image covers the div
                backgroundPosition: "center", // Centers the image
                backgroundRepeat: "no-repeat", // Prevents repeating
              }}
            ></div>
          </div>

          {/* Share buttons */}
          <div className="space-y-4">
            <div className="text-black text-lg font-ubuntu font-medium text-center">
              Share your store:
            </div>
            <div className="flex gap-4 justify-center">
              {/* Copy Profile Link */}
              <button
                className="flex justify-center items-center bg-white text-customOrange p-3 rounded-full shadow-md w-12 h-12"
                onClick={copyToClipboard}
              >
                <PiLinkBold className="w-5 h-5" />
              </button>

              {/* Facebook Share */}
              <button
                className="flex justify-center items-center bg-white text-customOrange p-3 rounded-full shadow-md w-12 h-12"
                onClick={() =>
                  window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                      profileLink
                    )}`,
                    "_blank"
                  )
                }
              >
                <FaFacebookF className="w-5 h-5" />
              </button>

              {/* Twitter Share */}
              <button
                className="flex justify-center items-center bg-white text-customOrange p-3 rounded-full shadow-md w-12 h-12"
                onClick={() =>
                  window.open(
                    `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                      profileLink
                    )}`,
                    "_blank"
                  )
                }
              >
                <FaXTwitter className="w-5 h-5" />
              </button>

              {/* WhatsApp Share */}
              <button
                className="flex justify-center items-center bg-white text-customOrange p-3 rounded-full shadow-md w-12 h-12"
                onClick={() =>
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(profileLink)}`,
                    "_blank"
                  )
                }
              >
                <FaWhatsapp className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileView;
