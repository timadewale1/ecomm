import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, collection, setDoc, addDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../firebase.config";
import { toast } from "react-toastify";
import { FaImage, FaMinusCircle } from "react-icons/fa";
import { RotatingLines } from "react-loader-spinner";
import axios from "axios";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import { GiRegeneration } from "react-icons/gi";
import notifyFollowers from "../../services/notifyfollowers";

const animatedComponents = makeAnimated();
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

const AddProduct = ({ vendorId, closeModal }) => {
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCoverImageFile, setProductCoverImageFile] = useState(null);
  const [productImageFiles, setProductImageFiles] = useState([]);
  const [stockQuantity, setStockQuantity] = useState("");
  const [productCondition, setProductCondition] = useState("");
  const [productDefectDescription, setProductDefectDescription] = useState("");
  const [category, setCategory] = useState("");
  const [productType, setProductType] = useState("");
  const [size, setSize] = useState([]);
  const [color, setColor] = useState("");
  const [vendorName, setVendorName] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const storage = getStorage();
  useEffect(() => {
    const fetchVendorName = async () => {
      if (currentUser) {
        const vendorDocRef = doc(db, "vendors", vendorId);
        const vendorDoc = await getDoc(vendorDocRef);

        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          setVendorName(vendorData.shopName || "Unknown Vendor");
          console.log("Vendor Name:", vendorData.shopName);
        } else {
          setVendorName("Unknown Vendor");
        }
      }
    };

    fetchVendorName();
  }, [currentUser, vendorId]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        toast.error("No user is signed in.");
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (productName && category && productType && size.length && color) {
      generateDescription();
    }
  }, [productName, category, productType, size, color]);

  const handleFileChange = async (e, setFile) => {
    const file = e.target.files[0];
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds the maximum limit of 3MB.");
      return;
    }
    setIsUploadingImage(true);
    try {
      setFile(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleMultipleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the maximum limit of 3MB.`);
        return false;
      }
      return true;
    });
    setIsUploadingImage(true);
    try {
      setProductImageFiles([...productImageFiles, ...validFiles]);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (index) => {
    setProductImageFiles(productImageFiles.filter((_, i) => i !== index));
  };

  const logActivity = async (note) => {
    const activityRef = collection(db, "vendors", vendorId, "activityNotes");
    const activityNote = {
      timestamp: new Date(),
      note: note,
    };

    try {
      await addDoc(activityRef, activityNote);
    } catch (error) {
      console.error("Error logging activity: ", error);
    }
  };

  const handleAddProduct = async () => {
    if (!currentUser || currentUser.uid !== vendorId) {
      toast.error("Unauthorized access or no user is signed in.");
      return;
    }

    // Validate required fields
    if (
      !productName ||
      !productPrice ||
      !productCoverImageFile ||
      !stockQuantity ||
      !productCondition ||
      !category ||
      !productType ||
      !size.length ||
      !color ||
      (productCondition === "defect" && !productDefectDescription)
    ) {
      toast.error("Please fill in all required fields!");
      return;
    }

    setIsLoading(true);

    try {
      let coverImageUrl = "";

      // Upload cover image
      if (productCoverImageFile) {
        const storageRef = ref(
          storage,
          `${vendorId}/products/cover-${productCoverImageFile.name}`
        );
        await uploadBytes(storageRef, productCoverImageFile);
        coverImageUrl = await getDownloadURL(storageRef);
      }

      // Upload additional product images
      const productImageUrls = await Promise.all(
        productImageFiles.map(async (file) => {
          const storageRef = ref(storage, `${vendorId}/products/${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        })
      );

      // Create the product object
      const product = {
        name: productName.toUpperCase(),
        description:
          productDescription.charAt(0).toUpperCase() +
          productDescription.slice(1).toLowerCase(),
        price: parseFloat(productPrice),
        coverImageUrl: coverImageUrl,
        imageUrls: productImageUrls,
        vendorId: currentUser.uid,
        vendorName: vendorName, // Ensure vendorName is part of the product document
        stockQuantity: parseInt(stockQuantity, 10),
        condition:
          productCondition === "defect"
            ? `Defect: ${
                productDefectDescription.charAt(0).toUpperCase() +
                productDefectDescription.slice(1).toLowerCase()
              }`
            : productCondition.charAt(0).toUpperCase() +
              productCondition.slice(1).toLowerCase(),
        category:
          category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
        productType:
          productType.charAt(0).toUpperCase() +
          productType.slice(1).toLowerCase(),
        size: size.map((s) => s.value).join(", "),
        color: color.charAt(0).toUpperCase() + color.slice(1).toLowerCase(),
      };

      // Add the product to the centralized 'products' collection
      const productsCollectionRef = collection(db, "products");
      const newProductRef = doc(productsCollectionRef); // Generate new product document reference
      await setDoc(newProductRef, product);

      // Log activity in the vendor's activityNotes collection
      await logActivity(`Added ${productName} to your store`);

      // Notify followers after product has been successfully added
      await notifyFollowers(vendorId, {
        name: productName,
        shopName: vendorName, // Use vendorName here
        id: newProductRef.id,
        coverImageUrl: coverImageUrl, // Pass the cover image URL here
      });

      // Show success message and reset form
      toast.success("Product added successfully");
      setProductName("");
      setProductDescription("");
      setProductPrice("");
      setProductCoverImageFile(null);
      setProductImageFiles([]);
      setStockQuantity("");
      setProductCondition("");
      setProductDefectDescription("");
      setCategory("");
      setProductType("");
      setSize([]);
      setColor("");
      closeModal(); // Close the modal after successful product addition
    } catch (error) {
      console.error("Error adding product: ", error);
      toast.error("Error adding product: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDescription = async () => {
    setIsGeneratingDescription(true);
    try {
      const response = await axios.post(
        "https://mythrift.fly.dev/api/v1/description",
        {
          name: productName,
          category,
          productType,
          size: size.map((s) => s.value).join(", "),
          color,
        }
      );
      setProductDescription(response.data.description);
    } catch (error) {
      console.error("Error generating description:", error);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
  };

  const handleSizeChange = (selectedOptions) => {
    setSize(selectedOptions);
  };

  const getSizeOptions = () => {
    const options = {
      cloth: ["XS", "S", "M", "L", "XL", "XXL", "All sizes"],
      dress: ["32", "34", "36", "38", "40", "42", "44", "All sizes"],
      jewelry: ["5", "6", "7", "8", "9", "10", "All sizes"],
      footwear: [
        "35",
        "36",
        "37",
        "38",
        "39",
        "40",
        "41",
        "42",
        "43",
        "44",
        "All sizes",
      ],
      pants: ["28", "30", "32", "34", "36", "38", "40", "42", "All sizes"],
      shirts: ["14", "15", "16", "17", "18", "All sizes"],
      suits: ["38", "40", "42", "44", "46", "All sizes"],
      hats: ["S", "M", "L", "XL", "All sizes"],
      belts: ["S", "M", "L", "XL", "All sizes"],
    };

    return options[productType] || [];
  };

  const highlightField = (field) => {
    return field ? "" : "border-red-500";
  };

  return (
    <div className="relative">
      {isUploadingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <RotatingLines
            strokeColor="white"
            strokeWidth="5"
            animationDuration="0.75"
            width="96"
            visible={true}
          />
        </div>
      )}
      <h2 className="text-2xl font-bold text-green-700 mb-6 font-ubuntu">
        Add Product
      </h2>
      <div className="mb-4">
        <label className="block font-ubuntu text-sm font-medium text-gray-700">
          Product Name
        </label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value.toUpperCase())}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(
            productName
          )}`}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">
          Category
        </label>
        <select
          value={category}
          onChange={handleCategoryChange}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(
            category
          )}`}
          required
        >
          <option value="">Select Category</option>
          <option value="men">Men</option>
          <option value="women">Women</option>
          <option value="kids">Kids</option>
          <option value="all">All</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">
          Product Type
        </label>
        <select
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(
            productType
          )}`}
          required
        >
          <option value="">Select Product Type</option>
          <option value="cloth">Cloth</option>
          <option value="dress">Dress</option>
          <option value="jewelry">Jewelry</option>
          <option value="footwear">Footwear</option>
          <option value="pants">Pants</option>
          <option value="shirts">Shirts</option>
          <option value="suits">Suits</option>
          <option value="hats">Hats</option>
          <option value="belts">Belts</option>
        </select>
      </div>
      {productType && (
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-ubuntu font-medium">
            Size
          </label>
          <Select
            isMulti
            options={getSizeOptions().map((size) => ({
              value: size,
              label: size,
            }))}
            components={animatedComponents}
            onChange={handleSizeChange}
            className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(
              size.length
            )}`}
            required
          />
        </div>
      )}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">
          Color
        </label>
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(
            color
          )}`}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-ubuntu text-sm font-medium">
          Product Description
        </label>
        <textarea
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none h-24 resize-none flex-grow"
        />
        <button
          type="button"
          onClick={generateDescription}
          className="mt-2 px-2 py-1 bg-customOrange text-white rounded-md shadow-sm hover:bg-customOrange focus:ring focus:ring-customOrange focus:outline-none flex items-center justify-end"
          disabled={isGeneratingDescription}
        >
          {isGeneratingDescription ? (
            <RotatingLines
              strokeColor="white"
              strokeWidth="5"
              animationDuration="0.75"
              width="24"
              visible={true}
            />
          ) : (
            <GiRegeneration />
          )}
        </button>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-ubuntu text-xs font-medium">
          Product Price
        </label>
        <input
          type="number"
          value={productPrice}
          onChange={(e) => setProductPrice(e.target.value)}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(
            productPrice
          )}`}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-black font-ubuntu text-sm font-medium">
          Product Cover Image
        </label>
        <div className="flex flex-col items-center">
          <div
            className={`w-full h-64 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer relative ${highlightField(
              productCoverImageFile
            )}`}
            onClick={() => document.getElementById("coverFileInput").click()}
          >
            {productCoverImageFile ? (
              <>
                <img
                  src={URL.createObjectURL(productCoverImageFile)}
                  alt="Cover"
                  className="w-full h-full rounded-md object-cover"
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProductCoverImageFile(null);
                  }}
                >
                  <FaMinusCircle className="h-4 w-4" />
                </button>
              </>
            ) : (
              <FaImage className="h-16 w-16 text-gray-400" />
            )}
          </div>
          <input
            id="coverFileInput"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setProductCoverImageFile)}
            className="hidden"
            required
          />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">
          Product Images
        </label>
        <p className="text-xs text-gray-400">
          Provide additional images to give buyers a better view of the product.
          If you have variations of the same product at the same price but with
          different designs, add those images here.{" "}
        </p>
        <div className="flex flex-col mt-1 items-center">
          <div className="grid grid-cols-2 gap-4">
            {productImageFiles.map((file, index) => (
              <div
                key={index}
                className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer relative"
                onClick={() =>
                  document.getElementById(`productFileInput-${index}`).click()
                }
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Product ${index + 1}`}
                  className="w-full h-full rounded-md object-cover"
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                >
                  <FaMinusCircle className="h-4 w-4" />
                </button>
                <input
                  id={`productFileInput-${index}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleMultipleFileChange(e)}
                  className="hidden"
                />
              </div>
            ))}
            {productImageFiles.length < 6 && (
              <div
                className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer"
                onClick={() =>
                  document
                    .getElementById(
                      `productFileInput-${productImageFiles.length}`
                    )
                    .click()
                }
              >
                <FaImage className="h-8 w-8 text-gray-400" />
                <input
                  id={`productFileInput-${productImageFiles.length}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleMultipleFileChange(e)}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-xs font-ubuntu font-medium">
          Product Condition
        </label>
        <p className="text-xs font-light font-ubuntu">
          This does not affect the sales of your product. Integrity is important
          to our brand.
        </p>
        <select
          value={productCondition}
          onChange={(e) => setProductCondition(e.target.value)}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(
            productCondition
          )}`}
          required
        >
          <option value="">Select Condition</option>
          <option value="brand new">Brand New</option>
          <option value="thrift">Thrift</option>
          <option value="second hand">Second Hand</option>
          <option value="defect">Defect</option>
        </select>
        {productCondition === "defect" && (
          <div className="mt-4">
            <label className="block text-gray-700">Defect Description</label>
            <input
              type="text"
              value={productDefectDescription}
              onChange={(e) => setProductDefectDescription(e.target.value)}
              className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(
                productDefectDescription
              )}`}
              required
            />
          </div>
        )}
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-ubuntu text-xs font-medium">
          Stock Quantity
        </label>
        <input
          type="number"
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(
            stockQuantity
          )}`}
          required
        />
      </div>
      <div className="text-sm font-poppins">
        <button
          type="button"
          onClick={handleAddProduct}
          className="w-full px-4 py-2 bg-orange-600 text-white rounded-md shadow-sm hover:bg-orange-700 focus:ring focus:ring-orange-600 focus:outline-none"
          disabled={isLoading} // Disable button when loading
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <RotatingLines
                strokeColor="white"
                strokeWidth="5"
                animationDuration="0.75"
                width="24"
                visible={true}
              />
            </div>
          ) : (
            "Add Product"
          )}
        </button>
      </div>
    </div>
  );
};

export default AddProduct;
