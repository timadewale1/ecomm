// scripts/generate-sitemap.js
require("dotenv").config(); // ← loads .env
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error(
    "❌ Missing FIREBASE_SERVICE_ACCOUNT – check your .env or Vercel settings",
  );
  process.exit(1);
}
// 1) Firebase Admin setup
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

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
  const { createSiteUrls } = await import("../src/config/siteUrls.mjs");
  const hostname = createSiteUrls({
    appOrigin: process.env.VITE_APP_ORIGIN,
  }).appOrigin;
  const now = new Date().toISOString();

  // 3) Static top-level pages
  const links = [
    { url: "/", changefreq: "daily", priority: 1.0, lastmod: now },
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

  // Only the server-owned public projection belongs in a public sitemap.
  const snapshot = await db.collection("publicVendors").where("isPublic", "==", true).select("isPublic").get();
  console.log(`Fetched ${snapshot.size} public stores.`);
  snapshot.docs.forEach((doc) => {
    links.push({
      url: `/store/${doc.id}`,
      changefreq: "weekly",
      priority: 0.7,
      lastmod: now,
    });
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
