// src/pages/store/[id].js
import Head from "next/head";
import { initAdmin } from "lib/firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";
import { getOgImageUrl } from "lib/imageKit";
import shareRouting from "lib/shareRouting.cjs";

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

export async function getServerSideProps({ req, res, params, resolvedUrl }) {
  shareRouting.prepareShareResponse(res);
  const ua = req.headers["user-agent"] || "";

  // 1️⃣ Only the true crawlers:
  const isBot = shareRouting.isPreviewCrawler(ua);

  // 2️⃣ But the **mobile** Snapchat app:
  const isSnapchatApp = /Snapchat(?!ExternalHit)/i.test(ua);

  // 3️⃣ Everyone else (normal browsers and the Snapchat app) → your React SPA:
  if (!isBot || isSnapchatApp) {
    return {
      redirect: {
        destination: shareRouting.appDestination("store", params.id, resolvedUrl),
        permanent: false,
      },
    };
  }

  // 4️⃣ True bots get the SSR meta + OG tags
  const db = initAdmin();
  const snap = await db.collection("vendors").doc(params.id).get();
  if (!snap.exists || !shareRouting.isPublicVendor(snap.data())) return { notFound: true };
  const vendor = toJSON(shareRouting.previewVendor(snap.id, snap.data()));
  return { props: { vendor, canonicalUrl: shareRouting.canonicalUrl("store", vendor) } };
}

export default function StoreSSR({ vendor, canonicalUrl }) {
  const title = vendor.shopName;
  const description =
    vendor.description || "Check out this vendor on My Thrift!";
  const url = canonicalUrl;

  // proxy + crop via your ImageKit endpoint
  const image = getOgImageUrl(vendor.coverImageUrl);

  return (
    <>
      <Head>
        <title>{title}</title>
        <link rel="canonical" href={url} />

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
        <meta property="og:image:width" content="1200" key="og:image:width" />
        <meta property="og:image:height" content="630" key="og:image:height" />

        {/* ——— Twitter ——— */}
        <meta name="twitter:card" content="summary_large_image" key="tw:card" />
        <meta name="twitter:title" content={title} key="tw:title" />
        <meta name="twitter:description" content={description} key="tw:desc" />
        <meta name="twitter:image" content={image} key="tw:image" />
      </Head>

      {/* Humans already redirect to the SPA. Crawlers need only this public
          preview, not a second client storefront reading private profiles. */}
      <main>
        <h1>{title}</h1>
        <p>{description}</p>
      </main>
    </>
  );
}
