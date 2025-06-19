import React from "react";
import "./index.css";
import "./font.css";
import ReactDOM from "react-dom/client";
// import "bootstrap/dist/css/bootstrap.css";
import App from "./App.jsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PersistGate } from "redux-persist/integration/react";
import { BrowserRouter } from "react-router-dom";
import store, { persistor } from "./redux/store";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { FavoritesProvider } from "./components/Context/FavoritesContext";
import { VendorProvider } from "./components/Context/Vendorcontext";
import { NavigationProvider } from "./components/Context/Bottombarcontext";
import { HelmetProvider } from "react-helmet-async";
import WalletSocketProvider from "./services/WalletSocketProvider.jsx";
import { AuthProvider } from "./custom-hooks/useAuth";
import { TawkProvider } from "./components/Context/TawkProvider.jsx";
createRoot(document.getElementById("root")).render(
  <HelmetProvider>
    <StrictMode>
      <BrowserRouter>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <AuthProvider>
              <NavigationProvider>
                <VendorProvider>
                  <TawkProvider>
                    <WalletSocketProvider>
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
                    </WalletSocketProvider>
                  </TawkProvider>
                </VendorProvider>
              </NavigationProvider>
            </AuthProvider>
          </PersistGate>
        </Provider>
      </BrowserRouter>
    </StrictMode>
  </HelmetProvider>
);
