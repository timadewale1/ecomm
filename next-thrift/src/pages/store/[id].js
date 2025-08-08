// src/pages/store/[id].js
import Head from "next/head";
import dynamic from "next/dynamic";
import { initAdmin } from "lib/firebaseAdmin.js";
import { AuthProvider } from "@/custom-hooks/useAuth";
import { FavoritesProvider } from "@/components/context/FavoritesContext";
import { Timestamp } from "firebase-admin/firestore";
import { getOgImageUrl } from "lib/imageKit";

const StorePage = dynamic(() => import("../../app/store/StorePage"), {
  ssr: false,
});

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

async function getVendorByIdOrSlug(db, idOrSlug) {
  // 1) try as Firestore id
  const byId = await db.collection("vendors").doc(idOrSlug).get();
  if (byId.exists) return { id: byId.id, ...byId.data() };

  // 2) fall back to slug query
  const q = await db
    .collection("vendors")
    .where("slug", "==", (idOrSlug || "").toLowerCase())
    .limit(1)
    .get();

  if (!q.empty) {
    const doc = q.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
}

export async function getServerSideProps({ req, params }) {
  const ua = req.headers["user-agent"] || "";
  const host = (req.headers.host || "").replace(/:\d+$/, "");
  const apex = process.env.NEXT_PUBLIC_APEX_DOMAIN || "shopmythrift.store";

  // True link preview crawlers:
  const isBot =
    /(facebookexternalhit|Twitterbot|Slackbot|WhatsApp|SnapchatExternalHit)/i.test(
      ua
    );
  // Snapchat **app** (not the crawler)
  const isSnapchatApp = /Snapchat(?!ExternalHit)/i.test(ua);

  // params.id can be an id OR a slug (from subdomain rewrite)
  const candidate = (params?.id || "").toLowerCase();

  const db = initAdmin();
  const vendorRaw = await getVendorByIdOrSlug(db, candidate);
  if (!vendorRaw) return { notFound: true };
  const vendor = toJSON(vendorRaw);

  // Humans / Snapchat app → keep your SPA redirect to ID route
  if (!isBot || isSnapchatApp) {
    return {
      redirect: {
        destination: `https://shopmythrift.store/store/${vendor.id}?shared=true`,
        permanent: false,
      },
    };
  }

  // Bots → SSR OG tags with pretty URL
  const isSubdomainReq =
    host.endsWith(apex) && host !== apex && !host.startsWith("www.");

  const prettyUrl = isSubdomainReq
    ? `https://${host}` // e.g. grace-enterprises.shopmythrift.store
    : `https://${apex}/store/${vendor.slug || vendor.id}`;

  const ogImage = getOgImageUrl(vendor.coverImageUrl);

  return {
    props: {
      vendor: {
        ...vendor,
        __og: { prettyUrl, ogImage },
      },
    },
  };
}

export default function StoreSSR({ vendor }) {
  const title = vendor.shopName;
  const description =
    vendor.description || "Check out this vendor on My Thrift!";
  const url = vendor.__og.prettyUrl;
  const image = vendor.__og.ogImage;

  return (
    <>
      <Head>
        <title>{title}</title>

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={image} />
        <meta property="og:image:secure_url" content={image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />

        {/* Canonical */}
        <link rel="canonical" href={url} />
      </Head>

      <FavoritesProvider>
        <AuthProvider>
          <StorePage vendorId={vendor.id} />
        </AuthProvider>
      </FavoritesProvider>
    </>
  );
}
