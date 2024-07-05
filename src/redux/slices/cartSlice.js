import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userCarts: {},
  totalQuantity: 0, // Add totalQuantity field
};

const calculateTotalAmount = (cartItems) => {
  return cartItems.reduce(
    (total, item) => total + Number(item.price) * Number(item.quantity),
    0
  );
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action) => {
      const { userId, newItem } = action.payload;
      if (!state.userCarts[userId]) {
        state.userCarts[userId] = [];
      }
      const existingItem = state.userCarts[userId].find(
        (item) => item.id === newItem.id
      );

      if (!existingItem) {
        state.userCarts[userId].push({
          id: newItem.id,
          productName: newItem.productName,
          imgUrl: newItem.imgUrl,
          price: newItem.price,
          quantity: 1,
          totalPrice: newItem.price,
        });
      } else {
        existingItem.quantity++;
        existingItem.totalPrice =
          Number(existingItem.totalPrice) + Number(newItem.price);
      }

      // Update totalQuantity
      state.totalQuantity = state.userCarts[userId].reduce(
        (total, item) => total + item.quantity,
        0
      );

      // Update totalAmount for the specific user
      state.totalAmount = calculateTotalAmount(state.userCarts[userId]);
    },
    deleteItem: (state, action) => {
      const { userId, itemId } = action.payload;
      const existingItem = state.userCarts[userId].find(
        (item) => item.id === itemId
      );

      if (existingItem) {
        state.userCarts[userId] = state.userCarts[userId].filter(
          (item) => item.id !== itemId
        );

        // Update totalQuantity
        state.totalQuantity = state.userCarts[userId].reduce(
          (total, item) => total + item.quantity,
          0
        );

        // Update totalAmount for the specific user after deletion
        state.totalAmount = calculateTotalAmount(state.userCarts[userId]);
      }
    },
    resetCart: (state) => {
      state.userCarts = {};
      state.totalQuantity = 0;
      state.totalAmount = 0;
    },
  },
});

export const cartActions = cartSlice.actions;
export default cartSlice.reducer;
