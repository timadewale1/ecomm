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

export async function getServerSideProps({ req, params }) {
  const slug = (params.id || "").toLowerCase(); // params.id is the slug from the subdomain
  const db = initAdmin();

  // Query Firestore for the vendor by slug
  const q = await db
    .collection("vendors")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (q.empty) {
    console.error("Vendor not found for slug:", slug);
    return { notFound: true };
  }
  const snap = q.docs[0];
  const vendor = toJSON({ id: snap.id, ...snap.data() });

  const ua = req.headers["user-agent"] || "";
  const isBot =
    /(facebookexternalhit|Twitterbot|Slackbot|WhatsApp|SnapchatExternalHit)/i.test(
      ua
    );
  const isSnapchatApp = /Snapchat(?!ExternalHit)/i.test(ua);

  // Humans (and Snapchat app) redirect to canonical URL with document ID
  if (!isBot || isSnapchatApp) {
    return {
      redirect: {
        destination: `https://shopmythrift.store/store/${vendor.id}?shared=true`,
        permanent: false,
      },
    };
  }

  // Crawlers get SSR with OG tags
  return { props: { vendor } };
}

export default function StoreSSR({ vendor }) {
  const title = vendor.shopName;
  const description =
    vendor.description || "Check out this vendor on My Thrift!";
  // Use the subdomain URL for OG tags since crawlers visit vendorname.shopmythrift.store
  const url = `https://${vendor.slug}.shopmythrift.store/`;
  const image = getOgImageUrl(vendor.coverImageUrl);

  return (
    <>
      <Head>
        <title>{title}</title>

        {/* Open Graph */}
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

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" key="tw:card" />
        <meta name="twitter:title" content={title} key="tw:title" />
        <meta name="twitter:description" content={description} key="tw:desc" />
        <meta name="twitter:image" content={image} key="tw:image" />
      </Head>

      <FavoritesProvider>
        <AuthProvider>
          <StorePage vendorId={vendor.id} />
        </AuthProvider>
      </FavoritesProvider>
    </>
  );
}
