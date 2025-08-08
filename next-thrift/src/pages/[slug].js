// pages/[slug].js
import Head from "next/head";

/* ───────── Helpers ───────── */

const isBotUA = (ua = "") =>
  /(facebookexternalhit|Twitterbot|Slackbot|WhatsApp|SnapchatExternalHit)/i.test(
    ua
  );

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

/* ───────── SSR ───────── */

export async function getServerSideProps({ req, params }) {
  const slug = String(params?.slug || "").toLowerCase();
  console.log("Requested slug:", slug); // Debug: Log the slug

  if (!slug) {
    console.log("No slug provided");
    return { notFound: true };
  }

  /* Node-only imports */
  const { initAdmin } = await import("lib/firebaseAdmin");
  const { Timestamp } = await import("firebase-admin/firestore");

  /* Firestore lookup */
  const db = initAdmin();
  const snapQ = await db
    .collection("vendors")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapQ.empty) {
    console.log("No vendor found for slug:", slug); // Debug: Log if no match
    return { notFound: true };
  }

  const vendor = toJSON(
    { id: snapQ.docs[0].id, ...snapQ.docs[0].data() },
    Timestamp
  );
  console.log("Vendor data:", vendor); // Debug: Log the vendor

  /* Redirect for humans, OG for crawlers */
  const ua = req.headers["user-agent"] || "";
  const crawler = isBotUA(ua);
  console.log("User agent:", ua, "Is crawler:", crawler); // Debug: Log UA decision

  if (!crawler) {
    console.log(
      "Redirecting to:",
      `https://shopmythrift.store/store/${vendor.id}?shared=true`
    );
    return {
      redirect: {
        destination: `https://shopmythrift.store/store/${vendor.id}?shared=true`,
        permanent: true,
      },
    };
  }

  /* Serve OG props for crawlers */
  console.log("Serving OG tags for crawler");
  return { props: { vendor } };
}

/* ───────── Page Component ───────── */

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
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={vendor.shopName} />
        <meta
          name="twitter:description"
          content={vendor.description ?? "Check out this vendor on My Thrift!"}
        />
        <meta name="twitter:image" content={ogImage} />
        <link rel="canonical" href={ogUrl} />
      </Head>
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <h1>{vendor.shopName}</h1>
        <p>{vendor.description || "Redirecting…"}</p>
      </main>
    </>
  );
}
