import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaRegClock, FaCheck, FaTimes } from 'react-icons/fa';
import Modal from '../../components/layout/Modal';

const VendorOrders = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Fetch orders from your database here
    const fetchOrders = async () => {
      // Replace with actual API call
      const fetchedOrders = [
        { id: 1, status: 'pending', timestamp: new Date(), customerName: 'John Doe', products: [{ name: 'Product 1', quantity: 2 }] },
        { id: 2, status: 'completed', timestamp: new Date(), deliveryTime: new Date(), customerName: 'Jane Smith', products: [{ name: 'Product 2', quantity: 1 }] },
        { id: 3, status: 'canceled', timestamp: new Date(), cancelTime: new Date(), customerName: 'Bob Johnson', products: [{ name: 'Product 3', quantity: 3 }] },
      ];
      setOrders(fetchedOrders);
    };

    fetchOrders();
  }, []);

  const filterOrders = (status, timePeriod) => {
    const now = new Date();
    return orders.filter(order => {
      if (order.status !== status) return false;

      switch (timePeriod) {
        case 'today':
          return order.timestamp.toDateString() === now.toDateString();
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          return order.timestamp.toDateString() === yesterday.toDateString();
        case 'thisWeek':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          return order.timestamp >= startOfWeek;
        case 'thisMonth':
          return order.timestamp.getMonth() === now.getMonth() &&
                 order.timestamp.getFullYear() === now.getFullYear();
        case 'lastMonth':
          const lastMonth = new Date(now);
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return order.timestamp.getMonth() === lastMonth.getMonth() &&
                 order.timestamp.getFullYear() === lastMonth.getFullYear();
        default:
          return true;
      }
    });
  };

  const renderOrders = (status) => {
    const timePeriods = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'lastMonth'];
    return (
      <>
        {timePeriods.map(timePeriod => (
          <div key={timePeriod}>
            <h3 className="text-lg font-semibold text-gray-700 my-2">{timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}</h3>
            <ul className="space-y-2">
              {filterOrders(status, timePeriod).map(order => (
                <li
                  key={order.id}
                  className="p-4 bg-white rounded-lg shadow-md cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => openModal(order)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">{order.customerName}</span>
                    <span className={`text-gray-500 ${status === 'completed' ? 'text-green-500' : status === 'pending' ? 'text-orange-500' : 'text-red-500'}`}>
                      {order.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </>
    );
  };

  const openModal = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
  };

  const renderModalContent = () => {
    if (!selectedOrder) return null;

    const { customerName, timestamp, deliveryTime, cancelTime, products, status } = selectedOrder;

    return (
      <div className="space-y-4">
        <div className="text-lg font-bold">{customerName}</div>
        <div className={`text-sm ${status === 'completed' ? 'text-green-500' : status === 'pending' ? 'text-orange-500' : 'text-red-500'}`}>
          Order Time: {timestamp.toLocaleString()}
        </div>
        {status === 'completed' && <div className="text-sm text-green-500">Delivery Time: {deliveryTime.toLocaleString()}</div>}
        {status === 'canceled' && <div className="text-sm text-red-500">Cancel Time: {cancelTime.toLocaleString()}</div>}
        <div className="text-sm text-gray-500">Products:</div>
        <ul className="list-disc list-inside">
          {products.map((product, index) => (
            <li key={index} className="text-sm text-gray-700">{product.name} (Quantity: {product.quantity})</li>
          ))}
        </ul>
        {status === 'pending' && <div className="text-sm text-blue-500">This order is still pending.</div>}
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold text-green-700 mb-4">Vendor Orders</h1>
      <div className="mb-4 text-lg font-bold text-gray-700">Total All-Time Completed Orders: {orders.filter(order => order.status === 'completed').length}</div>

      <div className="tabs flex space-x-1 mb-4 align-items-center justify-center">
        {['pending', 'completed', 'canceled'].map(tab => (
          <button
            key={tab}
            className={`px-2 py-1 text-sm md:text-sm rounded-lg flex items-center ${activeTab === tab ? 'bg-green-700 text-white' : 'bg-white text-gray-700'} shadow-md hover:bg-green-800 transition`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'pending' && <FaRegClock className="mr-1" />}
            {tab === 'completed' && <FaCheck className="mr-1" />}
            {tab === 'canceled' && <FaTimes className="mr-1" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="orders-list space-y-4">
        {renderOrders(activeTab)}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {renderModalContent()}
      </Modal>
    </div>
  );
};

export default VendorOrders;
