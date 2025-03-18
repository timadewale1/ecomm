const fs = require('fs');
const { db, collection, getDocs } = require('../scripts/firebase.server.config.js');


const BASE_URL = 'https://www.shopmythrift.store';

// Function to fetch all products
async function getAllProducts() {
    const productsRef = collection(db, 'products'); // Correct way to get collection
    const snapshot = await getDocs(productsRef);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        updatedAt: doc.data().updatedAt || new Date().toISOString()
    }));
}

// Function to fetch all vendors
async function getAllVendors() {
    const vendorsRef = collection(db, 'vendors'); // Correct way to get collection
    const snapshot = await getDocs(vendorsRef);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        updatedAt: doc.data().updatedAt || new Date().toISOString()
    }));
}

// Function to generate the sitemap
async function generateSitemap() {
    console.log("Fetching products and vendors from Firebase...");
    const products = await getAllProducts();
    const vendors = await getAllVendors();

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Homepage
    sitemap += `
      <url>
        <loc>${BASE_URL}</loc>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
      </url>\n
    `;

    // Product pages
    products.forEach(product => {
        sitemap += `
          <url>
            <loc>${BASE_URL}/product/${product.id}</loc>
            <lastmod>${product.updatedAt}</lastmod>
            <changefreq>weekly</changefreq>
            <priority>0.8</priority>
          </url>\n
        `;
    });

    // Vendor pages
    vendors.forEach(vendor => {
        sitemap += `
          <url>
            <loc>${BASE_URL}/store/${vendor.id}</loc>
            <changefreq>weekly</changefreq>
            <priority>0.7</priority>
          </url>\n
        `;
    });

    sitemap += `</urlset>`;

    // Save to public folder
    fs.writeFileSync('./public/sitemap.xml', sitemap);
    console.log('✅ Sitemap generated successfully!');
}

// Run the script
generateSitemap().catch(console.error);
