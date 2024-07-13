/* eslint-disable jsx-a11y/img-redundant-alt */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, collection, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../firebase.config';
import { toast } from 'react-toastify';
import { FaImage, FaMinusCircle } from 'react-icons/fa';

const AddProduct = ({vendorId}) => {
  
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCoverImageFile, setProductCoverImageFile] = useState(null);
  const [productImageFiles, setProductImageFiles] = useState([]);
  const [stockQuantity, setStockQuantity] = useState('');
  const [productDefaults, setProductDefaults] = useState(false);
  const [productDefaultsDescription, setProductDefaultsDescription] = useState('');

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

  const handleAddProduct = async () => {
    if (!user || user.uid !== vendorId) {
      console.log('Unauthorized access or no user is signed in.');
      toast.error('Unauthorized access or no user is signed in.');
      return;
    }

    let coverImageUrl = '';

    if (productCoverImageFile) {
      const storageRef = ref(storage, `${vendorId}/my-products/cover-${productCoverImageFile.name}`);
      await uploadBytes(storageRef, productCoverImageFile);
      coverImageUrl = await getDownloadURL(storageRef);
    }

    const productImageUrls = await Promise.all(productImageFiles.map(async (file) => {
      const storageRef = ref(storage, `${vendorId}/my-products/${file.name}`);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    }));

    const product = {
      name: productName,
      description: productDescription,
      price: parseFloat(productPrice),
      coverImageUrl: coverImageUrl,
      imageUrls: productImageUrls,
      vendorId: user.uid,
      stockQuantity: parseInt(stockQuantity, 10),
      defaults: productDefaults ? productDefaultsDescription : '',
    };

    try {
      const vendorRef = doc(db, 'vendors', vendorId);
      const productsCollectionRef = collection(vendorRef, 'products');
      const newProductRef = doc(productsCollectionRef);

      await setDoc(newProductRef, product);

      console.log('Product added successfully');
      toast.success('Product added successfully');
      // Clear form
      setProductName('');
      setProductDescription('');
      setProductPrice('');
      setProductCoverImageFile(null);
      setProductImageFiles([]);
      setStockQuantity('');
      setProductDefaults(false);
      setProductDefaultsDescription('');
    } catch (error) {
      console.error('Error adding product: ', error);
      toast.error('Error adding product: ' + error.message);
    }
  };

  return (
    <div className="w-full mx-auto p-6 bg-white rounded-lg shadow-md mb-20">
      <h2 className="text-2xl font-bold text-green-700 mb-6">Add Product</h2>
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
            onClick={() => document.getElementById('coverFileInput').click()}
          >
            <FaImage className="h-5 w-5" />
          </button>
          <input
            id="coverFileInput"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setProductCoverImageFile)}
            className="hidden"
          />
          {productCoverImageFile && (
            <div className="mt-4">
              <img
                src={URL.createObjectURL(productCoverImageFile)}
                alt="Cover"
                className="w-full h-64 rounded-md object-cover"
              />
            </div>
          )}
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700">Product Images</label>
        <div className="flex flex-col items-center">
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-800 focus:ring focus:ring-green-700 focus:outline-none"
            onClick={() => document.getElementById('multipleFileInput').click()}
          >
            <FaImage className="h-5 w-5" />
          </button>
          <input
            id="multipleFileInput"
            type="file"
            accept="image/*"
            multiple
            onChange={handleMultipleFileChange}
            className="hidden"
          />
          <div className="flex flex-row overflow-x-auto mt-4">
            {productImageFiles.map((file, index) => (
              <div key={index} className="relative mr-4 mb-4">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Product Image ${index + 1}`}
                  className="w-20 h-20 rounded-md object-cover"
                />
                <button
                  type="button"
                  className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-600 text-white rounded-full p-1"
                  onClick={() => handleRemoveImage(index)}
                >
                  <FaMinusCircle className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700">Does this product have any defaults?</label>
        <div className="mt-1 flex items-center">
          <input
            type="radio"
            name="defaults"
            checked={productDefaults === true}
            onChange={() => setProductDefaults(true)}
            className="form-radio h-4 w-4 text-green-700"
          />
          <span className="ml-2">Yes</span>
          <input
            type="radio"
            name="defaults"
            checked={productDefaults === false}
            onChange={() => setProductDefaults(false)}
            className="form-radio h-4 w-4 text-green-700 ml-4"
          />
          <span className="ml-2">No</span>
        </div>
        {productDefaults && (
          <input
            type="text"
            value={productDefaultsDescription}
            onChange={(e) => setProductDefaultsDescription(e.target.value)}
            maxLength="30"
            className="mt-2 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-700 focus:outline-none"
            placeholder="Enter a short description of the defaults"
          />
        )}
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
      <button
        type="button"
        onClick={handleAddProduct}
        className="w-full px-4 py-2 bg-orange-600 text-white rounded-md shadow-sm hover:bg-orange-700 focus:ring focus:ring-orange-600 focus:outline-none"
      >
        Add Product
      </button>
    </div>
  );
};

export default AddProduct;
