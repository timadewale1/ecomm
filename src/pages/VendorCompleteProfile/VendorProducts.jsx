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
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import { toast } from "react-hot-toast";
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
import { BsBox2Fill, BsPin, BsPinAngle, BsPinAngleFill } from "react-icons/bs";
import { FaStar } from "react-icons/fa";
import { Pin } from "@mui/icons-material";
import { FiMoreHorizontal, FiPlus } from "react-icons/fi";
import VendorProductModal from "../../components/layout/VendorProductModal";
import ToggleButton from "../../components/Buttons/ToggleButton";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import LoadState from "../../Animations/loadinganimation.json";
import { FaSpinner, FaXmark } from "react-icons/fa6";
import Skeleton from "react-loading-skeleton";
import "./vendor.css";
import ScrollToTop from "../../components/layout/ScrollToTop";

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
  const [isRestocking, setIsRestocking] = useState(false); // New state
  const [restockValues, setRestockValues] = useState({});
  const [rLoading, setRLoading] = useState(false);
  const [oLoading, setOLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickedProducts, setPickedProducts] = useState([]);
  const [pinnedCount, setPinnedCount] = useState(0);

  const auth = getAuth();
  const navigate = useNavigate();

  const renderVariants = (variants) => {
    const groupedVariants = groupVariantsByColor(variants);
    return Object.entries(groupedVariants).map(
      ([color, variants], colorIndex) => (
        <div key={colorIndex} className="bg-customSoftGray p-3 rounded-lg">
          {/* Display the color name */}
          <p className="text-black font-semibold text-sm mb-2">
            Color: {color}
          </p>

          {/* Vertical table layout for sizes and quantities */}
          <table className="w-custVCard text-left border-collapse">
            <thead>
              <tr className="space-x-8">
                <th className="text-black font-semibold text-sm pb-2 border-b border-customOrange border-opacity-40">
                  Size
                </th>
                <th className="text-black text-right font-semibold text-sm pb-2 border-b border-customOrange border-opacity-40">
                  Quantity
                </th>
              </tr>
            </thead>

            <tbody>
              {variants.map((variant) => {
                const variantKey = `${variant.color}-${variant.size}`;
                return (
                  <>
                    <tr key={variantKey} className="space-x-8">
                      <td className="py-2 text-sm font-normal border-b border-customOrange border-opacity-40">
                        {variant.size}
                      </td>
                      <td
                        className={`py-2 text-sm text-right font-normal border-b border-customOrange border-opacity-40 ${
                          variant.stock < 1 ? "text-red-500" : ""
                        }`}
                      >
                        {isRestocking ? (
                          <input
                            type="number"
                            className="border text-right no-spinner p-1 ml-2 rounded-[10px] focus:outline-customOrange h-6 w-24"
                            value={restockValues[variantKey]?.quantity || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Prevent negative values
                              if (value >= 0) {
                                handleRestockInputChange(
                                  "quantity",
                                  variantKey,
                                  value
                                );
                              } else {
                                toast.error(
                                  "Please enter a non-negative value."
                                );
                              }
                            }}
                          />
                        ) : variant.stock > 0 ? (
                          variant.stock
                        ) : (
                          "Out of stock"
                        )}
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )
    );
  };

  useEffect(() => {
    let unsubscribe;

    // Set up real-time listener for the selected product when the modal is open
    if (selectedProduct && isViewProductModalOpen) {
      const productRef = doc(db, "products", selectedProduct.id);

      unsubscribe = onSnapshot(productRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          setSelectedProduct({ id: docSnapshot.id, ...docSnapshot.data() });
        }
      });
    }

    // Clean up the listener when the modal closes
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedProduct, isViewProductModalOpen]);

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

  useEffect(() => {
    
  }, []);

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
// Fetch pinned products count when component mounts
    fetchPinnedProductsCount();
    // Return cleanup function to remove listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [vendorId]);

  const fetchVendorProducts = (vendorId) => {
    setProductsLoading(true);
    const productsQuery = query(
      collection(db, "products"),
      where("vendorId", "==", vendorId)
    );

    const unsubscribe = onSnapshot(productsQuery, async (snapshot) => {
      const updatedProducts = [];
      const batch = writeBatch(db); // Use batch to optimize updates
  
      snapshot.docs.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        if (product.stockQuantity === 0 && product.isFeatured) {
          // If the product is out of stock but still featured, set isFeatured to false
          batch.update(doc.ref, { isFeatured: false });
          product.isFeatured = false; // Update locally as well
        }
        updatedProducts.push(product);
      });
  
      if (!batch.isEmpty) {
        await batch.commit(); // Commit the batch updates
      }
  
      setProducts(updatedProducts);
      setTotalProducts(updatedProducts.length);
      setProductsLoading(false);
    });
    return unsubscribe;
  };

  const fetchPinnedProductsCount = () => {
    const pinnedQuery = query(
      collection(db, "products"),
      where("isFeatured", "==", true),
      where("vendorId", "==", vendorId) // Ensure only the vendor's products are counted
    );
    onSnapshot(pinnedQuery, (snapshot) => {
      setPinnedCount(snapshot.size); // Update count of pinned products
    });
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
    return (
      (tabOpt === "Active" && isAllPublished) ||
      (tabOpt === "Drafts" && isAllDrafted)
    );
  };

  const bulkPublishStateChange = async () => {
    setOLoading(true);
    try {
      for (const productId of pickedProducts) {
        const productRef = doc(db, "products", productId);
        await updateDoc(productRef, {
          published: tabOpt === "Drafts",
          isFeatured: false,
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
    } finally {
      setOLoading(false);
    }
  };

  const confirmBulkDeleteProduct = async () => {
    setOLoading(true);
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
      setOLoading(false);
    }
  };

  const openAddProductModal = () => {
    setIsAddProductModalOpen(true);
  };

  const closeModals = () => {
    setIsViewProductModalOpen(false);
    setIsAddProductModalOpen(false);
    setSelectedProduct(null);

    if (isRestocking) {
      setIsRestocking(false);
      setRestockValues({});
    }
  };

  const handlePinProduct = async (product) => {
    const currentTime = new Date().getTime(); // Get current time in milliseconds
  
    // If the product is already pinned, check if it can be unpinned
    if (product.isFeatured) {
      const pinnedAt = product.pinnedAt || 0; // Ensure we have a pinnedAt timestamp
      const timeElapsed = currentTime - pinnedAt; // Calculate time elapsed since pinned
      const twelveHoursInMilliseconds = 12 * 60 * 60 * 1000;
  
      if (timeElapsed < twelveHoursInMilliseconds) {
        // Prevent unpinning if less than 12 hours have passed
        toast.error("You cannot unpin a product within 12 hours of pinning it.");
        return;
      }
    }
  
    try {
      const productRef = doc(db, "products", product.id);
      const newIsFeaturedStatus = !product.isFeatured;
  
      // Update Firestore with the new `isFeatured` status and timestamp if pinned
      await updateDoc(productRef, {
        isFeatured: newIsFeaturedStatus,
        ...(newIsFeaturedStatus && { pinnedAt: currentTime }), // Add pinnedAt timestamp if pinning
      });
  
      // Update the local product state to reflect the new pin status
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === product.id ? { ...p, isFeatured: newIsFeaturedStatus, pinnedAt: newIsFeaturedStatus ? currentTime : null } : p
        )
      );

      // Update pinned count locally
    setPinnedCount((prevCount) =>
      newIsFeaturedStatus ? prevCount + 1 : prevCount - 1
    );

      // If the product was just pinned (isFeatured set to true), add an activity note
      if (newIsFeaturedStatus) {
        await addActivityNote(
          "Product Pinned 📌",
          `You've made ${product.name} one of your featured products! This will be part of the first products customers see in your store.`,
          "Product Update"
        );
        toast.success("Product pinned successfully.");
      } else {
        toast.success("Product unpinned successfully.");
      }

      // Update the pinned count after the change
      fetchPinnedProductsCount(); // Assuming this function recalculates the pinned count
    } catch (error) {
      console.error("Error pinning/unpinning product:", error);
      toast.error("Error pinning/unpinning product: " + error.message);
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
    setOLoading(true);
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
      setOLoading(false);
      setShowConfirmation(false);
      fetchVendorProducts(vendorId);
    }
  };

  // Toggle restock mode
  const toggleRestockMode = () => {
    setIsRestocking((prev) => !prev);
    setRestockValues({}); // Reset restock values
  };

  const hasValidRestockValues = () => {
    return Object.values(restockValues).some((value) => {
      return value?.quantity && parseInt(value.quantity, 10) > 0;
    });
  };
  
  // Handle restock input change
  const handleRestockInputChange = (type, id, value) => {
    setRestockValues((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [type]: value,
      },
    }));
  };

  // Submit restock changes to Firestore
  const handleSubmitRestock = async () => {
    setRLoading(true);
    try {
      // Ensure variants and subProducts are defined as arrays
      const variants = selectedProduct.variants || [];
      const subProducts = selectedProduct.subProducts || [];

      const productRef = doc(db, "products", selectedProduct.id);

      // Update variants with restock values
      const updatedVariants = variants.map((variant) => {
        const variantKey = `${variant.color}-${variant.size}`;
        const restockQuantity = parseInt(
          restockValues[variantKey]?.quantity,
          10
        );
        if (!isNaN(restockQuantity)) {
          return {
            ...variant,
            stock: restockQuantity,
          };
        }
        return variant;
      });

      // Update sub-products with restock values
      const updatedSubProducts = subProducts.map((subProduct) => {
        const restockQuantity = parseInt(
          restockValues[subProduct.subProductId]?.quantity,
          10
        );
        if (!isNaN(restockQuantity)) {
          return {
            ...subProduct,
            stock: restockQuantity,
          };
        }
        return subProduct;
      });

      // Calculate the total stock quantity based on updated variants and sub-products
      const totalStock =
        updatedVariants.reduce(
          (sum, variant) => sum + (variant.stock || 0),
          0
        ) +
        updatedSubProducts.reduce(
          (sum, subProduct) => sum + (subProduct.stock || 0),
          0
        );

      // Update Firestore with the modified stock quantities and total stockQuantity
      await updateDoc(productRef, {
        variants: updatedVariants,
        subProducts: updatedSubProducts,
        stockQuantity: totalStock, // Update the stockQuantity field with the new total
      });

      toast.success("Product restocked successfully.");
      await addActivityNote(
        "Restocked Product 🔄",
        `You restocked ${selectedProduct.name}! Customers can now buy more of this product from your store.` ,
        "Product Update"
      );
      setIsRestocking(false);
      setRestockValues({});
    } catch (error) {
      console.error("Error restocking product:", error);
      toast.error("Error restocking product: " + error.message);
    } finally {
      setRLoading(false);
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

  // await addActivityNote(
  //   `Restocked Product 📦`,
  //   ` You’ve restocked ${selectedProduct.name}! Products are in stock and available for purchase.`,
  //   "Product Update"
  // );
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

  const filteredProducts = products
    .filter((p) => {
      if (tabOpt === "Active") {
        return p.published && p.stockQuantity > 0;
      } else if (tabOpt === "OOS") {
        return p.stockQuantity === 0;
      } else {
        return !p.published;
      }
    })
    .sort((a, b) => {
      // Sort by isFeatured status first, so pinned products come first
      if (a.isFeatured === b.isFeatured) return 0;
      return a.isFeatured ? -1 : 1;
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
        <ScrollToTop />
        <div className="flex justify-end">
          <div
            className="relative flex justify-center items-center"
          >
            {picking && pickedProducts.length < 1 && (
              <div className="absolute top-10 right-[28px] items-center flex justify-between w-[300px] h-[52px] p-4 bg-white shadow-lg rounded-2xl z-50 text-[16px]">
                <p className=" font-semibold text-black">Select a Product</p>
                <FaRegCheckCircle />
              </div>
            )}
            {!picking ? (
              <div className="cursor-pointer relative rounded-full w-11 h-11 bg-customOrange bg-opacity-10 flex justify-center items-center"
            onClick={handleTogglePicking}>
                <FiMoreHorizontal className="w-6 h-6" />
              </div>
            ) : (
              <p className="cursor-pointer text-[16px] my-2.5"
            onClick={handleTogglePicking}>Cancel</p>
            )}
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
            <p className="text-white text-lg">
              {tabOpt === "Active"
                ? tabOpt
                : tabOpt === "Drafts"
                ? "Drafted"
                : "Out of Stock"}{" "}
              Products
            </p>
            <p className="text-white text-3xl font-bold">
              {productsLoading ? (
                <Skeleton width={38} height={28} className="opacity-50" />
              ) : (
                filteredProducts.length
              )}
            </p>
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
              {tabOpt === "Active" && (
                <hr className="text-customOrange opacity-40  w-11" />
              )}
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
              {tabOpt === "OOS" && (
                <hr className="text-customOrange opacity-40  w-11" />
              )}
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
              {tabOpt === "Drafts" && (
                <hr className="text-customOrange opacity-40  w-11" />
              )}
            </div>
          </div>
        </div>
        <div
          className={` ${
            filteredProducts < 1 && " justify-center items-center text-center"
          } ${
            filteredProducts.length > 0 &&
            !productsLoading &&
            "grid grid-cols-2 gap-4"
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
                    {picking ? (
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
                    ) : (
                      // Show pin icon only if there are less than 4 pinned products
                      tabOpt === "Active" &&
                      ((!product.isFeatured && pinnedCount < 4) ||
                        product.isFeatured) && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinProduct(product);
                          }}
                          className="absolute top-2 right-2 bg-white rounded-full p-1"
                        >
                          {product.isFeatured ? (
                            <BsPinAngleFill
                              className={`text-customOrange  w-5 h-5`}
                            />
                          ) : (
                            <BsPinAngle
                              className={`text-customOrange  w-5 h-5`}
                            />
                          )}
                        </div>
                      )
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
                      Total Stock: {product.stockQuantity}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={120} height={12} />
                <Skeleton width={105} height={12} />
                <Skeleton width={70} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={78} height={12} />
                <Skeleton width={135} height={12} />
                <Skeleton width={98} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={98} height={12} />
                <Skeleton width={155} height={12} />
                <Skeleton width={66} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={78} height={12} />
                <Skeleton width={135} height={12} />
                <Skeleton width={98} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={88} height={12} />
                <Skeleton width={105} height={12} />
                <Skeleton width={90} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={68} height={12} />
                <Skeleton width={145} height={12} />
                <Skeleton width={88} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={70} height={12} />
                <Skeleton width={115} height={12} />
                <Skeleton width={67} height={12} />
              </div>
            </div>
          ) : (
            // <div className="flex flex-col justify-center items-center space-y-2">
            //   <Lottie
            //     className="w-10 h-10"
            //     animationData={LoadState}
            //     loop={true}
            //     autoplay={true}
            //   />
            //   <p className="text-xs">Loading products...</p>
            // </div>
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
          className={`fixed bottom-0 z-[1001] flex px-4 ${
            canPublishOrUnpublish() ? "justify-between" : "justify-center"
          } py-3 bg-white text-white w-full h-[94px] shadow-lg focus:outline-none`}
        >
          {canPublishOrUnpublish() && (
            <p className="text-lg font-semibold text-customRichBrown">
              {tabOpt === "Active" ? (
                <p
                  className="text-lg font-semibold text-customRichBrown"
                  onClick={handleUnpublish}
                >
                  Unpublish
                </p>
              ) : (
                <p
                  className="text-lg font-semibold text-customRichBrown"
                  onClick={handlePublish}
                >
                  Publish
                </p>
              )}
            </p>
          )}
          <p
            className="text-lg font-semibold text-customRichBrown mb-4"
            onClick={() => handleBulkDelete()}
          >
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
                className="w-full h-72 p-1 object-cover bg-customSoftGray rounded-md mb-3"
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
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold text-sm">
                Product Category:{" "}
                <span className="font-normal">{selectedProduct.category}</span>
              </p>
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold text-sm">
                Quantity:{" "}
                <span
                  className={`${
                    selectedProduct.stockQuantity < 1 && "text-red-500"
                  }`}
                >
                  {selectedProduct.stockQuantity > 0
                    ? selectedProduct.stockQuantity
                    : "Out of stock"}
                </span>
              </p>
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold text-sm">
                Product Type:{" "}
                <span className="font-normal">
                  {selectedProduct.productType}
                </span>
              </p>
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold text-sm">
                Product Condition:{" "}
                <span className="font-normal">{selectedProduct.condition}</span>
              </p>
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold text-sm">
                Product Sub-type:{" "}
                <span className="font-normal">{selectedProduct.subType}</span>
              </p>
              <hr className="text-customOrange opacity-40" />

              <div className="text-black font-semibold text-sm">
                <p className="text-black font-semibold text-sm mb-2">
                  Product Description
                </p>{" "}
                <p className="text-black font-normal text-sm leading-6">
                  {selectedProduct.description}
                </p>
              </div>

              {selectedProduct.condition === "Defect:" && (
                <>
                  {" "}
                  <p className="text-red-400 font-semibold text-sm">
                    Defect Description:{" "}
                    <span className="font-normal">
                      {selectedProduct.defectDescription}
                    </span>
                  </p>
                  <hr className="text-customOrange opacity-40" />
                </>
              )}
            </div>
            {selectedProduct.variants.slice(1) && (
              <p className="text-lg text-black font-semibold mb-2">
                {selectedProduct.variants.slice(1).length === 1
                  ? "Product Variant"
                  : "Product Variants"}
              </p>
            )}
            <div className="px-2 ">
              <div className="flex w-full overflow-x-auto space-x-4 snap-x snap-mandatory">
                {renderVariants(selectedProduct.variants || [])}
              </div>
            </div>

            {selectedProduct.subProducts && (
              <p className="text-lg text-black font-semibold mb-2">
                {selectedProduct.subProducts.length > 1
                  ? "Sub-Products"
                  : "Sub-Products"}
              </p>
            )}

            <div className="w-full">
              {selectedProduct.subProducts &&
                selectedProduct.subProducts.map((sp) => (
                  <div key={sp.subProductId} className="flex items-center ">
                    <div className="w-28 h-28">
                      <img
                        src={sp.images}
                        alt=""
                        className="object-cover bg-customSoftGray rounded-md w-full h-24"
                      />
                    </div>
                    <div className="px-3 mb-4 flex w-full flex-col justify-between space-y-3 ">
                      <p className="text-black font-semibold text-sm">
                        Color: <span className="font-normal">{sp.color}</span>
                      </p>
                      <hr className="text-customOrange opacity-40   " />
                      <p className="text-black font-semibold text-sm">
                        Size: <span className="font-normal">{sp.size} </span>
                      </p>
                      <hr className="text-customOrange opacity-40   " />
                      {isRestocking ? (
                        <>
                          <p className="text-customOrange text-sm">
                            Stock Quantity
                          </p>
                          <input
                            type="number"
                            className="border no-spinner p-1 ml-2 rounded-[10px] focus:outline-customOrange"
                            value={
                              restockValues[sp.subProductId]?.quantity || ""
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              // Prevent negative values
                              if (value >= 0) {
                                handleRestockInputChange(
                                  "quantity",
                                  sp.subProductId,
                                  e.target.value
                                );
                              } else {
                                toast.error(
                                  "Please enter a non-negative value."
                                );
                              }
                            }}
                          />
                        </>
                      ) : (
                        <p className="text-black font-semibold text-sm">
                          Quantity:{" "}
                          <span className="font-normal">{sp.stock}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {selectedProduct && (
              <div className="px-3 my-4 flex flex-col justify-between space-y-3">
                <div className="flex justify-between">
                  <p className="text-black text-sm font-bold">
                    Unpublish/Publish Product
                  </p>
                  <ToggleButton
                    itemId={selectedProduct.id}
                    initialIsOn={isPublished}
                    vendorId={vendorId}
                    name={selectedProduct.name}
                  />
                </div>
              </div>
            )}

            <div className={`mt-10`}>
              {isRestocking ? (
                <div className="flex">
                  <motion.button
                    onClick={handleSubmitRestock}
                    whileTap={{ scale: 1.1 }}
                    className={`flex glow-button justify-center items-center w-full h-12 mt-7 bg-customOrange text-white font-semibold rounded-full ${
                      !hasValidRestockValues() && "opacity-25"
                    }`}
                    disabled={!hasValidRestockValues()}
                  >
                    {rLoading ? (
                      <RotatingLines
                      strokeColor="white"
                      strokeWidth="5"
                      animationDuration="0.75"
                      width="20"
                      visible={true}
                    />
                    ) : (
                      "Submit Restock"
                    )}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 1.1 }}
                    onClick={toggleRestockMode}
                    className="glow-button w-full h-12 mt-7 ml-4 bg-customSoftGray font-semibold rounded-full text-customRichBrown border border-customRichBrown"
                  >
                    Cancel
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 1.1 }}
                  onClick={toggleRestockMode}
                  className="glow-button w-full h-12 mt-7 bg-customOrange text-white font-semibold rounded-full"
                >
                  Restock Item
                </motion.button>
              )}
              {/* <motion.button
                className="glow-button w-full h-12 mt-7 bg-customOrange text-white font-semibold rounded-full"
              >
                Restock Item
              </motion.button> */}
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

      {showConfirmation &&
        (action === "delete" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={confirmDeleteProduct}
            message="Are you sure you want to delete this product?"
            title="Delete Product"
            loading={oLoading}
          />
        ) : action === "bulkDelete" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={confirmBulkDeleteProduct}
            message="Are you sure you want to delete these products?"
            title="Delete Products"
            loading={oLoading}
          />
        ) : action === "publish" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={bulkPublishStateChange}
            message="Are you sure you want to publish these products?"
            title="Publish Products"
            loading={oLoading}
          />
        ) : action === "unpublish" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={bulkPublishStateChange}
            message="Are you sure you want to unpublish these products?"
            title="Unpublish Products"
            loading={oLoading}
          />
        ) : null)}
    </>
  );
};

export default VendorProducts;
