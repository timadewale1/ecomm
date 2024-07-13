// import React, { useState, useEffect } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { db } from "../firebase.config";
// import { doc, getDoc, collection, getDocs, setDoc, updateDoc } from "firebase/firestore";
// import { getAuth } from "firebase/auth";
// import ReactStars from "react-rating-stars-component";
// import { GoDotFill } from "react-icons/go";
// import RoundedStar from "../components/Roundedstar";
// import Loading from "../components/Loading/Loading";
// import { IoMdContact } from "react-icons/io";
// import { FaAngleLeft, FaPhoneAlt, FaTimes } from "react-icons/fa";
// import { toast } from "react-toastify";
// import { TiSocialAtCircular } from "react-icons/ti";
// // import ProductCard from "../components/Products/ProductCard";

// const StorePage = () => {
//   const { id } = useParams();
//   const [vendor, setVendor] = useState(null);
//   const [products, setProducts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [showContact, setShowContact] = useState(false);
//   const auth = getAuth();
//   const user = auth.currentUser;
//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetchVendor = async () => {
//       try {
//         const vendorRef = doc(db, "vendors", id);
//         const vendorSnapshot = await getDoc(vendorRef);
//         if (vendorSnapshot.exists()) {
//           setVendor({ id: vendorSnapshot.id, ...vendorSnapshot.data() });

//           const productsRef = collection(vendorRef, "products");  // Assume products are stored in a subcollection
//           const productsSnapshot = await getDocs(productsRef);
//           const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//           setProducts(productsList);
//         } else {
//           toast.error("No such document!", { className: "custom-toast" });
//         }
//       } catch (error) {
//         toast.error("Error fetching vendor: " + error.message, { className: "custom-toast" });
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchVendor();
//   }, [id]);

//   const handleRatingChange = async (newRating) => {
//     if (!user) {
//       toast.error("No user is signed in.", { className: "custom-toast" });
//       return;
//     }

//     const vendorRef = doc(db, "vendors", id);
//     const ratingCollectionRef = collection(db, "vendors", id, "ratings");
//     const userRatingRef = doc(ratingCollectionRef, user.uid);

//     const userRatingDoc = await getDoc(userRatingRef);
//     if (userRatingDoc.exists()) {
//       toast.error("You have already rated this vendor.", { className: "custom-toast" });
//       return;
//     }

//     await setDoc(userRatingRef, { rating: newRating });

//     const ratingSnapshot = await getDocs(ratingCollectionRef);
//     const ratings = ratingSnapshot.docs.map(doc => doc.data().rating);
//     const ratingSum = ratings.reduce((a, b) => a + b, 0);
//     const averageRating = ratingSum / ratings.length;

//     await updateDoc(vendorRef, {
//       rating: averageRating,
//       ratingCount: ratings.length
//     });

//     setVendor((prevVendor) => ({
//       ...prevVendor,
//       rating: averageRating,
//       ratingCount: ratings.length
//     }));

//     toast.success("Rating submitted successfully.", { className: "custom-toast" });
//   };

//   if (loading) {
//     return <Loading />
//   }

//   if (!vendor) {
//     return <div>No vendor found</div>;
//   }

//   return (
//     <div className="p-3">
//       <div className="flex justify-between items-center mb-4">
//         <FaAngleLeft onClick={() => navigate(-1)} className="cursor-pointer" />
//         <h1 className="font-ubuntu text-lg font-medium">{vendor.shopName}</h1>
//         <IoMdContact className="text-customCream text-4xl cursor-pointer" onClick={() => setShowContact(true)} />
//       </div>
//       <div className="flex justify-center mt-2">
//         <img
//           className="w-32 h-32 rounded-full"
//           src={vendor.coverImageUrl}
//           alt={vendor.shopName}
//         />
//       </div>
//       <div className="flex justify-center">
//         <div>
//           <ReactStars
//             count={5}
//             value={vendor.rating || 0}
//             size={24}
//             activeColor="#ffd700"
//             emptyIcon={<RoundedStar filled={false} />}
//             filledIcon={<RoundedStar filled={true} />}
//             onChange={handleRatingChange}
//           />
//         </div>
//         <span className="flex justify-center">({vendor.ratingCount || 0})</span>
//       </div>
//       <div className="w-full h-auto bg-customCream p-2 flex flex-col justify-self-center rounded-lg mt-4">
//         <p className="font-ubuntu text-black text-xs text-center">{vendor.description}</p>
//         <div className="mt-2 flex flex-wrap items-center justify-center text-gray-700 text-sm space-x-2">
//           {vendor.categories.map((category, index) => (
//             <React.Fragment key={index}>
//               {index > 0 && <GoDotFill className="mx-1" />}
//               <span>{category}</span>
//             </React.Fragment>
//           ))}
//         </div>
//       </div>
//       <div className="p-3">
//       <h1 className="font-ubuntu text-lg font-medium">{vendor.shopName}</h1>
//       {/* <div>
//         {["Men", "Women", "Kids"].map((category) => (
//           <div key={category}>
//             <h2>{category}</h2>
//             <div className="product-grid">
//               {products[category].map((product) => (
//                 <ProductCard key={product.id} product={product} />
//               ))}
//             </div>
//           </div>
//         ))}
//       </div> */}
//     </div>
//       {showContact && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50 modal" onClick={() => setShowContact(false)}>
//           <div
//             className="bg-white w-full md:w-1/3 h-2/5 p-4 rounded-t-lg relative z-50"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <FaTimes
//               className="absolute top-2 right-2 text-white text-lg bg-black h-4 w-4 rounded-md cursor-pointer"
//               onClick={() => setShowContact(false)}
//             />
//             <h2 className="text-lg font-ubuntu font-medium mb-4">Contact Information</h2>
//             <div className="flex items-center mb-4">
//               <a href={`tel:${vendor.phoneNumber}`} className="flex items-center">
//                 <FaPhoneAlt className="mr-4 w-6 h-6 " />
//                 <p className="font-ubuntu text-lg">{vendor.phoneNumber}</p>
//               </a>
//             </div>
//             <div className="flex items-center">
//               <TiSocialAtCircular className="mr-4 h-6 w-6" />
//               <p className="font-ubuntu text-lg">{vendor.socialMediaHandle}</p>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default StorePage;
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactStars from "react-rating-stars-component";
import { GoDotFill } from "react-icons/go";
import { IoMdContact } from "react-icons/io";
import { FaAngleLeft, FaPhoneAlt, FaTimes, FaPlus, FaCheck } from "react-icons/fa";
import { TiSocialAtCircular } from "react-icons/ti";
import { toast } from "react-toastify";
import RoundedStar from "../components/Roundedstar";
import ProductCard from "../components/Products/ProductCard";

const StorePage = () => {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Dummy vendor data
    const dummyVendor = {
      id: "1",
      shopName: "Dummy Shop 1",
      coverImageUrl: "",
      rating: 4.5,
      ratingCount: 20,
      categories: ["Cargos", "Shirts"],
      description: "This is a dummy vendor description.",
      phoneNumber: "123-456-7890",
      socialMediaHandle: "@dummyvendor",
    };

    // Dummy products data
    const dummyProducts = [
      {
        id: "p1",
        category: "Men",
        name: "Checkered Shirt",
        price: "1000",
        size: "M",
        imageUrl: "https://via.placeholder.com/150",
        condition: "defect",
        defectDescription: "Small tear on the sleeve",
      },
      {
        id: "p2",
        category: "Men",
        name: "Product 2",
        price: "2000",
        size: "L",
        imageUrl: "https://via.placeholder.com/150",
        condition: "brand new",
      },
      {
        id: "p3",
        category: "Women",
        name: "Product 3",
        price: "3000",
        size: "S",
        imageUrl: "https://via.placeholder.com/150",
        condition: "thrift",
      },
      // Add more products as needed
    ];

    setVendor(dummyVendor);
    setProducts(dummyProducts);
    setLoading(false);
  }, [id]);

  const handleFollowClick = () => {
    setIsFollowing(!isFollowing);
    toast(isFollowing ? "Unfollowed" : "You will be notified of new products and promos.", {
      className: "custom-toast",
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!vendor) {
    return <div>No vendor found</div>;
  }

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-4">
        <FaAngleLeft onClick={() => navigate(-1)} className="cursor-pointer" />
        <h1 className="font-ubuntu text-lg font-medium">{vendor.shopName}</h1>
        <IoMdContact
          className="text-customCream text-4xl cursor-pointer"
          onClick={() => setShowContact(true)}
        />
      </div>
      <div className="flex justify-center mt-2">
        <div className="relative w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
          {vendor.coverImageUrl ? (
            <img
              className="w-32 h-32 rounded-full bg-slate-700 object-cover"
              src={vendor.coverImageUrl}
              alt={vendor.shopName}
            />
          ) : (
            <span className="text-center font-bold">{vendor.shopName}</span>
          )}
        </div>
      </div>
      <div className="flex justify-center mt-2">
        <ReactStars
          count={5}
          value={vendor.rating || 0}
          size={24}
          activeColor="#ffd700"
          emptyIcon={<RoundedStar filled={false} />}
          filledIcon={<RoundedStar filled={true} />}
          edit={false} // Make the stars display-only
        />
        <span className="flex items-center ml-2">({vendor.ratingCount || 0})</span>
      </div>
      <div className="w-full h-auto bg-customCream p-2 flex flex-col justify-self-center rounded-lg mt-4">
        <p className="font-ubuntu text-black text-xs text-center">
          {vendor.description}
        </p>
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
        <button
          className={`w-32 h-10 rounded-lg border flex items-center justify-center transition-colors duration-200 ${
            isFollowing ? "bg-customOrange text-white" : "bg-transparent"
          }`}
          onClick={handleFollowClick}
        >
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
        <div>
          {["Men", "Women", "Kids"].map((category) => (
            <div key={category}>
              <h2 className="mt-4 font-ubuntu text-3xl">{category}</h2>
              <div className="grid mt-2 grid-cols-2 gap-3">
                {products
                  .filter((product) => product.category === category)
                  .map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {showContact && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50 modal"
          onClick={() => setShowContact(false)}
        >
          <div
            className="bg-white w-full md:w-1/3 h-2/5 p-4 rounded-t-lg relative z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <FaTimes
              className="absolute top-2 right-2 text-white text-lg bg-black h-4 w-4 rounded-md cursor-pointer"
              onClick={() => setShowContact(false)}
            />
            <h2 className="text-lg font-ubuntu font-medium mb-4">
              Contact Information
            </h2>
            <div className="flex items-center mb-4">
              <a
                href={`tel:${vendor.phoneNumber}`}
                className="flex items-center"
              >
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

