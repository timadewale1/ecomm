// pages/[slug].js
import Head from "next/head";

/* ───────── helpers ───────── */

const isBotUA = (ua = "") =>
  /(facebookexternalhit|Twitterbot|Slackbot|WhatsApp|SnapchatExternalHit)/i.test(
    ua
  );

/**  Recursive JSON-safe serializer that only needs Timestamp
 *    when we’re on the server. */
const toJSON = (v, Timestamp) => {
  if (v == null) return v;
  if (Timestamp && v instanceof Timestamp) return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map((x) => toJSON(x, Timestamp));
  if (typeof v === "object")
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, toJSON(x, Timestamp)])
    );
  return v;
};

/* ─────────  SSR  ───────── */

export async function getServerSideProps({ req, params }) {
  const slug = String(params?.slug || "").toLowerCase();
  if (!slug) return { notFound: true };

  /*  Node-only deps — imported **inside** the server function  */
  const { initAdmin } = await import("lib/firebaseAdmin");
  const { Timestamp } = await import("firebase-admin/firestore");

  /* 1️⃣  Firestore lookup by slug */
  const db = initAdmin();
  const snapQ = await db
    .collection("vendors")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapQ.empty) return { notFound: true };

  const vendor = toJSON(
    { id: snapQ.docs[0].id, ...snapQ.docs[0].data() },
    Timestamp
  );

  /* 2️⃣  Decide: redirect vs render OG */
  const ua = req.headers["user-agent"] || "";
  const crawler = isBotUA(ua);
  const snapchatApp = /Snapchat(?!ExternalHit)/i.test(ua);

  if (!crawler || snapchatApp) {
    return {
      redirect: {
        destination: `https://shopmythrift.store/store/${vendor.id}`,
        permanent: false, // switch to true (301/308) later
      },
    };
  }

  /* 3️⃣  Crawlers → give OG props */
  return { props: { vendor } };
}

/* ─────────  Page Component  ─────────
   Humans never see this (they’re redirected); crawlers get OG tags. */
export default function VendorOG({ vendor }) {
  if (!vendor) return null;

  const ogUrl = `https://mx.shopmythrift.store/${vendor.slug}`;
  const ogImage = vendor.coverImageUrl
    ? `https://ik.imagekit.io/your_path/tr:w-1200,h-630/${vendor.coverImageUrl}`
    : "https://shopmythrift.store/default-og.jpg";

  return (
    <>
      <Head>
        <title>{vendor.shopName}</title>

        {/* ——— Open Graph ——— */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={vendor.shopName} />
        <meta
          property="og:description"
          content={vendor.description ?? "Check out this vendor on My Thrift!"}
        />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* ——— Twitter ——— */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={vendor.shopName} />
        <meta
          name="twitter:description"
          content={vendor.description ?? "Check out this vendor on My Thrift!"}
        />
        <meta name="twitter:image" content={ogImage} />

        {/* canonical for SEO */}
        <link rel="canonical" href={ogUrl} />
      </Head>

      {/* Tiny body so bots get valid HTML; never shown to humans */}
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <h1>{vendor.shopName}</h1>
        <p>{vendor.description || "Redirecting…"}</p>
      </main>
    </>
  );
}
