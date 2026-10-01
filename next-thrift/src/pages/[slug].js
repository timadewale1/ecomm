// pages/[slug].js
import Head from "next/head";
import { getOgImageUrl } from "lib/imageKit"; // ← identical helper as /store/[id].js
import shareRouting from "lib/shareRouting.cjs";

/* ───────── helpers ───────── */

const isCrawler = (ua = "") =>
  /(facebookexternalhit|Twitterbot|Slackbot|WhatsApp|SnapchatExternalHit)/i.test(
    ua
  );

const toJSON = (val, Timestamp) => {
  if (val == null) return val;
  if (Timestamp && val instanceof Timestamp) return val.toDate().toISOString();
  if (Array.isArray(val)) return val.map((x) => toJSON(x, Timestamp));
  if (typeof val === "object")
    return Object.fromEntries(
      Object.entries(val).map(([k, v]) => [k, toJSON(v, Timestamp)])
    );
  return val;
};

/* ───────── SSR ───────── */

export async function getServerSideProps({ req, res, params, resolvedUrl }) {
  shareRouting.prepareShareResponse(res);
  const slug = String(params?.slug || "").toLowerCase();
  if (!slug) return { notFound: true };

  /* node-only imports (kept inside the function) */
  const { initAdmin } = await import("lib/firebaseAdmin");
  const { Timestamp } = await import("firebase-admin/firestore");

  /* 1️⃣  Firestore lookup */
  const db = initAdmin();
  const snapQ = await db
    .collection("vendors")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapQ.empty || !shareRouting.isPublicVendor(snapQ.docs[0].data())) return { notFound: true };
  const vendor = toJSON(
    shareRouting.previewVendor(snapQ.docs[0].id, snapQ.docs[0].data()),
    Timestamp
  );

  /* 2️⃣  Decide: redirect vs OG */
  const ua = req.headers["user-agent"] || "";
  const bot = shareRouting.isPreviewCrawler(ua);
  const isSnapApp = /Snapchat(?!ExternalHit)/i.test(ua);

  if (!bot || isSnapApp) {
    return {
      redirect: {
        destination: shareRouting.appDestination("store", vendor.id, resolvedUrl),
        permanent: false, // People and preview crawlers intentionally get different responses.
      },
    };
  }

  /* 3️⃣  Crawlers get OG props */
  return { props: { vendor, canonicalUrl: shareRouting.canonicalUrl("store", vendor) } };
}

/* ───────── Page component (OG only) ───────── */

export default function VendorOG({ vendor, canonicalUrl }) {
  if (!vendor) return null;

  const ogUrl = canonicalUrl;
  const ogImage = getOgImageUrl(vendor.coverImageUrl); // uniform OG build

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

        {/* canonical */}
        <link rel="canonical" href={ogUrl} />
      </Head>

      {/* Minimal body for crawlers; humans never see this page */}
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <h1>{vendor.shopName}</h1>
        <p>{vendor.description || "Redirecting…"}</p>
      </main>
    </>
  );
}
