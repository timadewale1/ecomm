import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDoc, arrayRemove, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/layout/Modal';
import ConfirmationDialog from '../../components/layout/ConfirmationDialog';
import { FaTrashAlt, FaPlus, FaBoxOpen, FaEdit } from 'react-icons/fa';
import { RotatingLines } from 'react-loader-spinner';
import AddProduct from '../vendor/AddProducts';
import { BsBox2Fill } from 'react-icons/bs';

const VendorProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isViewProductModalOpen, setIsViewProductModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showRestockInput, setShowRestockInput] = useState(false);
  const [restockQuantity, setRestockQuantity] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setVendorId(user.uid);
        console.log("Vendor ID set:", user.uid);
        fetchVendorProducts(user.uid);
      } else {
        toast.error('Unauthorized access or no user is signed in.');
        setLoading(false);
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  // Fetch products from the centralized 'products' collection
  const fetchVendorProducts = async (uid) => {
    try {
      // Fetch vendor document to get productIds array
      const vendorDocRef = doc(db, 'vendors', uid);
      const vendorDoc = await getDoc(vendorDocRef);
      
      if (!vendorDoc.exists()) {
        throw new Error("Vendor not found");
      }
      
      const vendorData = vendorDoc.data();
      const productIds = vendorData.productIds || [];
  
      if (productIds.length === 0) {
        toast.info('No products found.');
        setProducts([]);
        setLoading(false);
        return;
      }
  
      // Fetch products from the centralized 'products' collection using productIds array
      const productsCollectionRef = collection(db, 'products');
      const productsSnapshot = await Promise.all(
        productIds.map(async (productId) => {
          const productDoc = await getDoc(doc(productsCollectionRef, productId));
          return productDoc.exists() ? { id: productDoc.id, ...productDoc.data() } : null;
        })
      );
  
      const validProducts = productsSnapshot.filter((product) => product !== null);
      setProducts(validProducts);
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
    setRestockQuantity(0);
    setShowRestockInput(false);
  };

  const addActivityNote = async (note) => {
    try {
      const activityNotesRef = collection(db, 'vendors', vendorId, 'activityNotes');
      await addDoc(activityNotesRef, {
        note,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error adding activity note: ', error);
      toast.error('Error adding activity note: ' + error.message);
    }
  };

  const confirmDeleteProduct = async () => {
    setButtonLoading(true);
    try {
      const productId = selectedProduct.id;
      
      // Step 1: Delete the product from the centralized 'products' collection
      await deleteDoc(doc(db, 'products', productId));
  
      // Step 2: Remove the productId from the vendor's 'productIds' array
      const vendorDocRef = doc(db, 'vendors', vendorId);
      await updateDoc(vendorDocRef, {
        productIds: arrayRemove(productId), // Remove the product ID from the array
      });
  
      // Step 3: Log activity for product deletion
      await addActivityNote(`Deleted product: ${selectedProduct.name}`);
      
      // Update the products state
      setProducts(products.filter((product) => product.id !== selectedProduct.id));
      
      toast.success('Product deleted successfully.');
      closeModals();
    } catch (error) {
      console.error('Error deleting product: ', error);
      toast.error('Error deleting product: ' + error.message);
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
      const productRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(productRef, {
        stockQuantity: selectedProduct.stockQuantity + parseInt(restockQuantity, 10),
      });
      await addActivityNote(`Restocked ${selectedProduct.name}`);
      toast.success('Product restocked successfully.');
      fetchVendorProducts(vendorId);
      closeModals();
    } catch (error) {
      console.error('Error restocking product: ', error);
      toast.error('Error restocking product: ' + error.message);
    } finally {
      setButtonLoading(false);
    }
  };

  const handleEditProduct = async () => {
    // Logic to open the edit modal or handle product edit functionality
    console.log("Edit product:", selectedProduct);
    await addActivityNote(`Edited product: ${selectedProduct.name}`);
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
          <div className="pb-24 pt-10 space-y-4">
            <h2 className="text-2xl font-bold text-green-700">{selectedProduct.name}</h2>
            {selectedProduct.coverImageUrl && (
              <img
                src={selectedProduct.coverImageUrl}
                alt={selectedProduct.name}
                className="w-full h-64 object-cover rounded-md"
              />
            )}
            <p><strong>Description:</strong> {selectedProduct.description || 'N/A'}</p>
            <p><strong>Price:</strong> ${selectedProduct.price.toFixed(2)}</p>
            <p><strong>Stock Quantity:</strong> {selectedProduct.stockQuantity}</p>
            <p><strong>Categories:</strong> {selectedProduct.categories?.join(', ') || 'N/A'}</p>
            {selectedProduct.productImages && (
              <div className="flex space-x-2 overflow-x-scroll">
                {selectedProduct.productImages.map((url, index) => (
                  <img key={index} src={url} alt={`Product ${index + 1}`} className="w-full h-32 object-cover rounded-md" />
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between space-x-2">
              
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 focus:ring focus:ring-red-600 focus:outline-none"
                onClick={handleDeleteProduct}
              >
                <FaTrashAlt />
              </button>
              {selectedProduct.remainingEditTime > 0 && (
                <div className="flex items-center justify-end space-x-2 mt-4">
                  <button
                    className={`px-3 py-2 bg-blue-700 text-white rounded-md shadow-sm hover:bg-blue-800 focus:ring focus:ring-blue-700 focus:outline-none ${buttonLoading ? 'cursor-not-allowed' : ''}`}
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
                    Available for {Math.floor(selectedProduct.remainingEditTime / 60000)}:{(selectedProduct.remainingEditTime % 60000 / 1000).toFixed(0).padStart(2, '0')} minutes
                  </span>
                </div>
              )}
              <div className='w-fit h-fit flex items-center justify-center'>
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
                  <BsBox2Fill/>
                </button>
              )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {isAddProductModalOpen && (
        <Modal isOpen={isAddProductModalOpen} onClose={closeModals}>
          <AddProduct vendorId={vendorId} onClose={closeModals} onProductAdded={() => fetchVendorProducts(vendorId)} />
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
    </div>
  );
};

export default VendorProducts;
