import React, { useEffect, useState, useContext } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  arrayRemove,
  doc,
  updateDoc,
  addDoc,
  onSnapshot,
  where,
  query,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MdOutlineStarPurple500,
  MdOutlineUnpublished,
  MdPublishedWithChanges,
} from "react-icons/md";
import { MdOutlineStarBorderPurple500 } from "react-icons/md";
import Modal from "../../components/layout/Modal";
import ConfirmationDialog from "../../components/layout/ConfirmationDialog";
import { FaRegCircle, FaRegCheckCircle, FaCogs } from "react-icons/fa";
import { GrRadialSelected } from "react-icons/gr";
import { RotatingLines } from "react-loader-spinner";
import AddProduct from "../vendor/AddProducts";
import { FiMoreHorizontal, FiPlus } from "react-icons/fi";
import VendorProductModal from "../../components/layout/VendorProductModal";
import ToggleButton from "../../components/Buttons/ToggleButton";
import { motion } from "framer-motion";
import Skeleton from "react-loading-skeleton";
import "./vendor.css";
import ScrollToTop from "../../components/layout/ScrollToTop";
import { VendorContext } from "../../components/Context/Vendorcontext";
import { LuCopy, LuCopyCheck } from "react-icons/lu";
import SEO from "../../components/Helmet/SEO";
import {
  TbBoxOff,
  TbEdit,
  TbRosetteDiscount,
  TbRosetteDiscountOff,
} from "react-icons/tb";
import SingleDiscountModal from "../vendor/SingleDiscountModal";
import { start } from "@cloudinary/url-gen/qualifiers/textAlignment";
import { IoTrashOutline } from "react-icons/io5";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { HiWrenchScrewdriver } from "react-icons/hi2";
import MultiDiscountModal from "../vendor/MultiDiscountModal";
import EditProductModal from "../vendor/EditProductModal";

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
  const [showDisableConfirmation, setShowDisableConfirmation] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [action, setAction] = useState("");
  const [isRestocking, setIsRestocking] = useState(false); // New state
  const [restockValues, setRestockValues] = useState({});
  const [rLoading, setRLoading] = useState(false);
  const [oLoading, setOLoading] = useState(false);
  const [mLoading, setMLoading] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [picking, setPicking] = useState(false);

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isMultiDiscountModalOpen, setIsMultiDiscountModalOpen] =
    useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { vendorData } = useContext(VendorContext);

  const [pickedProducts, setPickedProducts] = useState([]);
  const [pinnedCount, setPinnedCount] = useState(0);

  const [pickState, setPickState] = useState(null);
  const [viewPickOption, setViewPickOption] = useState(false);
  const [viewSubOptions, setViewSubOptions] = useState(false);

  const auth = getAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { highlightId } = location.state || {};

  const renderVariants = (variants) => {
    const groupedVariants = groupVariantsByColor(variants);
    return Object.entries(groupedVariants).map(
      ([color, variants], colorIndex) => {
        const hasOutOfStockVariant = variants.some(
          (variant) => variant.stock === 0
        );

        return (
          <div
            key={colorIndex}
            className="bg-customSoftGray p-3 rounded-lg relative"
          >
            {hasOutOfStockVariant && tabOpt !== "OOS" && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-customOrange rounded-full animate-ping"></div>
            )}

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
        );
      }
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

  useEffect(() => {}, []);

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
      where("vendorId", "==", vendorId),
      where("isDeleted", "==", false) // Exclude deleted products
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
    setproductId(product.id);
    setIsViewProductModalOpen(true);
    console.log(product); /*debugging purposes*/
  };

  const handleTogglePicking = () => {
    // setPicking((prev) => !prev);
    setPickedProducts([]); // Reset picked products when toggling
    setViewPickOption((prev) => !prev);
    setViewSubOptions(false);
    setPickState(null);
    setPicking(false); // Reset picking state when toggling
  };

  const startPicking = () => {
    setPicking(true);
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
  useEffect(() => {
    if (!highlightId || productsLoading) return;

    // Small timeout so that React has actually rendered all cards into the DOM first:
    setTimeout(() => {
      const el = document.getElementById(`product-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("highlight-animation");
        setTimeout(() => el.classList.remove("highlight-animation"), 2000);
      }
    }, 300);
  }, [highlightId, productsLoading, products]);

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
      setViewPickOption((prev) => !prev);
      setViewSubOptions(false);
      setPickState(null);
      setAction("");
      setPicking(false); // Reset picking state when toggling
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
    const vendorDocRef = doc(db, "vendors", vendorId);
    const length = pickedProducts.length;
    try {
      for (const productId of pickedProducts) {
        const productRef = doc(db, "products", productId);
        await updateDoc(productRef, {
          published: false, // Ensure the product is unpublished
          isDeleted: true,
        });

        await updateDoc(vendorDocRef, {
          productIds: arrayRemove(productId),
        });
      }
      toast.success("Selected products deleted successfully.");
      setPickedProducts([]);
      setViewPickOption((prev) => !prev);
      setViewSubOptions(false);
      setPickState(null);
      setPicking(false); // Reset picking state when toggling
      setShowConfirmation(false);
      setAction("");

      await addActivityNote(
        `Deleted ${length > 1 ? "Products" : "a Product"}🗑`,
        `You removed ${length} product${
          length > 1 ? "s" : ""
        } from your store! ${
          length > 1 ? "These products" : "This product"
        } no longer exist in your store and customers that have ${
          length > 1 ? "them" : "it"
        } in their carts will be notified.`,
        "Product Update"
      );
    } catch (error) {
      console.error("Error deleting products: ", error);
      toast.error("Error deleting products: " + error.message);
    } finally {
      setOLoading(false);
    }
  };

  const handleBulkDiscountRemoval = async () => {
    if (pickedProducts.length === 0) return;
    setOLoading(true);
    const updatedProducts = []; // Store updated products for state update
    try {
      for (const productId of pickedProducts) {
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) continue;

        const productData = productSnap.data();
        const discount = productData.discount;
        const initPrice = discount?.initialPrice;
        const notFreebie = discount?.discountType !== "personal-freebies";

        if (notFreebie) {
          await updateDoc(productRef, {
            price: initPrice,
            discount: null,
            discountId: null,
          });
          updatedProducts.push({
            ...productData,
            id: productId,
            price: initPrice,
            discount: null,
            discountId: null,
          });
        } else {
          await updateDoc(productRef, {
            discount: null,
            discountId: null,
          });
          updatedProducts.push({
            ...productData,
            id: productId,
            discount: null,
            discountId: null,
          });
        }
      }

      await addActivityNote(
        "Discounts Disabled ❌",
        `You've disabled the discount on some products. Customers can now only buy them at their original prices.`,
        "Product Update"
      );
      toast.success("Discounts removed from selected product(s).");

      setPickedProducts([]);
      setAction("");
      setViewPickOption((prev) => !prev);
      setViewSubOptions(false);
      setPickState(null);
      setPicking(false); // Reset picking state when toggling
      setShowConfirmation(false);
    } catch (error) {
      console.error("Error in bulk discount removal: ", error);
      toast.error("Error in bulk discount removal: " + error.message);
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
    setIsEditModalOpen(false);
    setSelectedProduct(null);

    if (isRestocking) {
      setIsRestocking(false);
      setRestockValues({});
    }
  };
  const [productId, setproductId] = useState("null");

  const textToCopy = `https://mx.shopmythrift.store/product/${
    productId || "null"
  }?shared=true`;

  const [copied, setCopied] = useState(false);
  const copyToClipboard = async () => {
    if (!copied) {
      console.log("Clicked");
      try {
        (await navigator.clipboard.writeText(textToCopy)) &&
          console.log("copied"); // Ensure the text is copied
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        toast.error("Failed to copy!"); // Handle any errors during copy
        console.error("Failed to copy text: ", err);
      }
    }
  };

  // Reverse Engineering the discount logic
  const closeDiscountModal = () => {
    setIsDiscountModalOpen(false);
  };

  const closeMultiDiscountModal = () => {
    setIsMultiDiscountModalOpen(false);
    setAction("");
  };

  const disableDiscount = async () => {
    setDisableLoading(true);
    try {
      const productRef = doc(db, "products", selectedProduct.id);

      let initPrice = selectedProduct.discount.initialPrice;
      let notFreebie =
        selectedProduct.discount.discountType !== "personal-freebies";

      notFreebie
        ? await updateDoc(productRef, {
            price: initPrice,
            discount: null,
            discountId: null,
          }).then(
            setProducts((prevProducts) =>
              prevProducts.map((p) =>
                p.id === selectedProduct.id
                  ? {
                      ...p,
                      price: initPrice,
                      discount: null,
                      discountId: null,
                    }
                  : p
              )
            )
          )
        : await updateDoc(productRef, {
            discount: null,
            discountId: null,
          }).then(
            setProducts((prevProducts) =>
              prevProducts.map((p) =>
                p.id === selectedProduct.id
                  ? {
                      ...p,
                      discount: null,
                      discountId: null,
                    }
                  : p
              )
            )
          );

      await addActivityNote(
        "Discount Disabled ❌",
        `You've disabled the discount on ${selectedProduct.name}. Customers can now only buy this at the original price.`,
        "Product Update"
      );
      toast.success("Discount disabled successfully.");
      setDisableLoading(false);

      // Update the pinned count after the change
      fetchPinnedProductsCount(); // Assuming this function recalculates the pinned count
    } catch (error) {
      console.error("Error disabling discount", error);
      toast.error("Error disabling discount: " + error.message);
      setDisableLoading(false);
    }
    setShowDisableConfirmation(false);
    setDisableLoading(false);
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
        toast.error(
          "You cannot unfeature a product within 12 hours of featuring it."
        );
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
          p.id === product.id
            ? {
                ...p,
                isFeatured: newIsFeaturedStatus,
                pinnedAt: newIsFeaturedStatus ? currentTime : null,
              }
            : p
        )
      );

      // Update pinned count locally
      setPinnedCount((prevCount) =>
        newIsFeaturedStatus ? prevCount + 1 : prevCount - 1
      );

      // If the product was just pinned (isFeatured set to true), add an activity note
      if (newIsFeaturedStatus) {
        await addActivityNote(
          "Product Starred ⭐",
          `You've made ${product.name} one of your featured products! This will be part of the first products customers see in your store.`,
          "Product Update"
        );
        toast.success("Product featured successfully.");
      } else {
        toast.success("Product unfeatured successfully.");
      }

      // Update the pinned count after the change
      fetchPinnedProductsCount(); // Assuming this function recalculates the pinned count
    } catch (error) {
      console.error("Error pinning/unpinning product:", error);
      toast.error("Error Featuring/unfeaturing product: " + error.message);
    }
  };

  const zeroAllStock = async () => {
    setMLoading(true);
    try {
      // Ensure variants and subProducts are defined as arrays
      const variants = selectedProduct.variants || [];
      const subProducts = selectedProduct.subProducts || [];

      const productRef = doc(db, "products", selectedProduct.id);

      // Update variants with restock values
      const updatedVariants = variants.map((variant) => {
        return {
          ...variant,
          stock: 0,
        };
      });

      // Update sub-products with restock values
      const updatedSubProducts = subProducts.map((subProduct) => {
        return {
          ...subProduct,
          stock: 0,
        };
      });

      // Update Firestore with the modified stock quantities and total stockQuantity
      await updateDoc(productRef, {
        variants: updatedVariants,
        subProducts: updatedSubProducts,
        stockQuantity: 0, // Update the stockQuantity field with the new total
      });
      toast.success(`Product is now marked as "Sold Out"`);
      await addActivityNote(
        "Product Sold Out 🚫",
        `You've marked ${selectedProduct.name} as "Sold Out". Customers will not be able to buy this product until it is restocked.`,
        "Product Update"
      );
    } catch (error) {
      console.error("Error marking as Sold Out:", error);
      toast.error("Error marking as Sold Out: " + error.message);
    } finally {
      setMLoading(false);
      setShowConfirmation(false);
      setAction("");
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

      // Step 1: Update the 'isDeleted' field of the product in the 'products' collection
      await updateDoc(doc(db, "products", productId), {
        isDeleted: true,
        published: false, // Ensure the product is unpublished
      });

      // Step 2: Optionally, remove the productId from the vendor's 'productIds' array
      // (if needed for logic where you don't want the vendor to reference this product anymore)
      const vendorDocRef = doc(db, "vendors", vendorId);
      await updateDoc(vendorDocRef, {
        productIds: arrayRemove(productId),
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
      setAction("");
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
        `You restocked ${selectedProduct.name}! Customers can now buy more of this product from your store.`,
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

  const confirmStockReset = () => {
    setAction("markSoldOut");
    setShowConfirmation(true);
  };

  const handleBulkDelete = () => {
    setAction("bulkDelete");
    setShowConfirmation(true);
  };
  const truncateText = (text, maxLength = 20) => {
    if (!text) return "";
    return text.length <= maxLength
      ? text
      : text.substring(0, maxLength) + "...";
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

  const totalOutOfStock = products.filter((p) => p.stockQuantity === 0).length;

  const filteredProducts = products
    .filter((p) => {
      if (tabOpt === "Active") {
        if (pickState === "addDisc") {
          return (
            p.published && p.stockQuantity > 0 && !p.discountId && !p.discount
          );
        } else if (pickState === "remDisc") {
          return (
            p.published && p.stockQuantity > 0 && p.discountId && p.discount
          );
        } else return p.published && p.stockQuantity > 0;
      } else if (tabOpt === "OOS") {
        if (pickState === "addDisc") {
          return p.stockQuantity === 0 && !p.discountId && !p.discount;
        } else if (pickState === "remDisc") {
          return p.stockQuantity === 0 && p.discountId && p.discount;
        } else return p.stockQuantity === 0;
      } else {
        if (pickState === "addDisc") {
          return !p.published && !p.discountId && !p.discount;
        } else if (pickState === "remDisc") {
          return !p.published && p.discountId && p.discount;
        } else return !p.published;
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
      <SEO
        title={`Your Store - My Thrift`}
        description={`Manage your products on My Thrift`}
        url={`https://www.shopmythrift.store/vendor-products`}
      />
      <div className="mb-40 mx-3 my-7 flex flex-col justify-center space-y-5 font-opensans">
        <ScrollToTop />
        <div className="flex justify-end">
          <div className="relative flex justify-center items-center">
            {/* {picking && pickedProducts.length < 1 && ( */}
            {viewPickOption && !viewSubOptions && !picking && (
              <div className="absolute top-10 right-[28px] items-center flex flex-col justify-center  w-[300px] h-[104px] p-4 space-y-1 bg-white border shadow-lg rounded-2xl z-50 text-[16px]">
                <div
                  className="flex justify-between w-full items-center py-2 cursor-pointer"
                  onClick={() => {
                    setPickState("manage"); // Publish, Unpublish and Delete
                    startPicking();
                  }}
                >
                  <p className="font-semibold text-black">Product Management</p>
                </div>
                <hr className="w-[250px]" />
                <div
                  className="flex relative justify-between w-full items-center py-2 cursor-pointer"
                  onClick={() => {
                    setViewSubOptions(true);
                  }}
                >
                  <p className="font-semibold text-black">Manage Discounts</p>
                </div>
              </div>
            )}
            {viewSubOptions && !picking && (
              <div className="absolute top-10 right-[28px] items-center flex flex-col justify-center  w-[300px] h-[52px] p-4 space-y-1 bg-white border shadow-lg rounded-2xl z-50 text-[16px]">
                {/* <div
                  className="flex justify-between w-full items-center py-2 cursor-pointer"
                  onClick={() => {
                    setPickState("addDisc"); //add discount
                    startPicking();
                  }}
                >
                  <p className="font-semibold text-black">Add Discounts</p>
                  <TbRosetteDiscount className="text-2xl" />
                </div>
                <hr className="w-[250px]" /> */}
                <div
                  className="flex relative justify-between w-full items-center py-2 cursor-pointer"
                  onClick={() => {
                    setPickState("remDisc"); //remove discount
                    startPicking();
                  }}
                >
                  <p className="font-semibold text-black">Remove Discounts</p>
                  <TbRosetteDiscountOff className="text-2xl" />
                </div>
              </div>
            )}
            {picking && pickedProducts.length < 1 && (
              <div className="absolute top-10 right-[28px] items-center flex justify-between  w-[300px] h-[52px] p-4 bg-white border shadow-lg rounded-2xl z-50 text-[16px]">
                <p className="font-semibold text-black">Select a Product</p>
                <FaRegCheckCircle />
              </div>
            )}
            {/* {!picking ? ( */}
            {!viewPickOption ? (
              <div
                className="cursor-pointer relative rounded-full w-11 h-11 bg-customOrange bg-opacity-10 flex justify-center items-center"
                onClick={handleTogglePicking}
                // onClick={() => {
                //   setViewPickOption((prev) => !prev);
                // }}
              >
                <FiMoreHorizontal className="w-6 h-6" />
              </div>
            ) : (
              <p
                className="cursor-pointer text-[16px] my-2.5"
                onClick={handleTogglePicking}
                // onClick={() => {
                //   setViewPickOption((prev) => !prev);
                // }}
              >
                Cancel
              </p>
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
              className={`text-sm cursor-pointer ${
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
              className={`text-sm cursor-pointer flex space-x-1 ${
                tabOpt === "OOS" ? "text-customOrange" : "text-black"
              }`}
              onClick={() => setTabOpt("OOS")}
            >
              Out of Stock{" "}
              {totalOutOfStock > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full flex items-center justify-center w-5 h-5 animate-ping">
                  {totalOutOfStock}
                </span>
              )}
            </p>
            <div className="h-1">
              {tabOpt === "OOS" && (
                <hr className="text-customOrange opacity-40  w-11" />
              )}
            </div>
          </div>
          <div className="flex flex-col justify-center items-center space-y-3">
            <p
              className={` text-sm cursor-pointer ${
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
        {tabOpt === "Active" &&
          (() => {
            const activeDiscountedProducts = products.filter(
              (product) =>
                product.discount && !product.isDeleted && product.published
            );
            return (
              activeDiscountedProducts.length > 0 && (
                <div className="px-2 py-1 bg-green-50 rounded-lg -translate-y-2 shadow">
                  <p className="text-xs font-semibold font-opensans text-green-600">
                    Discount Campaign Active: You are currently offering
                    discounts on {activeDiscountedProducts.length} product
                    {activeDiscountedProducts.length > 1 ? "s" : ""}. Your
                    followers will be notified🎊
                  </p>
                </div>
              )
            );
          })()}

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
            filteredProducts.map((product) => {
              // Check if any sub-product has stock of zero
              const hasOutOfStockSubProduct = product.subProducts?.some(
                (sp) => sp.stock === 0
              );
              const hasOutOfStockVariant = product.variants?.some(
                (variant) => variant.stock === 0
              );
              return (
                <div
                  key={product.id}
                  id={`product-${product.id}`}
                  className="cursor-pointer p-2"
                  onClick={(e) =>
                    picking
                      ? togglePickProduct(product.id)
                      : handleProductClick(product)
                  }
                >
                  {/* Image container */}
                  <div
                    className={`
        relative w-44 h-44 rounded-xl bg-customSoftGray overflow-hidden
        ${
          highlightId === product.id
            ? "ring-4 ring-customOrange animate-pulse"
            : ""
        }
      `}
                  >
                    {(hasOutOfStockSubProduct || hasOutOfStockVariant) &&
                      tabOpt !== "OOS" && (
                        <div className="absolute bottom-2 right-2 w-4 h-4 bg-customOrange rounded-full animate-ping" />
                      )}

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
                            <MdOutlineStarPurple500 className="text-customOrange w-5 h-5" />
                          ) : (
                            <MdOutlineStarBorderPurple500 className="text-customOrange w-5 h-5" />
                          )}
                        </div>
                      )
                    )}

                    {!picking && product.discount && (
                      <div className="absolute top-2 left-2 flex items-center">
                        {product.discount.discountType.startsWith(
                          "personal-freebies"
                        ) ? (
                          <div className="bg-customPink text-customOrange text-sm px-2 py-1 font-medium rounded-md">
                            {truncateText(product.discount.freebieText)}
                          </div>
                        ) : (
                          <div className="bg-customPink text-customOrange text-sm font-medium px-2 py-1 rounded-md">
                            -{product.discount.percentageCut}%
                          </div>
                        )}
                      </div>
                    )}

                    <img
                      src={product.coverImageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl bg-customSoftGray"
                    />
                  </div>

                  {/* Text container */}
                  <div className="mt-2 flex flex-col space-y-1">
                    <div className="flex">
                      <p className="text-xs font-semibold font-opensans text-black truncate w-32">
                        {product.name}
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <p className="text-xs font-semibold font-opensans text-black">
                        Total Stock: {product.stockQuantity}
                      </p>
                    </div>
                    <p className="text-xs font-medium font-opensans text-black">
                      &#x20a6;{formatNumber(product.price)}
                    </p>
                    {!product.published && (
                      <p className="text-xs font-semibold font-opensans text-customOrange">
                        Unpublished Product
                      </p>
                    )}

                    {product.discount && (
                      <p className="text-xs font-opensans font-semibold text-customRichBrown">
                        {product.discount.discountType.startsWith("inApp")
                          ? "In-App Discount"
                          : product.discount.discountType ===
                            "personal-monetary"
                          ? "Personal Monetary Discount"
                          : `Freebie: ${truncateText(
                              product.discount.freebieText
                            )}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          ) : tabOpt === "Active" && !productsLoading ? (
            <p className="text-xs font-opensans mt-24">
              📭 Your store has no active products yet. Upload items to start
              attracting customers!
            </p>
          ) : tabOpt === "OOS" && !productsLoading ? (
            <p className="text-xs font-opensans mt-24">
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
              <p className="text-xs mt-24 font-opensans">
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
          className={`fixed bottom-24 right-5 flex justify-center items-center ${
            vendorData?.isApproved
              ? "bg-customOrange"
              : "bg-customOrange opacity-35 cursor-not-allowed"
          } text-white rounded-full w-11 h-11 shadow-lg focus:outline-none`}
          disabled={!vendorData?.isApproved}
        >
          <span className="text-3xl">
            <FiPlus />
          </span>
        </button>
      )}

      {picking && pickedProducts.length > 0 && pickState === "manage" ? (
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
            <p className="text-lg font-semibold font-opensans text-customRichBrown cursor-pointer">
              {tabOpt === "Active" ? (
                <p
                  className="text-lg font-semibold text-customRichBrown"
                  onClick={handleUnpublish}
                >
                  Unpublish
                </p>
              ) : (
                <p
                  className="text-lg font-semibold font-opensans text-customRichBrown cursor-pointer"
                  onClick={handlePublish}
                >
                  Publish
                </p>
              )}
            </p>
          )}
          <p
            className="text-lg font-semibold font-opensans text-customRichBrown mb-4 cursor-pointer"
            onClick={() => handleBulkDelete()}
          >
            Delete
          </p>
        </motion.div>
      ) : (
        picking &&
        pickedProducts.length > 0 && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className={`fixed bottom-0 z-[1001] flex px-4 justify-center py-3 bg-white text-white w-full h-[94px] shadow-lg focus:outline-none`}
          >
            <p className="text-lg font-semibold font-opensans text-customRichBrown">
              {pickState === "addDisc" ? (
                <p
                  className="text-lg font-semibold text-customRichBrown cursor-pointer"
                  // onClick={handleBulkAddDiscount}
                  onClick={() => {
                    setAction("addDiscount");
                    setIsMultiDiscountModalOpen(true);
                  }}
                >
                  Add Discount
                </p>
              ) : (
                pickState === "remDisc" && (
                  <p
                    className="text-lg font-semibold font-opensans text-customRichBrown cursor-pointer"
                    onClick={() => {
                      setAction("removeDiscount");
                      setShowConfirmation(true);
                    }}
                  >
                    Remove Discount
                  </p>
                )
              )}
            </p>
          </motion.div>
        )
      )}

      {selectedProduct && (
        <VendorProductModal
          isOpen={isViewProductModalOpen}
          onClose={closeModals}
          onDel={handleDeleteProduct}
        >
          <div>
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

            <div className="flex items-center mb-4 justify-between">
              <p className="text-lg text-black font-opensans font-semibold ">
                {selectedProduct.name}
              </p>
              {selectedProduct.published && (
                <button
                  className="text-white cursor-not-allowed"
                  onClick={copyToClipboard}
                >
                  {!copied ? (
                    <LuCopy className="text-2xl text-customOrange" />
                  ) : (
                    <LuCopyCheck className="text-2xl text-customOrange" />
                  )}
                </button>
              )}
            </div>
            <div className="p-3 mb-4 flex flex-col  bg-gray-50  rounded-lg w-full  justify-between space-y-3">
              <p className="text-black font-semibold  font-opensans text-sm">
                Price:{" "}
                <span className="font-normal">
                  &#x20a6;{formatNumber(selectedProduct.price)}
                </span>
              </p>
              <hr className="text-customOrange opacity-40" />

              <p className="text-black font-semibold font-opensans text-sm">
                Product Category:{" "}
                <span className="font-normal">{selectedProduct.category}</span>
              </p>
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold font-opensans text-sm">
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

              <p className="text-black font-semibold  font-opensans text-sm">
                Product Type:{" "}
                <span className="font-normal">
                  {selectedProduct.productType}
                </span>
              </p>
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold font-opensans text-sm">
                Product Condition:{" "}
                <span className="font-normal">{selectedProduct.condition}</span>
              </p>
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold font-opensans text-sm">
                Product Sub-type:{" "}
                <span className="font-normal">{selectedProduct.subType}</span>
              </p>
              <hr className="text-customOrange opacity-40" />

              <div className="text-black font-opensans font-semibold text-sm">
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
                  <p className="text-red-400 font-opensans font-semibold text-sm">
                    Defect Description:{" "}
                    <span className="font-normal">
                      {selectedProduct.defectDescription}
                    </span>
                  </p>
                  <hr className="text-customOrange opacity-40" />
                </>
              )}
            </div>

            {selectedProduct && selectedProduct.discount && (
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold font-opensans mb-2">
                    Product Discount Details
                  </h3>
                  <div
                    className="flex justify-between space-x-1 items-center text-red-600 mb-2 font-medium font-opensans text-base cursor-pointer"
                    onClick={() => setShowDisableConfirmation(true)}
                  >
                    <div>Disable</div>
                    <TbRosetteDiscountOff className="text-2xl" />
                  </div>
                </div>

                {selectedProduct.discount ? (
                  <div className="flex items-center  justify-between py-1 px-2 bg-green-100 rounded-full">
                    <span className="text-sm font-semibold font-opensans text-green-800">
                      {selectedProduct.discount.discountType.startsWith("inApp")
                        ? "In‑App Discount"
                        : selectedProduct.discount.discountType ===
                          "personal-monetary"
                        ? "Personal Monetary Discount"
                        : selectedProduct.discount.discountType ===
                          "personal-freebies"
                        ? `Freebie: ${truncateText(
                            selectedProduct.discount.freebieText
                          )}`
                        : ""}
                    </span>
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center font-opensans justify-between p-2 bg-gray-200 rounded-full">
                    <span className="text-sm font-semibold  text-gray-600">
                      Discount
                    </span>
                    <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded-full">
                      Inactive
                    </span>
                  </div>
                )}
                {(selectedProduct.discount.discountType.startsWith("inApp") ||
                  selectedProduct.discount.discountType ===
                    "personal-monetary") && (
                  <>
                    <div className="p-3 mb-4 flex w-full bg-gray-50  rounded-lg mt-3 flex-col justify-between space-y-3">
                      <p className="text-black font-semibold font-opensans text-sm">
                        Initial Price:
                        <span className="font-normal">
                          {" "}
                          &#x20a6;
                          {formatNumber(selectedProduct.discount.initialPrice)}
                        </span>
                      </p>
                      <hr className="text-customOrange opacity-40" />

                      <p className="text-black font-semibold font-opensans text-sm">
                        Discount Price:
                        <span className="font-normal">
                          {" "}
                          &#x20a6;
                          {formatNumber(selectedProduct.discount.discountPrice)}
                        </span>
                      </p>
                      <hr className="text-customOrange opacity-40" />

                      <p className="text-black font-semibold font-opensans text-sm">
                        Percentage:
                        <span className="font-normal">
                          {" "}
                          {selectedProduct.discount.percentageCut}%
                        </span>
                      </p>
                      <hr className="text-customOrange opacity-40" />

                      <p className="text-black font-semibold font-opensans text-sm">
                        Amount Off:
                        <span className="font-normal">
                          {" "}
                          &#x20a6;
                          {formatNumber(
                            selectedProduct.discount.subtractiveValue
                          )}
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
            {selectedProduct?.variants?.length > 1 && (
              <p className="text-lg font-opensans text-black font-semibold mb-2">
                {selectedProduct.variants.length - 1 === 1
                  ? "Product Variant"
                  : "Product Variants"}
              </p>
            )}
            <div className="px-2 ">
              <div className="flex w-full font-opensans overflow-x-auto space-x-4 snap-x snap-mandatory">
                {renderVariants(selectedProduct.variants || [])}
              </div>
            </div>

            {selectedProduct.subProducts &&
              selectedProduct.subProducts.length > 0 && (
                <p className="text-lg font-opensans text-black font-semibold my-2">
                  {selectedProduct.subProducts.length > 1
                    ? "Sub-Products"
                    : "Sub-Products"}
                </p>
              )}

            <div className="w-full">
              {selectedProduct.subProducts &&
                selectedProduct.subProducts.map((sp) => (
                  <div
                    key={sp.subProductId}
                    className="flex items-center relative"
                  >
                    {sp.stock === 0 && tabOpt !== "OOS" && (
                      <div className="absolute bottom-6 right-2 w-3 h-3 bg-customOrange rounded-full animate-ping"></div>
                    )}
                    <div className="w-28 h-28">
                      <img
                        src={sp.images}
                        alt=""
                        className="object-cover bg-customSoftGray rounded-md w-full h-24"
                      />
                    </div>
                    <div className="px-3 mb-4 flex w-full flex-col justify-between space-y-3 ">
                      <p className="text-black font-semibold font-opensans text-sm">
                        Color: <span className="font-normal">{sp.color}</span>
                      </p>
                      <hr className="text-customOrange opacity-40   " />
                      <p className="text-black font-opensans font-semibold text-sm">
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
                        <p
                          className={`font-semibold text-sm ${
                            sp.stock === 0 ? "text-red-500" : "text-black"
                          }`}
                        >
                          Quantity:{" "}
                          <span className="font-normal">{sp.stock}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            <hr className="border-gray-100  mt-4" />
            {selectedProduct && (
              <div className="text-lg flex items-center space-x-1 text-customOrange mt-4 mb-2 font-medium font-opensans">
                <div>Actions</div>{" "}
                <span>
                  <FaCogs className="text-2xl" />
                </span>
              </div>
            )}

            {selectedProduct && (
              <div className="p-3 my-4 flex flex-col  bg-gray-50  rounded-lg w-full font-opensans justify-between space-y-3">
                {!selectedProduct.discount && (
                  <div
                    className="flex space-x-1 items-center justify-between font-medium text-base cursor-pointer text-black"
                    onClick={() => setIsDiscountModalOpen(true)}
                  >
                    <div>Start a discount</div>
                    <TbRosetteDiscount className="text-2xl text-customOrange" />
                  </div>
                )}

                {!(selectedProduct.stockQuantity < 1) && (
                  <hr className="text-customOrange opacity-40" />
                )}

                {!(selectedProduct.stockQuantity < 1) && (
                  <div
                    className="flex space-x-1 justify-between items-center font-medium text-base cursor-pointer text-black"
                    onClick={() => confirmStockReset()}
                  >
                    <div>Mark As "Sold-Out"</div>
                    <TbBoxOff className="text-2xl text-customOrange" />
                  </div>
                )}

                {!(selectedProduct.stockQuantity < 1) && (
                  <hr className="text-customOrange opacity-40" />
                )}

                {(
                  <div
                    className={`flex relative space-x-1 justify-between items-center font-medium text-base cursor-pointer text-black ${
                      selectedProduct.editCount > 0 ? "text-gray-400" : ""
                    }`}
                    onClick={() => {
                      // If editCount is undefined or null, treat it as zero
                      const edits = selectedProduct.editCount ?? 0;

                      if (edits === 0) {
                        // only toggle if no edits yet
                        setIsEditModalOpen(!isEditModalOpen);
                      } else {
                        setAction("editUnavailable")
                        setShowConfirmation(true)
                      }
                    }}
                  >
                    <div>Edit Product</div>
                    <TbEdit
                      className={`text-2xl ${
                        selectedProduct.editCount > 0
                          ? "text-gray-400"
                          : "text-customOrange"
                      }`}
                    />
                  </div>
                )}

                <hr className="text-customOrange opacity-40" />
                <div className="flex justify-between">
                  <p className="text-black font-opensans text-base font-medium">
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

            <div className="sticky bottom-0 left-0 w-full py-8 px-2 translate-y-7 bg-gradient-to-t from-white via-white/95 to-transparent z-10">
              {isRestocking ? (
                <div className="flex justify-between items-center space-x-4">
                  <motion.button
                    onClick={handleSubmitRestock}
                    whileTap={{ scale: 1.1 }}
                    className={`flex glow-button justify-center items-center w-full h-12 bg-customOrange text-white font-opensans font-semibold rounded-full ${
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
                    className="glow-button w-full h-12 font-opensans bg-customSoftGray font-semibold rounded-full text-customRichBrown border border-customRichBrown"
                  >
                    Cancel
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 1.1 }}
                  onClick={toggleRestockMode}
                  className="glow-button w-full h-12 bg-customOrange text-white font-opensans font-semibold rounded-full"
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

      {selectedProduct && isDiscountModalOpen && (
        <SingleDiscountModal
          isOpen={isDiscountModalOpen}
          onRequestClose={closeDiscountModal}
          product={selectedProduct}
        />
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

      {isEditModalOpen && (
        <EditProductModal
          selectedProduct={selectedProduct}
          vendorId={vendorId}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {showDisableConfirmation && (
        <ConfirmationDialog
          isOpen={showDisableConfirmation}
          onClose={closeModals}
          onConfirm={disableDiscount}
          message="Are you sure you want to disable this discount?"
          icon={<TbRosetteDiscountOff className="w-4 h-4" />}
          title="Disable Product Discount"
          loading={disableLoading}
        />
      )}

      {showConfirmation &&
        (action === "delete" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={confirmDeleteProduct}
            message="Are you sure you want to delete this product?"
            icon={<IoTrashOutline className="w-4 h-4" />}
            title="Delete Product"
            loading={oLoading}
          />
        ) : action === "bulkDelete" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={confirmBulkDeleteProduct}
            message="Are you sure you want to delete these products?"
            icon={<IoTrashOutline className="w-4 h-4" />}
            title="Delete Product(s)"
            loading={oLoading}
          />
        ) : action === "publish" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={bulkPublishStateChange}
            message="Are you sure you want to publish these products?"
            icon={<MdPublishedWithChanges className="w-4 h-4" />}
            title="Publish Products"
            loading={oLoading}
          />
        ) : action === "unpublish" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={bulkPublishStateChange}
            message="Are you sure you want to unpublish these products?"
            icon={<MdOutlineUnpublished className="w-4 h-4" />}
            title="Unpublish Products"
            loading={oLoading}
          />
        ) : action === "editUnavailable" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            message={`Cannot edit a product more than once at base level...`}
            loading={mLoading}
          />
        ) : action === "markSoldOut" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={zeroAllStock}
            message={`Marking as "Sold-Out" will set the stock of all variants and sub-products to zero. Are you sure you want to proceed?`}
            icon={<TbBoxOff className="w-4 h-4" />}
            title="Mark as Sold-Out"
            loading={mLoading}
          />
        ) : action === "removeDiscount" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={handleBulkDiscountRemoval}
            message="Are you sure you want to remove discount from the selected product(s)?"
            icon={<TbRosetteDiscountOff className="w-4 h-4" />}
            title="Remove Discount"
            loading={oLoading}
          />
        ) : null)}

      {action === "addDiscount" && (
        <MultiDiscountModal
          isOpen={isMultiDiscountModalOpen}
          onRequestClose={closeMultiDiscountModal}
          product={pickedProducts}
        />
      )}
    </>
  );
};

export default VendorProducts;
