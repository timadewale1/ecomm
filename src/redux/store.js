// store.js
import { createStore, applyMiddleware, combineReducers } from "redux";
import thunk from "redux-thunk";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import conditionCategoriesSlice from "./reducers/conditionCategoriesSlice";
// Reducers
import { cartReducer } from "./reducers/reducer";
import homepageReducer from "./reducers/homepagereducer";
import productReducer from "./reducers/productreducers";
import authReducer from "./reducers/authreducers";
import orderReducer from "./reducers/orderreducer";
import discountProductsReducer from "./reducers/discountProductsSlice";
import categoriesReducer from "./reducers/categoriesSlice";
import conditionReducer from "./reducers/conditionSlice";
import { marketReducer } from "./reducers/marketreducer";
import personalDiscountsSlice from "./reducers/personalDiscount";
import userReducer from "./reducers/userreducer";
import vendorProfileReducer from "./vendorProfileSlice";
import recentactivitiesReducer from "./recentActivitiesSlice";
import storepageVendorsReducer from "./reducers/storepageVendorsSlice";
import stockpileReducer from "./reducers/stockpileSlice";
import vendorReducer from "./reducers/VendorsSlice";
import personalDiscountsPageReducer from "./reducers/personalDiscountsPageSlice";
import { promoReducer } from "./reducers/promoreducer";
import catsectionReducer from "./reducers/catsection";
import categoryProductsReducer from "./reducers/categoryProductsSlice";
import topVendorsReducer from "./reducers/topVendorsSlice";
import vendorStockpileReducer from "./reducers/vendorStockpileSlice";
// Redux Persist config (only for stockpile)
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["stockpile"],
};

// Combined Reducers
const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  conditionCategories: conditionCategoriesSlice,
  topVendors: topVendorsReducer,
  product: productReducer,
  user: userReducer,
  stockpile: stockpileReducer, // will be persisted
  storepageVendors: storepageVendorsReducer,
  orders: orderReducer,
  discountProducts: discountProductsReducer,
  market: marketReducer,
  promo: promoReducer,
  vendorStockpile: vendorStockpileReducer,
  personalDiscountsPage: personalDiscountsPageReducer,
  personalDiscounts: personalDiscountsSlice,
  homepage: homepageReducer,
  catsection: catsectionReducer,
  categories: categoriesReducer,
  vendors: vendorReducer,
  condition: conditionReducer,
  categoryProducts: categoryProductsReducer,
  vendorProfile: vendorProfileReducer,
  activities: recentactivitiesReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Manually handle cart persistence (still valid)
const loadCartState = () => {
  try {
    const serializedCart = localStorage.getItem("cart");
    if (!serializedCart) return undefined;
    return { cart: JSON.parse(serializedCart) };
  } catch (e) {
    return undefined;
  }
};

const store = createStore(
  persistedReducer,
  loadCartState(),
  applyMiddleware(thunk)
);

// Save cart changes manually
store.subscribe(() => {
  try {
    const state = store.getState();
    localStorage.setItem("cart", JSON.stringify(state.cart));
  } catch (e) {
    // Ignore errors
  }
});

export const persistor = persistStore(store);
export default store;
