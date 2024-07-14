import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeFromCart } from '../redux/actions/action';
import { FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Cart = () => {
  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();

  const handleRemoveFromCart = (productId) => {
    dispatch(removeFromCart(productId));
    toast.info('Removed product from cart!');
  };

  return (
    <div className="p-3">
      <h1 className="font-ubuntu text-lg font-medium">Your Cart</h1>
      {Object.keys(cart).length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <div>
          {Object.values(cart).map((product) => (
            <div key={product.id} className="flex justify-between items-center border-b py-2">
              <div>
                <h3 className="text-md">{product.name}</h3>
                <p className="text-gray-600">₦{product.price}</p>
                <p className="text-gray-600">Size: {product.size}</p>
                <p className="text-gray-600">Quantity: {product.quantity}</p> {/* Display quantity */}
              </div>
              <button onClick={() => handleRemoveFromCart(product.id)} className="text-red-500">
                <FaTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Cart;
