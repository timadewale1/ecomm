import {
  SET_CART,
  ADD_TO_CART,
  REMOVE_FROM_CART,
  CLEAR_CART,
  INCREASE_QUANTITY,
  DECREASE_QUANTITY,
} from "../actions/action";

const initialState = {};

export const cartReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_CART:
      return action.payload;

    case ADD_TO_CART: {
      const { vendorId, productKey, product } = action.payload;

      if (!vendorId || !productKey) {
        return state;
      }

      const vendorCart = state[vendorId] || {
        vendorName: product.vendorName,
        products: {},
      };

      const updatedState = {
        ...state,
        [vendorId]: {
          ...vendorCart,
          products: {
            ...vendorCart.products,
            [productKey]: product,
          },
        },
      };

      return updatedState;
    }

    case REMOVE_FROM_CART: {
      const { vendorId, productKey } = action.payload;
      const vendorCart = state[vendorId];

      if (!vendorCart) return state;

      const updatedProducts = { ...vendorCart.products };
      delete updatedProducts[productKey];

      if (Object.keys(updatedProducts).length === 0) {
        const newState = { ...state };
        delete newState[vendorId];

        return newState;
      }

      const updatedState = {
        ...state,
        [vendorId]: {
          ...vendorCart,
          products: updatedProducts,
        },
      };

      return updatedState;
    }

    case CLEAR_CART: {
      const { vendorId } = action.payload;

      if (vendorId) {
        const newState = { ...state };
        delete newState[vendorId];
        console.log("Cleared cart for vendor:", vendorId);
        return newState;
      } else {
        console.log("Clearing entire cart");
        return {};
      }
    }

    case INCREASE_QUANTITY: {
      const { vendorId, productKey } = action.payload;
      const vendorCart = state[vendorId];

      if (!vendorCart) return state;

      const product = vendorCart.products[productKey];

      if (!product) {
       
        return state;
      }

      const updatedProduct = {
        ...product,
        quantity: product.quantity + 1,
      };

      const updatedVendorCart = {
        ...vendorCart,
        products: {
          ...vendorCart.products,
          [productKey]: updatedProduct,
        },
      };

      const updatedState = {
        ...state,
        [vendorId]: updatedVendorCart,
      };

      
      return updatedState;
    }

    case DECREASE_QUANTITY: {
      const { vendorId, productKey } = action.payload;
      const vendorCart = state[vendorId];

      if (!vendorCart) return state;

      const product = vendorCart.products[productKey];

      if (!product) {
       
        return state;
      }

      if (product.quantity > 1) {
        const updatedProduct = {
          ...product,
          quantity: product.quantity - 1,
        };

        const updatedVendorCart = {
          ...vendorCart,
          products: {
            ...vendorCart.products,
            [productKey]: updatedProduct,
          },
        };

        const updatedState = {
          ...state,
          [vendorId]: updatedVendorCart,
        };

        
        return updatedState;
      } else {
        // If quantity is 1, remove the product
        const updatedProducts = { ...vendorCart.products };
        delete updatedProducts[productKey];

        if (Object.keys(updatedProducts).length === 0) {
          const newState = { ...state };
          delete newState[vendorId];
          
          return newState;
        }

        const updatedState = {
          ...state,
          [vendorId]: {
            ...vendorCart,
            products: updatedProducts,
          },
        };

        
        return updatedState;
      }
    }

    default:
      return state;
  }
};
