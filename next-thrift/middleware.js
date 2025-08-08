// middleware.js   ← at the repo root
import { NextResponse } from "next/server";

export const config = { matcher: ["/"] }; // run only on the root path

export function middleware(req) {
  // ← named export, not default
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
    const url = req.nextUrl.clone();
    url.pathname = `/store/${slug}`;
    return NextResponse.rewrite(url); // crawlers stay
  }

  return NextResponse.redirect(
    // browsers redirect
    `https://${apex}/store/${slug}`,
    308
  );
}
