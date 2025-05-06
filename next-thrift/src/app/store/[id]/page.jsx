// app/store/[id]/page.jsx
import StorePage from './StorePage'
import { initAdmin } from 'lib/firebaseAdmin'

// Tell Next this route is dynamic so generateMetadata() runs on every request
export const dynamic = 'force-dynamic'

/**
 * Runs on the server for each request and produces the <head> tags
 * that social crawlers and link previews read.
 */
export async function generateMetadata ({ params }) {
  const { db } = initAdmin()                      // <-- Admin Firestore
  const snap = await db.collection('vendors').doc(params.id).get()

  if (!snap.exists) {
    return {
      title: 'Vendor Not Found',
      description: 'That shop doesn’t exist or isn’t published yet.',
    }
  }

  const vendor = snap.data()
  const title       = vendor.shopName
  const description = vendor.description || 'Check out this vendor on My Thrift!'
  const url         = `https://www.shopmythrift.store/store/${params.id}`
  const image       = vendor.coverImageUrl || '/default-thumbnail.png'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [{ url: image, width: 800, height: 600, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

/**
 * Hands the vendorId down to the client-only StorePage.jsx
 */
export default function Page ({ params }) {
  return <StorePage vendorId={params.id} />
}
