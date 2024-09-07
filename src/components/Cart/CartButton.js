import React from 'react';

const CartButton = ({
  quantity,
  handleIncreaseQuantity,
  handleDecreaseQuantity,
  handleAddToCart,
  price,
  formatPrice,
}) => {
  return (
    <div className="fixed bottom-0 left-0 w-full z-50 bg-white border-t-2 border-gray-200 p-4 flex items-center justify-between">
      <div className="flex items-center justify-center">
        <button
          className="text-xl font-semibold text-gray-800 border rounded-full px-3 py-1"
          onClick={handleDecreaseQuantity}
          disabled={quantity === 1}
        >
          -
        </button>
        <span className="mx-4 text-lg font-semibold">{quantity}</span>
        <button
          className="text-xl font-semibold text-gray-800 border rounded-full px-3 py-1"
          onClick={handleIncreaseQuantity}
        >
          +
        </button>
      </div>
      <span className="text-lg font-bold text-orange-500">
        ₦{formatPrice(price * quantity)}
      </span>
      <button
        className="ml-4 py-3 px-6 text-xl font-semibold text-white bg-customOrange rounded-full"
        onClick={handleAddToCart}
      >
        Add to cart
      </button>
    </div>
  );
};

export default CartButton;
