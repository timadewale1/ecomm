importScripts(
  "https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js"
);

console.log("Service Worker: Registered");

firebase.initializeApp({
  apiKey: "AIzaSyC7pOCYSGpYMUDiRxRN4nV4UUfd2tdx1Jg",
  authDomain: "shopmythrift.store",
  projectId: "ecommerce-ba520",
  storageBucket: "ecommerce-ba520.appspot.com",
  messagingSenderId: "620187458799",
  appId: "1:620187458799:web:c4deef3184a5145256cf1a",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/firebase-logo.png", // Adjust icon path if necessary
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
