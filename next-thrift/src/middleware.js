import { NextResponse } from "next/server";

export const config = { matcher: ["/"] };

export default function middleware(req) {
  const host = (req.headers.get("host") || "").replace(/:\d+$/, "");
  const apex = process.env.NEXT_PUBLIC_APEX_DOMAIN || "shopmythrift.store";

  const isVendor =
    host.endsWith(`.${apex}`) && host !== apex && !host.startsWith("www.");

  if (!isVendor) return NextResponse.next();

  const slug = host.replace(`.${apex}`, "");
  const ua = req.headers.get("user-agent") || "";
  const isBot =
    /(facebookexternalhit|Twitterbot|Slackbot|WhatsApp|SnapchatExternalHit)/i.test(
      ua
    );

  if (isBot) {
    // Link-preview crawlers: rewrite internally so they reach /store/[id]
    const url = req.nextUrl.clone();
    url.pathname = `/store/${slug}`;
    return NextResponse.rewrite(url);
  }

  // Browsers: 308 redirect to canonical URL on the apex
  return NextResponse.redirect(`https://${apex}/store/${slug}`, 308);
}
