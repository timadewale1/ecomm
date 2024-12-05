const fetch = require("node-fetch");
const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://<your-project-id>.firebaseio.com",
  });
}

const db = admin.firestore();

const defaultImage = "./public/logo512.png";

module.exports = async function handler(req, res) {
  const userAgent = req.headers["user-agent"] || "";
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

  if (isBot) {
    const path = req.url.split("/");
    const resourceType = path[1]; // 'product', 'store', or 'marketstore'
    const resourceId = path[2];

    // Map resourceType to Firestore collection
    const collectionMap = {
      product: "products",
      store: "vendors",
      marketstorepage: "vendors",
    };

    const collectionName = collectionMap[resourceType];

    if (!collectionName) {
      return res.status(404).send("Invalid resource type");
    }

    try {
      // Fetch the document from Firestore
      const doc = await db.collection(collectionName).doc(resourceId).get();

      if (!doc.exists) {
        return res.status(404).send("Not found");
      }

      const data = doc.data();
      const metaTags = `
        <html>
          <head>
            <title>${data.title || "Default Title"}</title>
            <meta name="description" content="${data.description || "Default Description"}" />
            <meta property="og:title" content="${data.title || "Default Title"}" />
            <meta property="og:description" content="${data.description || "Default Description"}" />
            <meta property="og:image" content="${data.coverImageUrl || defaultImage}" />
          </head>
          <body>
            <p>Loading...</p>
          </body>
        </html>
      `;

      res.setHeader("Content-Type", "text/html");
      return res.status(200).send(metaTags);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      return res.status(500).send("Internal Server Error");
    }
  }

  // Serve the React app for regular users
  res.status(200).sendFile("index.html", { root: "./public" });
};
