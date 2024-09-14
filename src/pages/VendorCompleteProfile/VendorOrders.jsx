import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaRegClock, FaCheck, FaTimes } from 'react-icons/fa';
import Modal from '../../components/layout/Modal';
import { getDoc, doc, query, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';
import useAuth from '../../custom-hooks/useAuth';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const VendorOrders = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('Pending');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [loading, setLoading] = useState(true);

 // Fetch orders assigned to the vendor
useEffect(() => {
  const fetchOrders = async () => {
    if (currentUser) {
      try {
        const q = query(collection(db, 'orders'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.log('No orders found.');
        }

        const fetchedOrders = [];
        for (const orderDoc of querySnapshot.docs) {
          const orderData = orderDoc.data();

          // Filter out the products that belong to the current vendor
          const vendorProducts = Object.values(orderData.products || {}).filter(
            product => product.vendorId === currentUser.uid
          );

          // If the current vendor has products in the order, add the order to the list
          if (vendorProducts.length > 0) {
            const userDoc = await getDoc(doc(db, 'users', orderData.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              fetchedOrders.push({
                id: orderDoc.id,
                ...orderData,
                products: vendorProducts, // Only include the vendor's products
                user: {
                  displayName: userData.displayName,
                  email: userData.email,
                  phoneNumber: userData.phoneNumber,
                },
                progressStatus: orderData.progressStatus || 'Pending',
              });
            } else {
              fetchedOrders.push({
                id: orderDoc.id,
                ...orderData,
                products: vendorProducts, // Only include the vendor's products
                user: null
              });
            }
          }
        }

        console.log('Fetched orders:', fetchedOrders);
        setOrders(fetchedOrders);
      } catch (error) {
        console.error('Error fetching orders: ', error);
        toast.error('Error fetching orders. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  fetchOrders();
}, [currentUser]);


  // Filter orders by their progress status
  const filterOrders = (status) => {
    return orders.filter((order) => order.progressStatus === status);
  };

  // Update the progress of an order
  const updateOrderProgress = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      // Only updating progressStatus field
      await updateDoc(orderRef, { progressStatus: newStatus });
  
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, progressStatus: newStatus } : order
      ));
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status: ', error);
      toast.error('Error updating order status. Please try again.');
    }
  };
  

  // Handle decline with reason
  const handleDeclineOrder = async (orderId) => {
    if (!declineReason) {
      toast.error('Please provide a reason for declining the order.');
      return;
    }

    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { progressStatus: 'Declined', declineReason });

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, progressStatus: 'Declined', declineReason } : order
      ));
      toast.success('Order has been declined.');
      closeModal();
    } catch (error) {
      console.error('Error declining order: ', error);
      toast.error('Error declining order. Please try again.');
    }
  };

  // Render orders based on progress status
  const renderOrders = () => {
    const filteredOrders = filterOrders(activeTab);
    return (
      <ul className="space-y-2">
        {filteredOrders.map((order) => (
          <li
            key={order.id}
            className="p-4 bg-white rounded-lg shadow-md cursor-pointer hover:bg-gray-100 transition"
            onClick={() => openModal(order)}
          >
            {order.products.map((product, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-700">
                  {product.name} (Quantity: {product.quantity})
                </span>
                <span className={`text-gray-500 ${activeTab === 'Completed' ? 'text-green-500' : 'text-orange-500'}`}>
                  {order.progressStatus}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    );
  };

  // Open order details modal
  const openModal = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
    setDeclineReason('');
  };

  // Render modal content based on order
  const renderModalContent = () => {
    if (!selectedOrder) {
      return <p>No order details available.</p>;
    }

    const { id, user, products, progressStatus } = selectedOrder;

    return (
      <div className="space-y-4">
        <div className="text-lg font-bold">Ordered By: {user?.displayName || 'Unknown User'}</div>
        {user && (
          <>
            <div className="text-sm text-gray-700">Email: {user.email || 'Not Available'}</div>
            <div className="text-sm text-gray-700">Phone: {user.phoneNumber || 'Not Available'}</div>
          </>
        )}
        <div className={`text-sm ${progressStatus === 'Completed' ? 'text-green-500' : 'text-orange-500'}`}>
          Status: {progressStatus}
        </div>
        <div className="text-sm text-gray-500">Products:</div>
        <ul className="list-disc list-inside">
          {products.map((product, index) => (
            <li key={index} className="text-sm text-gray-700 flex items-center space-x-2">
              {product.selectedImageUrl && (
                <img src={product.selectedImageUrl} alt={product.name} className="w-16 h-16 object-cover rounded" />
              )}
              <span>{product.name} (Quantity: {product.quantity})</span>
            </li>
          ))}
        </ul>
        {progressStatus === 'Pending' ? (
          <div className="space-y-2">
            <button
              onClick={() => updateOrderProgress(id, 'In Progress')}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              Accept Order
            </button>
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Reason for decline"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="border p-2 rounded w-full"
              />
              <button
                onClick={() => handleDeclineOrder(id)}
                className="px-4 py-2 bg-red-500 text-white rounded ml-2"
              >
                Decline Order
              </button>
            </div>
          </div>
        ) : (
          <select
            value={progressStatus}
            onChange={(e) => updateOrderProgress(id, e.target.value)}
            className="p-2 border rounded"
          >
            <option value="In Progress">In Progress</option>
            <option value="Packaging">Packaging</option>
            <option value="Ready for Delivery">Ready for Delivery</option>
            <option value="Out for Delivery">Out for Delivery</option>
          </select>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold text-green-700 mb-4">Vendor Orders</h1>
      <div className="mb-4 text-lg font-bold text-gray-700">
        Total All-Time Completed Orders: {orders.filter((order) => order.progressStatus === 'Completed').length}
      </div>

      <div className="tabs flex space-x-1 mb-4 align-items-center justify-center">
        {['Pending', 'In Progress', 'Out for Delivery', 'Declined'].map((tab) => (
          <button
            key={tab}
            className={`px-2 py-1 text-sm md:text-sm rounded-lg flex items-center ${
              activeTab === tab ? 'bg-green-700 text-white' : 'bg-white text-gray-700'
            } shadow-md hover:bg-green-800 transition`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'Pending' && <FaRegClock className="mr-1" />}
            {tab === 'In Progress' && <FaCheck className="mr-1" />}
            {tab === 'Declined' && <FaTimes className="mr-1" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="orders-list space-y-4">
        {loading ? (
          <>
            <Skeleton count={2} height={60} className="mb-4" />
            <Skeleton count={2} height={60} className="mb-4" />
            <Skeleton count={2} height={60} className="mb-4" />
          </>
        ) : (
          renderOrders()
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {renderModalContent()}
      </Modal>
    </div>
  );
};

export default VendorOrders;
