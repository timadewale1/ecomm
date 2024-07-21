import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/layout/Modal';
import ConfirmationDialog from '../../components/layout/ConfirmationDialog'; // Import your confirmation dialog component
import { FaTrashAlt, FaPlus, FaBoxOpen } from 'react-icons/fa'; // Import FaBoxOpen icon
import { RotatingLines } from 'react-loader-spinner';
import AddProduct from '../vendor/AddProducts';

const VendorProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isViewProductModalOpen, setIsViewProductModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false); // State for confirmation dialog
  const [showRestockInput, setShowRestockInput] = useState(false); // State to show restock input
  const [restockQuantity, setRestockQuantity] = useState(0); // State for restock quantity
  const [buttonLoading, setButtonLoading] = useState(false); // State for button loading
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
    setIsViewProductModalOpen(true);
  };

  const openAddProductModal = () => {
    setIsAddProductModalOpen(true);
  };

  const closeModals = () => {
    setIsViewProductModalOpen(false);
    setIsAddProductModalOpen(false);
    setSelectedProduct(null);
    setRestockQuantity(0); // Reset restock quantity
    setShowRestockInput(false); // Hide restock input
  };

  const confirmDeleteProduct = async () => {
    setButtonLoading(true);
    try {
      await deleteDoc(doc(db, 'vendors', vendorId, 'products', selectedProduct.id));
      toast.success('Product deleted successfully.');
      setProducts(products.filter((product) => product.id !== selectedProduct.id));
      closeModals();
    } catch (error) {
      console.error('Error deleting product: ', error);
      toast.error('Error deleting product: ' + error.message);
    } finally {
      setButtonLoading(false);
      setShowConfirmation(false); // Close confirmation dialog
    }
  };

  const handleDeleteProduct = () => {
    setShowConfirmation(true); // Show confirmation dialog before deleting
  };

  const handleRestockProduct = async () => {
    setButtonLoading(true);
    try {
      const productRef = doc(db, 'vendors', vendorId, 'products', selectedProduct.id);
      await updateDoc(productRef, {
        stockQuantity: selectedProduct.stockQuantity + parseInt(restockQuantity, 10),
      });
      toast.success('Product restocked successfully.');
      fetchVendorProducts(vendorId); // Refresh product list
      closeModals();
    } catch (error) {
      console.error('Error restocking product: ', error);
      toast.error('Error restocking product: ' + error.message);
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <div className="w-full mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-orange-500">Your Products</h2>
        <FaPlus
          className="h-5 w-5 text-green-700 cursor-pointer"
          onClick={openAddProductModal}
        />
      </div>
      {loading ? (
        <div className="flex items-center justify-center">
          <RotatingLines />
        </div>
      ) : products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="border border-gray-300 rounded-lg p-2 shadow-sm cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              {product.coverImageUrl && (
                <img
                  src={product.coverImageUrl}
                  alt={product.name}
                  className="h-32 w-full object-cover rounded-md"
                />
              )}
              <h3 className="text-xs font-bold text-gray-900 mt-2">{product.name}</h3>
              <div className="mt-2">
                {product.categories && (
                  <div className="flex space-x-2">
                    {product.categories.map((category, index) => (
                      <span
                        key={index}
                        className="bg-gray-200 px-2 py-1 text-sm text-gray-700 rounded-md"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && (
        <Modal isOpen={isViewProductModalOpen} onClose={closeModals}>
          <div className="p-4 space-y-4">
            <h2 className="text-2xl font-bold text-green-700">{selectedProduct.name}</h2>
            {selectedProduct.coverImageUrl && (
              <img
                src={selectedProduct.coverImageUrl}
                alt={selectedProduct.name}
                className="w-full h-64 object-cover rounded-md"
              />
            )}
            <p><strong>Description:</strong> {selectedProduct.description || 'None'}</p>
            <p><strong>Price:</strong> ${selectedProduct.price.toFixed(2)}</p>
            <p><strong>Stock Quantity:</strong> {selectedProduct.stockQuantity}</p>
            {selectedProduct.categories && (
              <div>
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
              <div className="grid grid-cols-2 gap-2">
                {selectedProduct.imageUrls.map((url, index) => (
                  <img key={index} src={url} alt={`Product ${index}`} className="h-16 w-full object-cover rounded-md" />
                ))}
              </div>
            )}
            <p className="text-green-700"><strong>Date Added:</strong> {new Date(selectedProduct.dateAdded).toLocaleDateString()}</p>
            <div className="flex items-center justify-end space-x-2 mt-4">
              <button
                className={`px-3 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 focus:ring focus:ring-red-600 focus:outline-none ${buttonLoading ? 'cursor-not-allowed' : ''}`}
                onClick={handleDeleteProduct}
                disabled={buttonLoading}
              >
                {buttonLoading ? (
                  <RotatingLines width="20" strokeColor="white" />
                ) : (
                  <FaTrashAlt />
                )}
              </button>
              {showRestockInput ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    className="w-20 p-2 border border-gray-300 rounded-md"
                    value={restockQuantity}
                    onChange={(e) => setRestockQuantity(e.target.value)}
                    placeholder="Qty"
                  />
                  <button
                    className={`px-3 py-2 bg-green-700 text-white rounded-md shadow-sm hover:bg-green-800 focus:ring focus:ring-green-700 focus:outline-none ${buttonLoading ? 'cursor-not-allowed' : ''}`}
                    onClick={handleRestockProduct}
                    disabled={buttonLoading}
                  >
                    {buttonLoading ? (
                      <RotatingLines width="20" strokeColor="white" />
                    ) : (
                      <FaBoxOpen />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  className={`px-3 py-2 bg-green-700 text-white rounded-md shadow-sm hover:bg-green-800 focus:ring focus:ring-green-700 focus:outline-none ${buttonLoading ? 'cursor-not-allowed' : ''}`}
                  onClick={() => setShowRestockInput(true)}
                  disabled={buttonLoading}
                >
                  {buttonLoading ? (
                    <RotatingLines width="20" strokeColor="white" />
                  ) : (
                    'Restock'
                  )}
                </button>
              )}
            </div>
          </div>
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

      <Modal isOpen={isAddProductModalOpen} onClose={closeModals}>
        <AddProduct onClose={closeModals} />
      </Modal>
    </div>
  );
};

export default VendorProducts;
