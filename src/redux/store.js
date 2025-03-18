// store.js
import { createStore, applyMiddleware, combineReducers } from "redux";
import thunk from "redux-thunk";
import { cartReducer } from "./reducers/reducer";
// import favoritesReducer from "./reducers/favouriteReducers";
import homepageReducer from "./reducers/homepagereducer";
import productReducer from "./reducers/productreducers";
// import homepageReducer from "./reducers/homepageSlice";
import authReducer from "./reducers/authreducers";
import orderReducer from "./reducers/orderreducer";
import  discountProductsReducer  from "./reducers/discountProductsSlice";
import categoriesReducer from "./reducers/categoriesSlice";
import conditionReducer from "./reducers/conditionSlice"; 
import { marketReducer } from "./reducers/marketreducer";
import personalDiscountsSlice from "./reducers/personalDiscount";
import userReducer from "./reducers/userreducer";
import vendorProfileReducer from "./vendorProfileSlice"; // Adjust the path as needed
import recentactivitiesReducer from "./recentActivitiesSlice"; // Adjust the path as needed
import vendorReducer from "./reducers/VendorsSlice";
import personalDiscountsPageReducer from "./reducers/personalDiscountsPageSlice";
import { promoReducer } from "./reducers/promoreducer";
import categoryProductsReducer from "./reducers/categoryProductsSlice";
const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  product: productReducer,
  user: userReducer,
  orders: orderReducer,
  discountProducts: discountProductsReducer,
  market: marketReducer,
  promo: promoReducer,
  personalDiscountsPage: personalDiscountsPageReducer,
  personalDiscounts: personalDiscountsSlice,
  homepage: homepageReducer,
  categories: categoriesReducer,
  vendors: vendorReducer,
  condition: conditionReducer,
  categoryProducts: categoryProductsReducer,  

  vendorProfile: vendorProfileReducer, 
  activities: recentactivitiesReducer,
});

// Load cart state from local storage
const loadState = () => {
  try {
    const serializedState = localStorage.getItem("cart");
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return undefined;
  }
};

// Save cart state to local storage
const saveState = (state) => {
  try {
    const serializedState = JSON.stringify(state.cart);
    localStorage.setItem("cart", serializedState);
  } catch (err) {
    // Ignore write errors
  }
};

const persistedState = { cart: loadState() };

const store = createStore(rootReducer, persistedState, applyMiddleware(thunk));

store.subscribe(() => {
  saveState(store.getState());
});

export default store;
