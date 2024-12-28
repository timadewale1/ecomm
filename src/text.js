const firebase = require("firebase/app");
require("firebase/auth");

const firebaseConfig = {
  apiKey: "AIzaSyC7pOCYSGpYMUDiRxRN4nV4UUfd2tdx1Jg",
  authDomain: "ecommerce-ba520.firebaseapp.com",
  projectId: "ecommerce-ba520",
  storageBucket: "ecommerce-ba520.appspot.com",
  messagingSenderId: "620187458799",
  appId: "1:620187458799:web:c4deef3184a5145256cf1a",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

async function getAuthToken() {
  try {
    const user = await firebase.auth().signInWithEmailAndPassword(
      "tobiwunmie@gmail.com", // Replace with your Firebase user's email
      "Bigboy90$"            // Replace with the corresponding password
    );
    const token = await user.user.getIdToken();
    console.log("Firebase Auth Token:", token);
    return token;
  } catch (error) {
    console.error("Error authenticating:", error.message);
  }
}

getAuthToken();
