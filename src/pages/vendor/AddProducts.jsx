import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, collection, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../firebase.config";
import { toast } from "react-toastify";
import { FaImage, FaMinusCircle } from "react-icons/fa";
import { RotatingLines } from "react-loader-spinner";

const AddProduct = ({ vendorId }) => {
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCoverImageFile, setProductCoverImageFile] = useState(null);
  const [productImageFiles, setProductImageFiles] = useState([]);
  const [stockQuantity, setStockQuantity] = useState("");
  const [productDefaults, setProductDefaults] = useState(false);
  const [productDefaultsDescription, setProductDefaultsDescription] =
    useState("");
  const [loading, setLoading] = useState(false);

  // State for categories
  const [category1, setCategory1] = useState("");
  const [category2, setCategory2] = useState("");
  const [category3, setCategory3] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);

  const auth = getAuth();
  const user = auth.currentUser;
  const storage = getStorage();

  const handleFileChange = (e, setFile) => {
    setFile(e.target.files[0]);
  };

  const handleMultipleFileChange = (e) => {
    setProductImageFiles([...productImageFiles, ...e.target.files]);
  };

  const handleRemoveImage = (index) => {
    setProductImageFiles(productImageFiles.filter((_, i) => i !== index));
  };

  const handleAddCategory = () => {
    const newCategory = `${category1} - ${category2} - ${category3}`;
    setSelectedCategories([...selectedCategories, newCategory]);
  };

  const handleRemoveCategory = (index) => {
    setSelectedCategories(selectedCategories.filter((_, i) => i !== index));
  };

  const handleAddProduct = async () => {
    setLoading(true);
    if (!user || user.uid !== vendorId) {
      console.log("Unauthorized access or no user is signed in.");
      toast.error("Unauthorized access or no user is signed in.");
      return;
    }

    let coverImageUrl = "";

    if (productCoverImageFile) {
      const storageRef = ref(
        storage,
        `${vendorId}/my-products/cover-${productCoverImageFile.name}`
      );
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
      name: productName,
      description: productDescription,
      price: parseFloat(productPrice),
      coverImageUrl: coverImageUrl,
      imageUrls: productImageUrls,
      vendorId: user.uid,
      stockQuantity: parseInt(stockQuantity, 10),
      defaults: productDefaults ? productDefaultsDescription : "",
      categories: selectedCategories,
    };

    try {
      const vendorRef = doc(db, "vendors", vendorId);
      const productsCollectionRef = collection(vendorRef, "products");
      const newProductRef = doc(productsCollectionRef);

      await setDoc(newProductRef, product);

      console.log("Product added successfully");
      toast.success("Product added successfully");
      // Clear form
      setProductName("");
      setProductDescription("");
      setProductPrice("");
      setProductCoverImageFile(null);
      setProductImageFiles([]);
      setStockQuantity("");
      setProductDefaults(false);
      setProductDefaultsDescription("");
      setCategory1("");
      setCategory2("");
      setCategory3("");
      setSelectedCategories([]);
    } catch (error) {
      console.error("Error adding product: ", error);
      toast.error("Error adding product: " + error.message);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="w-full mx-2 p-6 bg-white rounded-lg shadow-md">
        {!loading ? (
          <>
            {" "}
            <h2 className="text-2xl font-bold text-green-700 mb-6">
              Add Product
            </h2>
            <div className="mb-4">
              <label className="block text-gray-700">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Category</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={category1}
                  onChange={(e) => setCategory1(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none"
                >
                  <option value="" disabled>
                    Select Condition
                  </option>
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                  <option value="Restored">Restored</option>
                </select>
                <select
                  value={category2}
                  onChange={(e) => setCategory2(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none"
                >
                  <option value="" disabled>
                    Select Style
                  </option>
                  <option value="Traditional">Traditional</option>
                  <option value="Casual">Casual</option>
                  <option value="Vintage">Vintage</option>
                  <option value="Formal">Formal</option>
                </select>
                <select
                  value={category3}
                  onChange={(e) => setCategory3(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none"
                >
                  <option value="" disabled>
                    Select Target Group
                  </option>
                  <option value="Mens">Mens</option>
                  <option value="Womens">Womens</option>
                  <option value="Kids">Kids</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddCategory}
                className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-md shadow-sm hover:bg-orange-700 focus:ring focus:ring-orange-600 focus:outline-none"
              >
                Add Category
              </button>
              <div className="mt-4">
                {selectedCategories.map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-100 p-2 rounded-md mb-2"
                  >
                    <span>{category}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(index)}
                      className="text-red-600 hover:text-red-800 focus:outline-none"
                    >
                      <FaMinusCircle />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Product Description</label>
              <input
                type="text"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Product Price</label>
              <input
                type="number"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Product Cover Image</label>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-800 focus:ring focus:ring-green-700 focus:outline-none"
                  onClick={() =>
                    document.getElementById("coverFileInput").click()
                  }
                >
                  <FaImage className="h-5 w-5" />
                </button>
                <input
                  id="coverFileInput"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleFileChange(e, setProductCoverImageFile)
                  }
                  className="hidden"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Product Images</label>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-800 focus:ring focus:ring-green-700 focus:outline-none"
                  onClick={() => document.getElementById("fileInput").click()}
                >
                  <FaImage className="h-5 w-5" />
                </button>
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleMultipleFileChange}
                  className="hidden"
                />
                <div className="flex overflow-auto mt-4">
                  {productImageFiles.map((file, index) => (
                    <div key={index} className="relative m-2">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Product ${index}`}
                        className="h-24 w-24 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-0 right-0 text-red-600 hover:text-red-800 focus:outline-none"
                      >
                        <FaMinusCircle />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Stock Quantity</label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Product Defaults</label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={productDefaults}
                  onChange={(e) => setProductDefaults(e.target.checked)}
                  className="h-4 w-4 text-green-700 focus:ring focus:ring-green-700 focus:outline-none"
                />
                <span className="ml-2 text-gray-700">
                  Include Defaults Description
                </span>
              </div>
              {productDefaults && (
                <textarea
                  value={productDefaultsDescription}
                  onChange={(e) =>
                    setProductDefaultsDescription(e.target.value)
                  }
                  className="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none"
                />
              )}
            </div>
            <button
              type="button"
              onClick={handleAddProduct}
              className="px-4 py-2 bg-green-700 text-white rounded-md shadow-sm hover:bg-green-800 focus:ring focus:ring-green-700 focus:outline-none"
            >
              Add Product
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <RotatingLines />
          </div>
        )}
      </div>
    </>
  );
};

export default AddProduct;
