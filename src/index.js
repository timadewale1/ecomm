import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.css";
import App from "./App";
import { PersistGate } from "redux-persist/integration/react";
import { BrowserRouter } from "react-router-dom";
import store from "./redux/store";
import vProfileStore, { persistor } from "./redux/vProfileStore"
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { FavoritesProvider } from "./components/Context/FavoritesContext";
import { VendorProvider } from "./components/Context/Vendorcontext";
import { NavigationProvider } from "./components/Context/Bottombarcontext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <NavigationProvider>
          <Provider store={vProfileStore}>
            <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
              <VendorProvider>
                <FavoritesProvider>
                  <Toaster
                    position="top-center"
                    reverseOrder={false}
                    toastOptions={{
                      duration: 2000,
                      style: {
                        minWidth: "220px", // Make toast wider
                        fontSize: "12px", // Reduce text size
                        padding: "10px 20px", // Adjust padding if needed
                        fontFamily: "Poppins, sans-serif", // Use Poppins font
                      },
                    }}
                  />
                  <App />
                </FavoritesProvider>
              </VendorProvider>
            </PersistGate>
          </Provider>
        </NavigationProvider>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);
