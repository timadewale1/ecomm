import { configureStore } from "@reduxjs/toolkit";
import vendorProfileReducer from "./vendorProfileSlice";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // Defaults to localStorage

const persistConfig = {
  key: "root",
  storage,
};

const persistedReducer = persistReducer(persistConfig, vendorProfileReducer);

const vProfileStore = configureStore({
  reducer: {
    vendorProfile: persistedReducer,
  },
});

export const persistor = persistStore(vProfileStore);
export default vProfileStore;
