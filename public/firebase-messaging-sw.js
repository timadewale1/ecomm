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

// Handle background push messages (data-only payload)
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, vendorId, url } = payload.data;

  // Display the notification and stash click-url in data
  self.registration.showNotification(title, {
    body,
    icon: icon || "/logo.png",
    tag: `vendor-${vendorId}`,
    renotify: false,
    data: { url },
  });
});

// Handle notification click events
self.addEventListener("notificationclick", function (evt) {
  // Close the notification
  evt.notification.close();

  // Retrieve the click URL from notification data
  const clickUrl = evt.notification.data?.url || "/";

  // Focus or open the target URL
  evt.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === clickUrl && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(clickUrl);
        }
      })
  );
});
