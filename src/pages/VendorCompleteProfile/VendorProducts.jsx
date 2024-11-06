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
} from "firebase/firestore";
import { db } from "../../firebase.config";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/layout/Modal";
import ConfirmationDialog from "../../components/layout/ConfirmationDialog";
import { FaTrashAlt, FaPlus, FaBoxOpen, FaEdit } from "react-icons/fa";
import { RotatingLines } from "react-loader-spinner";
import AddProduct from "../vendor/AddProducts";
import { BsBox2Fill, BsPin, BsPinAngleFill } from "react-icons/bs";
import { FaStar } from "react-icons/fa";
import { Pin } from "@mui/icons-material";
import { FiPlus } from "react-icons/fi";
import VendorProductModal from "../../components/layout/VendorProductModal";
import ToggleButton from "../../components/Buttons/ToggleButton";
import { motion } from "framer-motion";

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
  const [showRestockInput, setShowRestockInput] = useState(false);
  const [restockQuantity, setRestockQuantity] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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

    return () => unsubscribe();
  }, [auth, navigate]);

  // Real-time listener to keep `isPublished` up-to-date
  useEffect(() => {
    if (selectedProduct) {
      const productRef = doc(db, "products", selectedProduct.id);
      const unsubscribe = onSnapshot(productRef, (doc) => {
        if (doc.exists()) {
          setIsPublished(doc.data().published);
        }
      });
      fetchVendorProducts(vendorId);
      return () => unsubscribe(); // Clean up the listener on unmount
    }
  }, [selectedProduct, vendorId]);

  const handleToggle = async () => {
    // Any other logic that should happen when toggling
    const productRef = doc(db, "products", selectedProduct.id);
    await updateDoc(productRef, {
      published: !selectedProduct.published,
    });

    selectedProduct.published
      ? toast.success("Product is now drafted successfully.")
      : toast.success("Product published successfully.");
  };

  // Fetch products from the centralized 'products' collection
  const fetchVendorProducts = async (uid) => {
    try {
      // Fetch vendor document to get productIds array
      const vendorDocRef = doc(db, "vendors", uid);
      const vendorDoc = await getDoc(vendorDocRef);

      if (!vendorDoc.exists()) {
        throw new Error("Vendor not found");
      }

      const vendorData = vendorDoc.data();
      const productIds = vendorData.productIds || [];

      setTotalProducts(products.length);

      if (productIds.length === 0) {
        toast.info("No products found.");
        setProducts([]);
        setLoading(false);
        return;
      }

      // Fetch products from the centralized 'products' collection using productIds array
      const productsCollectionRef = collection(db, "products");
      const productsSnapshot = await Promise.all(
        productIds.map(async (productId) => {
          const productDoc = await getDoc(
            doc(productsCollectionRef, productId)
          );
          return productDoc.exists()
            ? { id: productDoc.id, ...productDoc.data() }
            : null;
        })
      );

      const validProducts = productsSnapshot.filter(
        (product) => product !== null
      );
      setProducts(validProducts);
    } catch (error) {
      console.error("Error fetching products: ", error);
      toast.error("Error fetching products: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setIsViewProductModalOpen(true);
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
      fetchVendorProducts(vendorId);
      closeModals();
    } catch (error) {
      console.error("Error pinning product: ", error);
      toast.error("Error pinning product: " + error.message);
    } finally {
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
    }
  };

  const handleDeleteProduct = () => {
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
      fetchVendorProducts(vendorId);
      closeModals();
    } catch (error) {
      console.error("Error restocking product: ", error);
      toast.error("Error restocking product: " + error.message);
    } finally {
      setButtonLoading(false);
    }
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
            filteredProducts < 1
              ? " justify-center items-center text-center"
              : "grid grid-cols-2 gap-4"
          }`}
        >
          {filteredProducts && filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className=" cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <div className="flex flex-col space-y-2">
                  <div className="w-44 h-44 rounded-xl bg-customSoftGray">
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
                      Size: {product.size}
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
          ) : tabOpt === "Active" ? (
            <p className="text-xs mt-24">
              📭 Your store has no active products yet. Upload items to start
              attracting customers!
            </p>
          ) : tabOpt === "OOS" ? (
            <p className="text-xs mt-24">
              📦 You currently have no items marked as out of stock.
            </p>
          ) : (
            <p className="text-xs mt-24">
              📝 You have no saved draft products yet. Start a new listing and
              save it as a draft anytime!
            </p>
          )}
        </div>
      </div>
      <button
        onClick={openAddProductModal}
        className={`fixed bottom-24 right-5 flex justify-center items-center bg-customOrange text-white rounded-full w-11 h-11 shadow-lg focus:outline-none`}
      >
        <span className="text-3xl">
          <FiPlus />
        </span>
      </button>

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
                  {selectedProduct.variants.slice(1).length === 1 ? "Product Variant" : "Product Variants"}
                </p>
              )}
              <div className="flex overflow-x-auto space-x-4 snap-x snap-mandatory">
                {selectedProduct.variants.slice(1) &&
                  selectedProduct.variants.slice(1).map((variant, index) => (
                    <div
                      key={index}
                      className="px-2 mb-4 flex-shrink-0 snap-center flex flex-col justify-between space-y-2 py-2 w-64 rounded-xl bg-customSoftGray"
                    >
                      <p className="text-black font-semibold text-sm">
                        Quantity:{" "}
                        <span
                          className={`${variant.stock < 1 && "text-red-500"}`}
                        >
                          {variant.stock > 0 ? variant.stock : "Out of stock"}
                        </span>
                      </p>
                      <hr className="text-slate-400" />

                      <p className="text-black font-semibold text-sm">
                        Color:{" "}
                        <span className="font-normal">{variant.color}</span>
                      </p>
                      <hr className="text-slate-400" />

                      <p className="text-black font-semibold text-sm">
                        Size:{" "}
                        <span className="font-normal">{variant.size}</span>
                      </p>
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
                      Quantity: <span className="font-normal">{sp.stock}</span>
                    </p>
                    <hr className="text-slate-400" />

                    <p className="text-black font-semibold text-sm">
                      Color: <span className="font-normal">{sp.color}</span>
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
                  />
                </div>
                <hr className="text-slate-400" />
              </div>
            )}

            <div
              className={`mt-10 ${isPublished ? "" : "flex justify-between"}`}
            >
              {!isPublished && (
                <motion.button
                  whileTap={{ scale: 1.05 }}
                  className="glow-button w-full h-12 mt-7 bg-white border-2 border-customRichBrown text-customRichBrown font-semibold rounded-full"
                >
                  Edit Product
                </motion.button>
              )}
              {!isPublished && <div className="w-6"></div>}
              <motion.button
                whileTap={{ scale: 1.1 }}
                className="glow-button w-full h-12 mt-7 bg-customOrange text-white font-semibold rounded-full"
              >
                Restock Item
              </motion.button>
            </div>

            <div className="flex items-center justify-between space-x-2">
              {/* <button
                className="px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 focus:ring focus:ring-red-600 focus:outline-none"
                onClick={handleDeleteProduct}
              >
                <FaTrashAlt />
              </button>
              {selectedProduct.remainingEditTime > 0 && (
                <div className="flex items-center justify-end space-x-2 mt-4">
                  <button
                    className={`px-3 py-2 bg-blue-700 text-white rounded-md shadow-sm hover:bg-blue-800 focus:ring focus:ring-blue-700 focus:outline-none ${
                      buttonLoading ? "cursor-not-allowed" : ""
                    }`}
                    onClick={handleEditProduct}
                    disabled={buttonLoading}
                  >
                    {buttonLoading ? (
                      <RotatingLines width="20" strokeColor="white" />
                    ) : (
                      <FaEdit />
                    )}
                  </button>
                  <span className="text-sm text-red-500">
                    Available for{" "}
                    {Math.floor(selectedProduct.remainingEditTime / 60000)}:
                    {((selectedProduct.remainingEditTime % 60000) / 1000)
                      .toFixed(0)
                      .padStart(2, "0")}{" "}
                    minutes
                  </span>
                </div>
              )} */}
              {/* <div className="w-fit h-fit flex items-center justify-center">
                {showRestockInput ? (
                  <>
                    <input
                      type="number"
                      value={restockQuantity}
                      onChange={(e) => setRestockQuantity(e.target.value)}
                      className="border border-gray-300 rounded-md px-2 py-1 w-16"
                    />
                    <button
                      className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:ring focus:ring-green-600 focus:outline-none"
                      onClick={handleRestockProduct}
                    >
                      {buttonLoading ? (
                        <RotatingLines width="20" strokeColor="white" />
                      ) : (
                        <FaBoxOpen />
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md shadow-sm hover:bg-yellow-700 focus:ring focus:ring-yellow-600 focus:outline-none h-8"
                    onClick={() => setShowRestockInput(true)}
                  >
                    <BsBox2Fill />
                  </button>
                )}
              </div> */}
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
        <ConfirmationDialog
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={confirmDeleteProduct}
          message="Are you sure you want to delete this product?"
        />
      )}
    </>
  );
};

export default VendorProducts;
