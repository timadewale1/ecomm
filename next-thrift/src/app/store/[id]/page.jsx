// app/store/[id]/page.jsx
import StorePage from "./StorePage";
import { db } from "@/firebase";                // your firebase.js export
import { doc, getDoc } from "firebase/firestore";

/** 
 * This runs on the server and injects all of your <head> tags 
 * so link-previews and crawlers pick them up. 
 */
export async function generateMetadata({ params }) {
  const { id } = params;
  const snap = await getDoc(doc(db, "vendors", id));

  if (!snap.exists()) {
    return {
      title: "Vendor Not Found",
      description: "That shop doesn’t exist (or isn’t published yet).",
    };
  }

  const vendor = { id: snap.id, ...snap.data() };
  const title = vendor.shopName;
  const description = vendor.description || "Check out this vendor on My Thrift!";
  const url = `https://www.shopmythrift.store/store/${vendor.id}`;
  const image = vendor.coverImageUrl || "/default-thumbnail.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [{ url: image, width: 800, height: 600, alt: title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/**
 * This server component only pulls out the `id` param
 * and hands it down to your client-only StorePage.jsx.
 */
export default function Page({ params }) {
  return <StorePage vendorId={params.id} />;
}
