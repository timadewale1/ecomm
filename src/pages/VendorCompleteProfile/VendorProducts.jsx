import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/layout/Modal';
import { FaTrashAlt, FaEdit } from 'react-icons/fa';

const VendorProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setVendorId(user.uid);
        fetchVendorProducts(user.uid);
      } else {
        toast.error('Unauthorized access or no user is signed in.');
        setLoading(false);
        navigate('/login'); // Redirect to login if unauthorized
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  const fetchVendorProducts = async (uid) => {
    try {
      const vendorRef = collection(db, 'vendors', uid, 'products');
      const q = query(vendorRef, where('vendorId', '==', uid));
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products: ', error);
      toast.error('Error fetching products: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = async (productId) => {
    // Implement delete functionality here
    console.log(`Deleting product with id: ${productId}`);
  };

  const handleEditProduct = async (productId) => {
    // Implement edit functionality here
    console.log(`Editing product with id: ${productId}`);
  };

  return (
    <div className="w-full mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-green-700 mb-6">Your Products</h2>
      {loading ? (
        <div>Loading...</div>
      ) : products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product.id} className="border border-gray-300 rounded-lg p-4 shadow-sm cursor-pointer" onClick={() => handleProductClick(product)}>
              {product.coverImageUrl && (
                <img
                  src={product.coverImageUrl}
                  alt={product.name}
                  className="h-32 w-full object-cover rounded-md"
                />
              )}
              <h3 className="text-lg font-bold text-gray-900 mt-2">{product.name}</h3>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && (
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <div className="p-4">
            <h2 className="text-2xl font-bold text-green-700 mb-4">{selectedProduct.name}</h2>
            {selectedProduct.coverImageUrl && (
              <img
                src={selectedProduct.coverImageUrl}
                alt={selectedProduct.name}
                className="w-full h-64 object-cover rounded-md mb-4"
              />
            )}
            <p className="mb-4"><strong>Description:</strong> {selectedProduct.description}</p>
            <p className="mb-4"><strong>Price:</strong> ${selectedProduct.price.toFixed(2)}</p>
            <p className="mb-4"><strong>Stock Quantity:</strong> {selectedProduct.stockQuantity}</p>
            {selectedProduct.categories && (
              <div className="mb-4">
                <strong>Categories:</strong>
                {Array.isArray(selectedProduct.categories) ? (
                  <ul className="list-disc pl-5">
                    {selectedProduct.categories.map((category, index) => (
                      <li key={index}>{category}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No categories available</p>
                )}
              </div>
            )}
            {selectedProduct.imageUrls && selectedProduct.imageUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {selectedProduct.imageUrls.map((url, index) => (
                  <img key={index} src={url} alt={`Product ${index}`} className="h-16 w-full object-cover rounded-md" />
                ))}
              </div>
            )}
            <div className="flex items-center justify-end space-x-2">
              <button
                className="px-3 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 focus:ring focus:ring-red-600 focus:outline-none"
                onClick={() => handleDeleteProduct(selectedProduct.id)}
              >
                <FaTrashAlt />
              </button>
              <button
                className="px-3 py-2 bg-orange-600 text-white rounded-md shadow-sm hover:bg-orange-700 focus:ring focus:ring-orange-600 focus:outline-none"
                onClick={() => handleEditProduct(selectedProduct.id)}
              >
                <FaEdit />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default VendorProducts;
