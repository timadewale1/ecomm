const fetch = require("node-fetch");
const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

module.exports = async function handler(req, res) {
  const userAgent = req.headers["user-agent"] || "";
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

  if (isBot) {
    const path = req.url.split("/");
    const resourceType = path[1];
    const resourceId = path[2];

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
            <meta property="og:image" content="${data.coverImageUrl || "/logo512.png"}" />
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
  } else {
    // If not a bot, do nothing (handled by React)
    res.status(404).send("Not Found");
  }
};
