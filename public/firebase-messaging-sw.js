// public/firebase-messaging-sw.js

// Import the Firebase “compat” scripts for messaging
importScripts(
  "https://www.gstatic.com/firebasejs/9.21.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.21.0/firebase-messaging-compat.js"
);

// Initialize the Firebase app in the service worker scope
firebase.initializeApp({
  apiKey: "AIzaSyC7pOCYSGpYMUDiRxRN4nV4UUfd2tdx1Jg",
  authDomain: "ecommerce-ba520.firebaseapp.com",
  projectId: "ecommerce-ba520",
  storageBucket: "ecommerce-ba520.appspot.com",
  messagingSenderId: "620187458799",
  appId: "1:620187458799:web:c4deef3184a5145256cf1a",
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon: icon || "/icons/icon-192x192.png",
  });
});
