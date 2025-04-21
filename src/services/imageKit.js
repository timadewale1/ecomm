// services/imageKit.js
export const getImageKitUrl = (firebaseUrl, transform = "") => {
    // Firebase download URL prefix
    const base =
      "https://firebasestorage.googleapis.com/v0/b/yourapp.appspot.com/o/";
  
    if (!firebaseUrl.startsWith(base)) return firebaseUrl; // fallback
  
    // 👉 everything after /o/ is already URL‑encoded and includes ?alt=media&token=…
    const encodedPathAndQuery = firebaseUrl.slice(base.length);
  
    // If we add a transform we must append with &tr=  (because a ? already exists)
    const tr = transform ? `&tr=${transform}` : "";
  
    return `https://ik.imagekit.io/mythrift/${encodedPathAndQuery}${tr}`;
  };
  