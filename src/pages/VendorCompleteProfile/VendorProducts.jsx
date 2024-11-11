import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDoc,
  arrayRemove,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  where,
  query,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/layout/Modal";
import ConfirmationDialog from "../../components/layout/ConfirmationDialog";
import {
  FaTrashAlt,
  FaPlus,
  FaBoxOpen,
  FaEdit,
  FaRegCircle,
  FaRegCheckCircle,
} from "react-icons/fa";
import { GrRadialSelected } from "react-icons/gr";
import { RotatingLines } from "react-loader-spinner";
import AddProduct from "../vendor/AddProducts";
import { BsBox2Fill, BsPin, BsPinAngleFill } from "react-icons/bs";
import { FaStar } from "react-icons/fa";
import { Pin } from "@mui/icons-material";
import { FiMoreHorizontal, FiPlus } from "react-icons/fi";
import VendorProductModal from "../../components/layout/VendorProductModal";
import ToggleButton from "../../components/Buttons/ToggleButton";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import LoadState from "../../Animations/loadinganimation.json";
import { ToastBar } from "react-hot-toast";

const VendorProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState(null);
  const [tabOpt, setTabOpt] = useState("Active");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isViewProductModalOpen, setIsViewProductModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [action, setAction] = useState("");
  const [showRestockInput, setShowRestockInput] = useState(false);
  const [restockQuantity, setRestockQuantity] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickedProducts, setPickedProducts] = useState([]);

  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only set the vendorId when authenticated, then call fetchVendorProducts
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setVendorId(user.uid);
        console.log("Vendor ID set:", user.uid);
        fetchVendorProducts(user.uid);
      } else {
        toast.error("Unauthorized access or no user is signed in.");
        setLoading(false);
        navigate("/login");
      }
    });

    return () => unsubscribeAuth(); // Clean up on unmount
  }, [auth, navigate]);

  // Fetch and listen for vendor products based on vendorId
  useEffect(() => {
    if (!vendorId) return;

    // Define a cleanup function to be used later
    let unsubscribe;

    // Fetch vendor products asynchronously and set up a real-time listener
    const fetchProducts = async () => {
      unsubscribe = await fetchVendorProducts(vendorId);
    };

    fetchProducts();

    // Return cleanup function to remove listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [vendorId]);

  const fetchVendorProducts = (vendorId) => {
    const productsQuery = query(
      collection(db, "products"),
      where("vendorId", "==", vendorId)
    );

    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const updatedProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(updatedProducts);
      setTotalProducts(updatedProducts.length);
    });

    return unsubscribe;
  };

  // Real-time listener to keep `isPublished` up-to-date
  useEffect(() => {
    if (selectedProduct) {
      const productRef = doc(db, "products", selectedProduct.id);
      const unsubscribe = onSnapshot(productRef, (doc) => {
        if (doc.exists()) {
          setIsPublished(doc.data().published);
        }
      });
      return () => unsubscribe(); // Clean up the listener on unmount
    }
  }, [selectedProduct, vendorId]);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setIsViewProductModalOpen(true);
  };

  const handleTogglePicking = () => {
    setPicking((prev) => !prev);
    setPickedProducts([]); // Reset picked products when toggling
  };

  const togglePickProduct = (productId) => {
    setPickedProducts((prevPicked) =>
      prevPicked.includes(productId)
        ? prevPicked.filter((id) => id !== productId)
        : [...prevPicked, productId]
    );
  };

  // Function to check if picked products are only from the same tab
  const canPublishOrUnpublish = () => {
    if (pickedProducts.length === 0) return false;
    const selectedProducts = products.filter((p) =>
      pickedProducts.includes(p.id)
    );
    const isAllPublished = selectedProducts.every((p) => p.published);
    const isAllDrafted = selectedProducts.every((p) => !p.published);
    return (tabOpt === "Active" && isAllPublished) ||
           (tabOpt === "Drafts" && isAllDrafted);
  };

  const bulkPublishStateChange = async () => {
    try {
      for (const productId of pickedProducts) {
        const productRef = doc(db, "products", productId);
        await updateDoc(productRef, {
          published: tabOpt === "Drafts",
        });
      }
      toast.success(
        tabOpt === "Drafts"
          ? "Selected products published successfully."
          : "Selected products unpublished successfully."
      );
      setPickedProducts([]);
      setPicking(false);
      setShowConfirmation(false);


    } catch (error) {
      console.error("Error changing publish state: ", error);
      toast.error("Error changing publish state: " + error.message);
    }
  };


  const confirmBulkDeleteProduct = async () => {
    setLoading(true);
    try {
      for (const productId of pickedProducts) {
        const productRef = doc(db, "products", productId);
        await deleteDoc(productRef);
      }
      toast.success("Selected products deleted successfully.");
      setPickedProducts([]);
      setPicking(false);
      setShowConfirmation(false);

      await addActivityNote(
        "Deleted Products 🗑",
        `You removed products from your store! These products no longer exist in your store and customers that have them in their carts will be notified.`,
        "Product Update"
      );

    } catch (error) {
      console.error("Error deleting products: ", error);
      toast.error("Error deleting products: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddProductModal = () => {
    setIsAddProductModalOpen(true);
  };

  const closeModals = () => {
    setIsViewProductModalOpen(false);
    setIsAddProductModalOpen(false);
    setSelectedProduct(null);
    setRestockQuantity(0);
    setShowRestockInput(false);
  };

  const pinProduct = async (product) => {
    setButtonLoading(true);
    try {
      // Restocking product in the centralized 'products' collection
      const productRef = doc(db, "products", product.id);
      await updateDoc(productRef, {
        isFeatured: !product.isFeatured,
      });
      await addActivityNote(
        "Product Pinned 📌",
        `You've made ${product.name} one of your featured products! This will be part of the first products customers see in your store.`,
        "Product Update"
      );
      toast.success("Product is now featured.");
      closeModals();
    } catch (error) {
      console.error("Error pinning product: ", error);
      toast.error("Error pinning product: " + error.message);
    } finally {
      fetchVendorProducts(vendorId);
      setButtonLoading(false);
    }
  };

  const addActivityNote = async (title, note, type) => {
    try {
      const activityNotesRef = collection(
        db,
        "vendors",
        vendorId,
        "activityNotes"
      );
      await addDoc(activityNotesRef, {
        title,
        type,
        note,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error adding activity note: ", error);
      toast.error("Error adding activity note: " + error.message);
    }
  };

  const confirmDeleteProduct = async () => {
    setButtonLoading(true);
    try {
      const productId = selectedProduct.id;

      // Step 1: Delete the product from the centralized 'products' collection
      await deleteDoc(doc(db, "products", productId));

      // Step 2: Remove the productId from the vendor's 'productIds' array
      const vendorDocRef = doc(db, "vendors", vendorId);
      await updateDoc(vendorDocRef, {
        productIds: arrayRemove(productId), // Remove the product ID from the array
      });

      // Step 3: Log activity for product deletion
      await addActivityNote(
        "Deleted Product 🗑",
        `You removed ${selectedProduct.name} from your store! This product no longer exists in your store and customers that have it in their carts will be notified.`,
        "Product Update"
      );

      // Update the products state
      setProducts(
        products.filter((product) => product.id !== selectedProduct.id)
      );

      toast.success("Product deleted successfully.");
      closeModals();
    } catch (error) {
      console.error("Error deleting product: ", error);
      toast.error("Error deleting product: " + error.message);
    } finally {
      setButtonLoading(false);
      setShowConfirmation(false);
      fetchVendorProducts(vendorId);
    }
  };

  const handleDeleteProduct = () => {
    setAction("delete");
    setShowConfirmation(true);
  };
  
  const handleBulkDelete = () => {
    setAction("bulkDelete");
    setShowConfirmation(true);
  };

  const handlePublish = () => {
    setAction("publish");
    setShowConfirmation(true);
  };

  const handleUnpublish = () => {
    setAction("unpublish");
    setShowConfirmation(true);
  };

  const handleRestockProduct = async () => {
    setButtonLoading(true);
    try {
      // Restocking product in the centralized 'products' collection
      const productRef = doc(db, "products", selectedProduct.id);
      await updateDoc(productRef, {
        stockQuantity:
          selectedProduct.stockQuantity + parseInt(restockQuantity, 10),
      });
      await addActivityNote(
        `Restocked Product 📦`,
        ` You’ve restocked ${selectedProduct.name}! Products are in stock and available for purchase.`,
        "Product Update"
      );
      toast.success("Product restocked successfully.");
      closeModals();
    } catch (error) {
      console.error("Error restocking product: ", error);
      toast.error("Error restocking product: " + error.message);
    } finally {
      fetchVendorProducts(vendorId);
      setButtonLoading(false);
    }
  };

  // Helper function to group variants by color
  const groupVariantsByColor = (variants) => {
    return variants.reduce((acc, variant) => {
      if (!acc[variant.color]) {
        acc[variant.color] = [];
      }
      acc[variant.color].push(variant);
      return acc;
    }, {});
  };

  const handleEditProduct = async () => {
    // Logic to open the edit modal or handle product edit functionality
    console.log("Edit product:", selectedProduct);
    await addActivityNote(
      "Edited Product 📝",
      `You edited ${selectedProduct.name}! Customers that have this in their cart will be notified of the changes you made.`,
      "Product Update"
    );
  };

  const filteredProducts = products.filter((p) => {
    if (tabOpt === "Active") {
      return p.published && p.stockQuantity > 0;
    } else if (tabOpt === "OOS") {
      return p.stockQuantity === 0;
    } else {
      return !p.published;
    }
  });

  const formatNumber = (num) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <>
      <div className="mb-40 mx-3 my-7 flex flex-col justify-center space-y-5 font-opensans ">
        <div className="flex justify-end">
          <div
            className="relative flex justify-center items-center"
            onClick={handleTogglePicking}
          >
            {picking && pickedProducts.length < 1 && (
              <div className="absolute top-10 right-[28px] items-center flex justify-between w-[300px] h-[52px] p-4 bg-white shadow-lg rounded-2xl z-50 text-[16px]">
                <p className=" font-semibold text-black">Select Product</p>
                <FaRegCheckCircle />
              </div>
            )}
            {!picking ? (
              <div className="relative rounded-full w-11 h-11 bg-customOrange bg-opacity-10 flex justify-center items-center">
                <FiMoreHorizontal className="w-6 h-6" />
                </div>) : (<p className="text-[16px] mx-2">Cancel</p>)}
          </div>
        </div>

        <div className="relative bg-customDeepOrange w-full h-c120 rounded-2xl flex flex-col justify-center px-4 py-2">
          <div className="absolute top-0 right-0">
            <img src="./Vector.png" alt="" className="w-16 h-24" />
          </div>
          <div className="absolute bottom-0 left-0">
            <img src="./Vector2.png" alt="" className="w-16 h-16" />
          </div>
          <div className="flex flex-col justify-center items-center space-y-3">
            <p className="text-white text-lg">Total Products</p>
            <p className="text-white text-3xl font-bold">{totalProducts}</p>
          </div>
        </div>
        <div className="flex justify-center space-x-5 items-center">
          <div className="flex flex-col justify-center items-center space-y-3">
            <p
              className={`text-sm ${
                tabOpt === "Active" ? "text-customOrange" : "text-black"
              }`}
              onClick={() => setTabOpt("Active")}
            >
              Active
            </p>
            <div className="h-1">
              {tabOpt === "Active" && <hr className="w-11 text-customOrange" />}
            </div>
          </div>
          <div className="flex flex-col justify-center items-center space-y-3">
            <p
              className={`text-sm ${
                tabOpt === "OOS" ? "text-customOrange" : "text-black"
              }`}
              onClick={() => setTabOpt("OOS")}
            >
              Out of Stock
            </p>
            <div className="h-1">
              {tabOpt === "OOS" && <hr className="w-11 text-customOrange" />}
            </div>
          </div>
          <div className="flex flex-col justify-center items-center space-y-3">
            <p
              className={` text-sm ${
                tabOpt === "Drafts" ? "text-customOrange" : "text-black"
              }`}
              onClick={() => setTabOpt("Drafts")}
            >
              Drafts
            </p>
            <div className="h-1">
              {tabOpt === "Drafts" && <hr className="w-11 text-customOrange" />}
            </div>
          </div>
        </div>
        <div
          className={` ${
            filteredProducts < 1 && !productsLoading
              ? " justify-center items-center text-center"
              : "grid grid-cols-2 gap-4"
          }`}
        >
          {filteredProducts &&
          filteredProducts.length > 0 &&
          !productsLoading ? (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <div className="flex flex-col space-y-2">
                  <div className="relative w-44 h-44 rounded-xl bg-customSoftGray">
                    {picking && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePickProduct(product.id);
                        }}
                        className="absolute top-2 left-2"
                      >
                        {pickedProducts.includes(product.id) ? (
                          <GrRadialSelected className="text-customOrange w-6 h-6" />
                        ) : (
                          <FaRegCircle className="text-customOrange w-6 h-6" />
                        )}
                      </div>
                    )}
                    <img
                      src={product.coverImageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl bg-customSoftGray"
                    />
                  </div>
                  <div className="flex">
                    <p className="text-xs font-semibold text-black truncate w-32">
                      {product.name}
                    </p>{" "}
                    <p className="text-xs font-semibold text-black truncate w-9">
                      {/* {product.color} */}
                    </p>{" "}
                  </div>
                  <div
                    className={` ${
                      !product.published ? "flex space-x-4" : "space-y-2"
                    }`}
                  >
                    <p className="text-xs font-semibold text-black">
                      Size: {product.stockQuantity}
                    </p>
                    <p className="text-xs font-medium text-black">
                      &#x20a6;{formatNumber(product.price)}
                    </p>
                  </div>
                  {!product.published && (
                    <p className="text-xs font-semibold text-customOrange">
                      Unpublished Product
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : tabOpt === "Active" && !productsLoading ? (
            <p className="text-xs mt-24">
              📭 Your store has no active products yet. Upload items to start
              attracting customers!
            </p>
          ) : tabOpt === "OOS" && !productsLoading ? (
            <p className="text-xs mt-24">
              📦 You currently have no items marked as out of stock.
            </p>
          ) : productsLoading ? (
            <div className="flex flex-col justify-center items-center space-y-2">
              <Lottie
                className="w-10 h-10"
                animationData={LoadState}
                loop={true}
                autoplay={true}
              />
              <p className="text-xs">Loading products...</p>
            </div>
          ) : (
            !productsLoading && (
              <p className="text-xs mt-24">
                📝 You have no saved draft products yet. Start a new listing and
                save it as a draft anytime!
              </p>
            )
          )}
        </div>
      </div>
      {!picking && (
        <button
          onClick={openAddProductModal}
          className={`fixed bottom-24 right-5 flex justify-center items-center bg-customOrange text-white rounded-full w-11 h-11 shadow-lg focus:outline-none`}
        >
          <span className="text-3xl">
            <FiPlus />
          </span>
        </button>
      )}

      {picking && pickedProducts.length > 0 && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className={`fixed bottom-0 z-[1001] flex px-4 ${canPublishOrUnpublish() ? "justify-between" : "justify-center"} py-3 bg-white text-white w-full h-[94px] shadow-lg focus:outline-none`}
        >{canPublishOrUnpublish() && (
          <p className="text-lg font-semibold text-customRichBrown">
              {tabOpt === 'Active' ? (
                <p className="text-lg font-semibold text-customRichBrown"
                onClick={handleUnpublish}>
                Unpublish
            </p>
              ) : (
                <p className="text-lg font-semibold text-customRichBrown"
                onClick={handlePublish}>
                  Publish
                </p>
              ) }
          </p>)}
          <p className="text-lg font-semibold text-customRichBrown mb-4"
          onClick={() => handleBulkDelete()}>
            Delete
          </p>
        </motion.div>
      )}

      {selectedProduct && (
        <VendorProductModal
          isOpen={isViewProductModalOpen}
          onClose={closeModals}
          onDel={handleDeleteProduct}
        >
          <div className="pb-24 pt-10">
            {selectedProduct.coverImageUrl && (
              <img
                src={selectedProduct.coverImageUrl}
                alt={selectedProduct.name}
                className="w-full h-44 object-cover bg-customSoftGray rounded-md mb-3"
              />
            )}

            <div className="flex overflow-x-auto space-x-4 mb-3 snap-x snap-mandatory">
              {selectedProduct.imageUrls &&
                selectedProduct.imageUrls.length > 0 &&
                selectedProduct.imageUrls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="flex-shrink-0 w-24 h-24 object-cover bg-customSoftGray rounded-md mr-2 snap-center"
                  />
                ))}
            </div>

            <p className="text-lg text-black font-semibold mb-4">
              {selectedProduct.name}
            </p>
            <div className="px-3 mb-4 flex flex-col justify-between space-y-3">
              <p className="text-black font-semibold text-sm">
                Price:{" "}
                <span className="font-normal">
                  &#x20a6;{formatNumber(selectedProduct.price)}
                </span>
              </p>
              <hr className="text-slate-400" />

              <p className="text-black font-semibold text-sm">
                Product Category:{" "}
                <span className="font-normal">{selectedProduct.category}</span>
              </p>
              <hr className="text-slate-400" />

              <p className="text-black font-semibold text-sm">
                Quantity:{" "}
                <span
                  className={`${
                    selectedProduct.variants[0].stock < 1 && "text-red-500"
                  }`}
                >
                  {selectedProduct.variants[0].stock > 0
                    ? selectedProduct.variants[0].stock
                    : "Out of stock"}
                </span>
              </p>
              <hr className="text-slate-400" />

              <p className="text-black font-semibold text-sm">
                Color:{" "}
                <span className="font-normal">
                  {selectedProduct.variants[0].color}
                </span>
              </p>
              <hr className="text-slate-400" />

              <p className="text-black font-semibold text-sm">
                Size:{" "}
                <span className="font-normal">
                  {selectedProduct.variants[0].size}
                </span>
              </p>
              <hr className="text-slate-400" />

              <p className="text-black font-semibold text-sm">
                Product Type:{" "}
                <span className="font-normal">
                  {selectedProduct.productType}
                </span>
              </p>
              <hr className="text-slate-400" />

              <p className="text-black font-semibold text-sm">
                Product Condition:{" "}
                <span className="font-normal">{selectedProduct.condition}</span>
              </p>
              <hr className="text-slate-400" />

              <p className="text-black font-semibold text-sm">
                Product Sub-type:{" "}
                <span className="font-normal">{selectedProduct.subType}</span>
              </p>
              <hr className="text-slate-400" />

              <div className="text-black font-semibold text-sm">
                <p className="text-black font-semibold text-sm mb-2">
                  Product Description
                </p>{" "}
                <p className="text-black font-normal text-sm leading-6">
                  {selectedProduct.description}
                </p>
              </div>
              {selectedProduct.variants.slice(1) && (
                <p className="text-lg text-black font-semibold mb-4">
                  {selectedProduct.variants.slice(1).length === 1
                    ? "Product Variant"
                    : "Product Variants"}
                </p>
              )}
              <div className="flex w-full overflow-x-auto space-x-4 snap-x snap-mandatory">
                {Object.entries(
                  groupVariantsByColor(selectedProduct.variants || [])
                ).map(([color, variants], index) => (
                  <div key={index} className="bg-customSoftGray p-3 rounded-lg">
                    {/* Display the color name */}
                    <p className="text-black font-semibold text-sm mb-2">
                      Color: {color}
                    </p>

                    {/* Vertical table layout for sizes and quantities */}
                    <table className="w-custVCard text-left border-collapse">
                      <thead>
                        <tr className="space-x-8">
                          <th className="text-black font-semibold text-sm pb-2 border-b border-gray-300">
                            Size
                          </th>
                          <th className="text-black text-right font-semibold text-sm pb-2 border-b border-gray-300">
                            Quantity
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((variant, i) => (
                          <tr key={i} className="space-x-8">
                            <td className="py-2 text-sm font-normal border-b border-gray-200">
                              {variant.size}
                            </td>
                            <td
                              className={`py-2 text-sm text-right font-normal border-b border-gray-200 ${
                                variant.stock < 1 ? "text-red-500" : ""
                              }`}
                            >
                              {variant.stock > 0
                                ? variant.stock
                                : "Out of stock"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>

            {selectedProduct.subProducts && (
              <p className="text-lg text-black font-semibold mb-4">
                {selectedProduct.subProducts.length > 1
                  ? "Sub-Products"
                  : "Sub-Products"}
              </p>
            )}

            {selectedProduct.subProducts &&
              selectedProduct.subProducts.map((sp) => (
                <div key={sp.subProductId} className="flex w-full items-center">
                  <div className="w-24 h-24">
                    <img
                      src={sp.images}
                      alt=""
                      className="object-cover bg-customSoftGray rounded-md w-full h-24"
                    />
                  </div>
                  <div className="px-3 mb-4 flex flex-col justify-between space-y-3 w-full">
                    <p className="text-black font-semibold text-sm">
                      Color: <span className="font-normal">{sp.color}</span>
                    </p>
                    <hr className="text-slate-400" />

                    <p className="text-black font-semibold text-sm">
                      Quantity: <span className="font-normal">{sp.stock}</span>
                    </p>
                    <hr className="text-slate-400" />
                    <p className="text-black font-semibold text-sm">
                      Size: <span className="font-normal">{sp.size}</span>
                    </p>
                  </div>
                </div>
              ))}

            <p className="text-lg text-black font-semibold mb-4">
              Make Product
            </p>
            {selectedProduct && (
              <div className="px-3 mb-4 flex flex-col justify-between space-y-3">
                <div className="flex justify-between">
                  <p className="text-black text-sm">
                    Unpublish/Publish Product
                  </p>
                  <ToggleButton
                    itemId={selectedProduct.id}
                    initialIsOn={isPublished}
                    vendorId={vendorId}
                  />
                </div>
                <hr className="text-slate-400" />
              </div>
            )}

            <div className={`mt-10`}>
              <motion.button
                whileTap={{ scale: 1.1 }}
                className="glow-button w-full h-12 mt-7 bg-customOrange text-white font-semibold rounded-full"
              >
                Restock Item
              </motion.button>
            </div>
          </div>
        </VendorProductModal>
      )}


      {isAddProductModalOpen && (
        <Modal isOpen={isAddProductModalOpen} onClose={closeModals}>
          <AddProduct
            vendorId={vendorId}
            closeModal={closeModals}
            onProductAdded={() => fetchVendorProducts(vendorId)}
          />
        </Modal>
      )}

      {showConfirmation && (
        action === "delete" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={confirmDeleteProduct}
            message="Are you sure you want to delete this product?"
            title="Delete Product"
            loading={loading}
          />
        ) : action === "bulkDelete" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={confirmBulkDeleteProduct}
            message="Are you sure you want to delete these products?"
            title="Delete Products"
            loading={loading}
          />
        ) : action === "publish" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={bulkPublishStateChange}
            message="Are you sure you want to publish these products?"
            title="Publish Products"
            loading={loading}
          />
        ) : action === "unpublish" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={bulkPublishStateChange}
            message="Are you sure you want to unpublish these products?"
            title="Unpublish Products"
            loading={loading}
          />
        ) : null

        // <ConfirmationDialog
        //   isOpen={showConfirmation}
        //   onClose={() => setShowConfirmation(false)}
        //   onConfirm={confirmDeleteProduct}
        //   message="Are you sure you want to delete this product?"
        //   title="Delete Product"
        // />
        // <ConfirmationDialog
        //   isOpen={showConfirmation}
        //   onClose={() => setShowConfirmation(false)}
        //   onConfirm={confirmDeleteProduct}
        //   message="Are you sure you want to delete this product?"
        //   title="Delete Product"
        // />
      )}
    </>
  );
};

export default VendorProducts;
