// src/middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const host = req.headers.get("host") || "";
  const apex = process.env.NEXT_PUBLIC_APEX_DOMAIN || "shopmythrift.store";

  // strip :3000 in dev
  const cleanHost = host.replace(/:\d+$/, "");

  // if subdomain like grace-enterprises.shopmythrift.store
  if (
    cleanHost.endsWith(apex) &&
    cleanHost !== apex &&
    !cleanHost.startsWith("www.")
  ) {
    const slug = cleanHost.slice(0, -(apex.length + 1)); // remove ".apex"
    // only rewrite root to the store page; leave assets/API alone
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = `/store/${slug}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}
