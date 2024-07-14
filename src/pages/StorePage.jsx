import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase.config";
import { doc, getDoc, collection, getDocs, updateDoc, increment } from "firebase/firestore";
import ReactStars from "react-rating-stars-component";
import { GoDotFill } from "react-icons/go";
import { IoMdContact } from "react-icons/io";
import { FaAngleLeft, FaPhoneAlt, FaTimes, FaPlus, FaCheck } from "react-icons/fa";
import { TiSocialAtCircular } from "react-icons/ti";
import { toast } from "react-toastify";
import RoundedStar from "../components/Roundedstar";
import ProductCard from "../components/Products/ProductCard";
import Loading from "../components/Loading/Loading";

const StorePage = () => {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const vendorRef = doc(db, "vendors", id);
        const vendorDoc = await getDoc(vendorRef);
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          setVendor(vendorData);

          const productsRef = collection(vendorRef, "products");
          const productsSnapshot = await getDocs(productsRef);
          const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProducts(productsList);
        } else {
          toast.error("Vendor not found!");
        }
      } catch (error) {
        toast.error("Error fetching vendor data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [id]);

  const handleFollowClick = () => {
    setIsFollowing(!isFollowing);
    toast(isFollowing ? "Unfollowed" : "You will be notified of new products and promos.", {
      className: "custom-toast",
    });
  };

  const handleFavoriteToggle = (productId) => {
    setFavorites((prevFavorites) => {
      const isFavorited = prevFavorites[productId];
      if (isFavorited) {
        const { [productId]: removed, ...rest } = prevFavorites;
        return rest;
      } else {
        return { ...prevFavorites, [productId]: true };
      }
    });
  };

  const handleGoToCart = () => {
    navigate('/cart');
  };

  const handleRating = async (rating) => {
    try {
      const userId = "currentUser"; // Replace with the actual user ID
      const vendorRef = doc(db, "vendors", id);
      
      if (vendor.ratedBy && vendor.ratedBy[userId] >= 5) {
        toast.error("You have reached the maximum rating limit.");
        return;
      }
      
      await updateDoc(vendorRef, {
        ratingCount: increment(1),
        rating: increment(rating),
        [`ratedBy.${userId}`]: increment(1),
      });

      const vendorDoc = await getDoc(vendorRef);
      setVendor(vendorDoc.data());
      toast.success("Thank you for your rating!");
    } catch (error) {
      toast.error("Error submitting rating: " + error.message);
    }
  };

  if (loading) {
    return <div><Loading /></div>;
  }

  if (!vendor) {
    return <div>No vendor found</div>;
  }

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-4">
        <FaAngleLeft onClick={() => navigate(-1)} className="cursor-pointer" />
        <h1 className="font-ubuntu text-lg font-medium">{vendor.shopName}</h1>
        <IoMdContact className="text-customCream text-4xl cursor-pointer" onClick={() => setShowContact(true)} />
      </div>
      <div className="flex justify-center mt-2">
        <div className="relative w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
          {vendor.coverImageUrl ? (
            <img className="w-32 h-32 rounded-full bg-slate-700 object-cover" src={vendor.coverImageUrl} alt={vendor.shopName} />
          ) : (
            <span className="text-center font-bold">{vendor.shopName}</span>
          )}
        </div>
      </div>
      <div className="flex justify-center mt-2">
        <ReactStars count={5} value={vendor.rating / vendor.ratingCount || 0} size={24} activeColor="#ffd700" emptyIcon={<RoundedStar filled={false} />} filledIcon={<RoundedStar filled={true} />} edit={true} onChange={handleRating} />
        <span className="flex items-center ml-2">({vendor.ratingCount || 0})</span>
      </div>
      <div className="w-full h-auto bg-customCream p-2 flex flex-col justify-self-center rounded-lg mt-4">
        <p className="font-ubuntu text-black text-xs text-center">{vendor.description}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center text-gray-700 text-sm space-x-2">
          {vendor.categories.map((category, index) => (
            <React.Fragment key={index}>
              {index > 0 && <GoDotFill className="mx-1" />}
              <span>{category}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center mt-4">
        <button className={`w-32 h-10 rounded-lg border flex items-center justify-center transition-colors duration-200 ${isFollowing ? 'bg-customOrange text-white' : 'bg-transparent'}`} onClick={handleFollowClick}>
          {isFollowing ? (
            <>
              <FaCheck className="mr-2" />
              Following
            </>
          ) : (
            <>
              <FaPlus className="mr-2" />
              Follow
            </>
          )}
        </button>
      </div>
      <div className="p-2">
        <h1 className="font-ubuntu text-lg mt-4 font-medium">Products</h1>
        <div className="grid mt-2 grid-cols-2 gap-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite={!!favorites[product.id]}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-center mt-4">
        <button className="bg-customCream text-black py-2 px-4 rounded" onClick={handleGoToCart}>
          Go to Cart
        </button>
      </div>
      {showContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50 modal" onClick={() => setShowContact(false)}>
          <div className="bg-white w-full md:w-1/3 h-2/5 p-4 rounded-t-lg relative z-50" onClick={(e) => e.stopPropagation()}>
            <FaTimes className="absolute top-2 right-2 text-white text-lg bg-black h-4 w-4 rounded-md cursor-pointer" onClick={() => setShowContact(false)} />
            <h2 className="text-lg font-ubuntu font-medium mb-4">Contact Information</h2>
            <div className="flex items-center mb-4">
              <a href={`tel:${vendor.phoneNumber}`} className="flex items-center">
                <FaPhoneAlt className="mr-4 w-6 h-6 " />
                <p className="font-ubuntu text-lg">{vendor.phoneNumber}</p>
              </a>
            </div>
            <div className="flex items-center">
              <TiSocialAtCircular className="mr-4 h-6 w-6" />
              <p className="font-ubuntu text-lg">{vendor.socialMediaHandle}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePage;
