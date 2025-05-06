// src/pages/store/[id].js
import Head from "next/head";
import dynamic from "next/dynamic";
import { initAdmin } from "lib/firebaseAdmin.js";
import { AuthProvider } from "@/custom-hooks/useAuth";
import { FavoritesProvider } from "@/components/context/FavoritesContext";
// 1️⃣  Lazy-load the interactive client component
const StorePage = dynamic(() => import("../../app/store/StorePage"), {
  ssr: false,
});

/* ------------------------------------------------------------------ */
/* Helper: recursively convert Firestore Timestamps to JSON-safe data */
/* ------------------------------------------------------------------ */
import { Timestamp } from "firebase-admin/firestore";

function toJSON(value) {
  if (value == null) return value; // null | undefined
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(toJSON);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, toJSON(v)])
    );
  }
  return value; // string, number, boolean…
}

/* ------------------------------------------------------------------ */
/* Server-side data fetch                                             */
/* ------------------------------------------------------------------ */
export async function getServerSideProps({ params }) {
  const db = initAdmin();
  const snap = await db.collection("vendors").doc(params.id).get();

  if (!snap.exists) return { notFound: true };

  // Convert EVERY field (createdSince, lastUpdate, etc.)
  const vendor = toJSON({ id: snap.id, ...snap.data() });

  return { props: { vendor } };
}

/* ------------------------------------------------------------------ */
/* React component: renders meta tags, then hands off to StorePage     */
/* ------------------------------------------------------------------ */
export default function StoreSSR({ vendor }) {
  const title = vendor.shopName;
  const description =
    vendor.description || "Check out this vendor on My Thrift!";
  const url = `https://shopmythrift.store/store/${vendor.id}`;
  const image = vendor.coverImageUrl || "/https://blog.shopmythrift.store/favicon.ico";

  return (
    <>
      <Head>
        {/* vendor-specific */}
        <title>{title}</title>

        {/* ——— Open Graph ——— */}
        <meta property="og:type" content="website" key="og:type" />
        <meta property="og:title" content={title} key="og:title" />
        <meta
          property="og:description"
          content={description}
          key="og:description"
        />
        <meta property="og:url" content={url} key="og:url" />
        <meta property="og:image" content={image} key="og:image" />
        <meta
          property="og:image:secure_url"
          content={image}
          key="og:image:secure"
        />
        <meta property="og:image:width" content="800" key="og:image:width" />
        <meta property="og:image:height" content="600" key="og:image:height" />

        {/* ——— Twitter ——— */}
        <meta name="twitter:card" content="summary_large_image" key="tw:card" />
        <meta name="twitter:title" content={title} key="tw:title" />
        <meta name="twitter:description" content={description} key="tw:desc" />
        <meta name="twitter:image" content={image} key="tw:image" />
      </Head>

      {/* Client-only UI */}
      <FavoritesProvider>
        <AuthProvider>
          <StorePage vendorId={vendor.id} />
        </AuthProvider>
      </FavoritesProvider>
    </>
  );
}
