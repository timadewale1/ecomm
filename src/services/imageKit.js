export const getImageKitUrl = (firebaseUrl, transform = "") => {
  console.log("Input Firebase URL:", firebaseUrl);
  const base =
    "https://firebasestorage.googleapis.com/v0/b/ecommerce-ba520.appspot.com/o/";
  if (!firebaseUrl || typeof firebaseUrl !== "string") {
    console.warn("Invalid Firebase URL, using as-is:", firebaseUrl);
    return firebaseUrl;
  }

  let path = firebaseUrl;

  // Extract and transform path if it starts with the Firebase base
  if (firebaseUrl.startsWith(base)) {
    path = firebaseUrl; // Keep the full URL initially
    // Replace the Firebase base with ImageKit base
    path = path.replace(base, "https://ik.imagekit.io/mythrift/");
    // Add transformation as a query parameter
    if (transform) {
      path += (path.includes("?") ? "&" : "?") + `tr=${transform}`;
    }
  } else if (firebaseUrl.startsWith("/")) {
    path = firebaseUrl.replace(/^\/+/, ""); // Remove leading slashes
    path = `https://ik.imagekit.io/mythrift/${path}`;
    if (transform) {
      path += `?tr=${transform}`;
    }
  }

  console.log("Generated ImageKit URL:", path); // Debug the output
  return path;
};
