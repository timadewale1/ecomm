import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, collection, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../firebase.config";
import { toast } from "react-toastify";
import { FaImage, FaMinusCircle } from "react-icons/fa";
import { RotatingLines } from "react-loader-spinner";

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
  const [category, setCategory] = useState([]);
  const [productType, setProductType] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const storage = getStorage();

  const handleFileChange = (e, setFile) => {
    const file = e.target.files[0];
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds the maximum limit of 3MB.");
      return;
    }
    setFile(file);
  };

  const handleMultipleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the maximum limit of 3MB.`);
        return false;
      }
      return true;
    });
    setProductImageFiles([...productImageFiles, ...validFiles]);
  };

  const handleRemoveImage = (index) => {
    setProductImageFiles(productImageFiles.filter((_, i) => i !== index));
  };

  const handleAddProduct = async () => {
    if (!user || user.uid !== vendorId) {
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
      !category.length ||
      !productType ||
      !size ||
      !color ||
      (productCondition === "defect" && !productDefectDescription)
    ) {
      toast.error("Please fill in all required fields!");
      return;
    }

    setIsLoading(true);

    try {
      let coverImageUrl = "";

      if (productCoverImageFile) {
        const storageRef = ref(storage, `${vendorId}/my-products/cover-${productCoverImageFile.name}`);
        await uploadBytes(storageRef, productCoverImageFile);
        coverImageUrl = await getDownloadURL(storageRef);
      }

      const productImageUrls = await Promise.all(
        productImageFiles.map(async (file) => {
          const storageRef = ref(storage, `${vendorId}/my-products/${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        })
      );

      const product = {
        name: productName.toUpperCase(),
        description: productDescription.charAt(0).toUpperCase() + productDescription.slice(1).toLowerCase(),
        price: parseFloat(productPrice),
        coverImageUrl: coverImageUrl,
        imageUrls: productImageUrls,
        vendorId: user.uid,
        stockQuantity: parseInt(stockQuantity, 10),
        condition: productCondition === "defect"
          ? `Defect: ${productDefectDescription.charAt(0).toUpperCase() + productDefectDescription.slice(1).toLowerCase()}`
          : productCondition.charAt(0).toUpperCase() + productCondition.slice(1).toLowerCase(),
        category: category.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()),
        productType: productType.charAt(0).toUpperCase() + productType.slice(1).toLowerCase(),
        size: size.charAt(0).toUpperCase() + size.slice(1).toLowerCase(),
        color: color.charAt(0).toUpperCase() + color.slice(1).toLowerCase(),
      };

      const vendorRef = doc(db, "vendors", vendorId);
      const productsCollectionRef = collection(vendorRef, "products");
      const newProductRef = doc(productsCollectionRef);

      await setDoc(newProductRef, product);

      toast.success("Product added successfully");
      // Clear form
      setProductName("");
      setProductDescription("");
      setProductPrice("");
      setProductCoverImageFile(null);
      setProductImageFiles([]);
      setStockQuantity("");
      setProductCondition("");
      setProductDefectDescription("");
      setCategory([]);
      setProductType("");
      setSize("");
      setColor("");
      closeModal();
    } catch (error) {
      console.error("Error adding product: ", error);
      toast.error("Error adding product: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setCategory((prevCategories) =>
      prevCategories.includes(value)
        ? prevCategories.filter((category) => category !== value)
        : [...prevCategories, value]
    );
  };

  const getSizeOptions = () => {
    switch (productType) {
      case "cloth":
        return ["XS", "S", "M", "L", "XL", "XXL", "in all sizes"];
      case "dress":

        return [
          "32",
          "34",
          "36",
          "38",
          "40",
          "42",
          "44",
          "all sizes",
        ];

      case "jewelry":
        return ["5", "6", "7", "8", "9", "10", "all sizes"];
      case "footwear":

        return [
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
          " all sizes",
        ];

      default:
        return [];
    }
  };

  const highlightField = (field) => {
    return field ? "" : "border-red-500";
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-green-700 mb-6 font-ubuntu">Add Product</h2>
      <div className="mb-4">
        <label className="block font-ubuntu text-sm font-medium text-gray-700">Product Name</label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value.toUpperCase())}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(productName)}`}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">Category</label>
        <div className={`flex space-x-2 border ${highlightField(category.length)}`}>
          {["Men", "Women", "Kids"].map((cat) => (
            <div key={cat}>
              <input
                type="checkbox"
                id={cat}
                value={cat}
                checked={category.includes(cat)}
                onChange={handleCategoryChange}
                className="mr-1"
              />
              <label htmlFor={cat} className="text-sm text-gray-700">{cat}</label>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">Product Type</label>
        <select
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(productType)}`}
          required
        >
          <option value="">Select Product Type</option>
          <option value="cloth">Cloth</option>
          <option value="dress">Dress</option>
          <option value="jewelry">Jewelry</option>
          <option value="footwear">Footwear</option>
        </select>
      </div>
      {productType && (
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-ubuntu font-medium">Size</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(size)}`}
            required
          >
            <option value="">Select Size</option>
            {getSizeOptions().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">Color</label>
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(color)}`}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">Product Description</label>
        <textarea
          value={productDescription}
          onChange={(e) =>
            setProductDescription(
              e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1).toLowerCase()
            )
          }
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(productDescription)}`}
          required
        ></textarea>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">Price</label>
        <input
          type="number"
          value={productPrice}
          onChange={(e) => setProductPrice(e.target.value)}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(productPrice)}`}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">Cover Image</label>
        <input
          type="file"
          onChange={(e) => handleFileChange(e, setProductCoverImageFile)}
          accept="image/*"
          className={`mt-1 block w-full ${highlightField(productCoverImageFile)}`}
          required
        />
        {productCoverImageFile && (
          <div className="mt-2 flex items-center space-x-2">
            <img
              src={URL.createObjectURL(productCoverImageFile)}
              alt="Cover"
              className="w-16 h-16 object-cover rounded"
            />
            <FaMinusCircle
              className="text-red-500 cursor-pointer"
              onClick={() => setProductCoverImageFile(null)}
            />
          </div>
        )}
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">Product Images</label>
        <input
          type="file"
          onChange={handleMultipleFileChange}
          accept="image/*"
          multiple
          className="mt-1 block w-full"
        />
        <div className="mt-2 flex flex-wrap space-x-2">
          {productImageFiles.map((file, index) => (
            <div key={index} className="relative">
              <img
                src={URL.createObjectURL(file)}
                alt={`Product ${index + 1}`}
                className="w-16 h-16 object-cover rounded"
              />
              <FaMinusCircle
                className="text-red-500 cursor-pointer absolute top-0 right-0"
                onClick={() => handleRemoveImage(index)}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">Stock Quantity</label>
        <input
          type="number"
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(stockQuantity)}`}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-ubuntu font-medium">Product Condition</label>
        <select
          value={productCondition}
          onChange={(e) => setProductCondition(e.target.value)}
          className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(productCondition)}`}
          required
        >
          <option value="">Select Condition</option>
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="defect">Defect</option>
        </select>
      </div>
      {productCondition === "defect" && (
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-ubuntu font-medium">Defect Description</label>
          <textarea
            value={productDefectDescription}
            onChange={(e) =>
              setProductDefectDescription(
                e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1).toLowerCase()
              )
            }
            className={`mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none ${highlightField(productDefectDescription)}`}
            required
          ></textarea>
        </div>
      )}
      <div className="flex justify-end">
        <button
          onClick={handleAddProduct}
          disabled={isLoading}
          className="px-6 py-2 bg-green-700 text-white rounded-md shadow-sm hover:bg-green-800 transition-colors duration-300 font-ubuntu"
        >
          {isLoading ? (
            <RotatingLines
              width="30"
              strokeColor="#fff"
              strokeWidth="5"
              animationDuration="0.75"
              visible={true}
            />
          ) : (
            "Add Product"
          )}
        </button>
      </div>
    </div>
  );
};

export default AddProduct;
