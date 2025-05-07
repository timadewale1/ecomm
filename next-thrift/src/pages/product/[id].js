// src/pages/product/[id].js

import Head from "next/head";

import { initAdmin } from "lib/firebaseAdmin.js";
import { AuthProvider } from "@/custom-hooks/useAuth";
import { FavoritesProvider } from "@/components/context/FavoritesContext";
import { Timestamp } from "firebase-admin/firestore";

// // 1️ Client-only product UI
// const ProductPage = dynamic(() => import("../../app/product/ProductPage"), {
//   ssr: false,
// });

// — Recursively convert any Firestore Timestamps to JSON-safe strings
function toJSON(value) {
  if (value == null) return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(toJSON);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, toJSON(v)])
    );
  }
  return value;
}

// 2️⃣ SSR + UA sniffing
export async function getServerSideProps({ req, params }) {
  const ua = req.headers["user-agent"] || "";
  // only those scrapers should hit us for OG tags:
  const isBot = /(facebookexternalhit|Twitterbot|Slackbot|WhatsApp)/i.test(ua);

  // Human browsers & in-app UAs get bounced straight to your React-SPA:
  if (!isBot) {
    return {
      redirect: {
        destination: `https://shopmythrift.store/product/${params.id}?shared=true`,
        permanent: false,
      },
    };
  }

  // bots get the metadata
  const db = initAdmin();
  const snap = await db.collection("products").doc(params.id).get();
  if (!snap.exists) return { notFound: true };

  const product = toJSON({ id: snap.id, ...snap.data() });
  return { props: { product } };
}

// 3️⃣ Render your OG tags for the crawler, then your SPA
export default function ProductSSR({ product }) {
  const title = product.name;
  const description =
    product.description || `Shop ${product.name} on My Thrift!`;
  const url = `https://shopmythrift.store/product/${product.id}?shared=true`;
  // prefer your explicit coverImageUrl, fallback to first imageUrls entry:
  const image =
    product.coverImageUrl ||
    product.imageUrls?.[0] ||
    "/default-product-thumbnail.png";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />

        {/* ——— Open Graph ——— */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={image} />
        <meta property="og:image:width" content="800" />
        <meta property="og:image:height" content="600" />

        {/* Optional: set price metadata for richer cards */}
        <meta
          property="product:price:amount"
          content={String(product.discountPrice ?? product.price)}
        />
        <meta property="product:price:currency" content="NGN" />

        {/* ——— Twitter ——— */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
      </Head>

      {/* Client-only UI */}
      <FavoritesProvider>
        <AuthProvider>
          <ProductPage productId={product.id} />
        </AuthProvider>
      </FavoritesProvider>
    </>
  );
}
