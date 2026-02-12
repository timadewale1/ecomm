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

import { AuthProvider } from "./custom-hooks/useAuth";
import { TawkProvider } from "./components/Context/TawkProvider.jsx";

import { PostHogProvider } from "posthog-js/react";
import SwipeToast from "./components/Toasts/SwipeToast.jsx";

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  autocapture: true,
  capture_pageview: false,
  session_recording: { sampling_rate: 1 },
};

createRoot(document.getElementById("root")).render(
  <HelmetProvider>
    <StrictMode>
      <BrowserRouter>
        <PostHogProvider
          apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
          options={posthogOptions}
        >
          {" "}
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <AuthProvider>
                <NavigationProvider>
                  <VendorProvider>
                    <TawkProvider>
                      <FavoritesProvider>
                     <Toaster
  position="bottom-center"
  reverseOrder={false}
  gutter={10}
  toastOptions={{
    duration: 2500,
    style: {
      background: "transparent",
      boxShadow: "none",
      padding: 0,
    },
  }}
>
  {(t) => <SwipeToast t={t} />}
</Toaster>

                        <App />
                      </FavoritesProvider>
                    </TawkProvider>
                  </VendorProvider>
                </NavigationProvider>
              </AuthProvider>
            </PersistGate>
          </Provider>
        </PostHogProvider>
      </BrowserRouter>
    </StrictMode>
  </HelmetProvider>
);
