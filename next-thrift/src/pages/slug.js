// pages/[slug].js
import Head from 'next/head'
import { initAdmin } from 'lib/firebaseAdmin'          //  your helper
import { Timestamp } from 'firebase-admin/firestore'   //  for toJSON()

// ───────── helpers ─────────
const toJSON = (v) => {
  if (v == null) return v
  if (v instanceof Timestamp) return v.toDate().toISOString()
  if (Array.isArray(v))       return v.map(toJSON)
  if (typeof v === 'object')  return Object.fromEntries(
    Object.entries(v).map(([k, x]) => [k, toJSON(x)])
  )
  return v
}

// very light crawler test (same list you used earlier)
const isBotUA = (ua = '') =>
  /(facebookexternalhit|Twitterbot|Slackbot|WhatsApp|SnapchatExternalHit)/i.test(
    ua
  )

// ───────── SSR ─────────
export async function getServerSideProps({ req, params }) {
  const slug = String(params?.slug || '').toLowerCase()
  if (!slug) return { notFound: true }

  // 1️⃣  Firestore lookup by slug
  const db = initAdmin()
  const snapQ = await db
    .collection('vendors')
    .where('slug', '==', slug)
    .limit(1)
    .get()

  if (snapQ.empty) return { notFound: true }
  const vendor = toJSON({ id: snapQ.docs[0].id, ...snapQ.docs[0].data() })

  // 2️⃣  Decide: redirect vs render OG
  const ua = req.headers['user-agent'] || ''
  const crawler = isBotUA(ua)
  const snapchatApp = /Snapchat(?!ExternalHit)/i.test(ua)

  // humans + Snapchat app → redirect
  if (!crawler || snapchatApp) {
    return {
      redirect: {
        destination: `https://shopmythrift.store/store/${vendor.id}`,
        permanent: false,   // 🟡 switch to true when you’re happy
      },
    }
  }

  // 3️⃣  Crawlers → give OG props
  return { props: { vendor } }
}

// ───────── Page component ─────────
// For crawlers we render just <head> with OG tags.
// For humans this page never shows because they were redirected.
export default function VendorOG({ vendor }) {
  if (!vendor) return null            // parachute (shouldn’t happen)

  const ogUrl   = `https://mx.shopmythrift.store/${vendor.slug}`
  const ogImage = vendor.coverImageUrl
    ? `https://ik.imagekit.io/your_path/tr:w-1200,h-630/${vendor.coverImageUrl}`
    : 'https://shopmythrift.store/default-og.jpg'

  return (
    <>
      <Head>
        <title>{vendor.shopName}</title>

        {/* ——— Open Graph ——— */}
        <meta property="og:type"        content="website"              />
        <meta property="og:title"       content={vendor.shopName}      />
        <meta property="og:description" content={vendor.description ??
                                                'Check out this vendor on My Thrift!'} />
        <meta property="og:url"         content={ogUrl}               />
        <meta property="og:image"       content={ogImage}             />
        <meta property="og:image:width"  content="1200"               />
        <meta property="og:image:height" content="630"                />

        {/* ——— Twitter ——— */}
        <meta name="twitter:card"        content="summary_large_image"/>
        <meta name="twitter:title"       content={vendor.shopName}    />
        <meta name="twitter:description" content={vendor.description ??
                                                 'Check out this vendor on My Thrift!'} />
        <meta name="twitter:image"       content={ogImage}            />

        {/* canonical for SEO */}
        <link rel="canonical" href={ogUrl} />
      </Head>

      {/* A tiny body so bots get valid HTML; humans never see it */}
      <main style={{padding:'2rem',textAlign:'center'}}>
        <h1>{vendor.shopName}</h1>
        <p>{vendor.description || 'Redirecting…'}</p>
      </main>
    </>
  )
}
