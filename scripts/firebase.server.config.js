const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

// 1) Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyC7pOCYSGpYMUDiRxRN4nV4UUfd2tdx1Jg",
    authDomain: "ecommerce-ba520.firebaseapp.com",
    projectId: "ecommerce-ba520",
    storageBucket: "ecommerce-ba520.appspot.com",
    messagingSenderId: "620187458799",
    appId: "1:620187458799:web:c4deef3184a5145256cf1a",
};

// 2) Initialize Firebase
const app = initializeApp(firebaseConfig);

// 3) Initialize Firestore
const db = getFirestore(app);
console.log("Firestore initialized.");

module.exports = { db, collection, getDocs };
