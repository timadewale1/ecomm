import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import store from "./redux/store";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { FavoritesProvider } from "./components/Context/FavoritesContext";
import { VendorProvider } from "./components/Context/Vendorcontext";
import { NavigationProvider } from "./components/Context/Bottombarcontext";
import { messaging } from "./firebase.config"; // Use messaging from your config file
import { getToken, onMessage } from "firebase/messaging";

// Function to request notification permission and get token
const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_VAPID_KEY,
      });
      console.log("Notification token:", token);
      // Save this token to your database if you want to target specific users
    } else {
      console.log("Notification permission denied");
    }
  } catch (error) {
    console.error("Error requesting notification permission", error);
  }
};

// Call the function to request permission on app load
requestNotificationPermission();

// Set up foreground notification handler
onMessage(messaging, (payload) => {
  console.log("Message received. ", payload);
  alert(`New notification: ${payload.notification.title}`);
});

// Register the service worker for Firebase Messaging
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => {
      console.log("Service Worker registered with scope:", registration.scope);
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <NavigationProvider>
          <VendorProvider>
            <FavoritesProvider>
              <Toaster
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                  duration: 2000,
                  style: {
                    minWidth: "220px",
                    fontSize: "12px",
                    padding: "10px 20px",
                    fontFamily: "Poppins, sans-serif",
                  },
                }}
              />
              <App />
            </FavoritesProvider>
          </VendorProvider>
        </NavigationProvider>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);
