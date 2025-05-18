// scripts/generate-sitemap.js
require('dotenv').config();               // ← loads .env

// 1) Firebase Admin setup
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT 
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 2) Sitemap & FS imports
const { SitemapStream, streamToPromise } = require("sitemap");
const { createWriteStream } = require("fs");
const { Readable } = require("stream");
const path = require("path");

async function build() {
  const hostname = "https://www.shopmythrift.store";
  const now = new Date().toISOString();

  // 3) Static top-level pages
  const links = [
    { url: "/", changefreq: "daily", priority: 1.0, lastmod: now },
    { url: "/newhome", changefreq: "weekly", priority: 0.8, lastmod: now },
    { url: "/explore", changefreq: "weekly", priority: 0.8, lastmod: now },
    {
      url: "/producttype/Tops",
      changefreq: "monthly",
      priority: 0.6,
      lastmod: now,
    },
    {
      url: "/browse-markets",
      changefreq: "weekly",
      priority: 0.7,
      lastmod: now,
    },
  ];

  // 4) Pull every vendor doc ID
  const snapshot = await db.collection("vendors").get();
  console.log(`Fetched ${snapshot.size} vendor docs.`);
  snapshot.docs.forEach((doc) => {
    // you can also filter here if you only want approved vendors:
    // const { isApproved } = doc.data();
    // if (!isApproved) return;

    links.push({
      url: `/store/${doc.id}`,
      changefreq: "weekly",
      priority: 0.7,
      lastmod: now,
    });
    console.log(` → added /store/${doc.id}`);
  });

  // 5) Generate sitemap XML
  const stream = new SitemapStream({ hostname });
  const xml = await streamToPromise(Readable.from(links).pipe(stream));

  // 6) Write it into public/sitemap.xml
  const outputPath = path.resolve(__dirname, "../public/sitemap.xml");
  createWriteStream(outputPath).write(xml.toString());
  console.log("✅ sitemap.xml generated at", outputPath);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
