import { NextResponse } from "next/server";

export const config = { matcher: "/" }; // run only for root path

export function middleware(req) {
  const host = (req.headers.get("host") || "").replace(/:\d+$/, "");
  const apex = process.env.NEXT_PUBLIC_APEX_DOMAIN || "shopmythrift.store";

  const isVendor =
    host.endsWith(`.${apex}`) && host !== apex && !host.startsWith("www.");

  if (!isVendor) return NextResponse.next();

  const slug = host.replace(`.${apex}`, "");

  // rewrite root → /store/<slug>
  const url = req.nextUrl.clone();
  url.pathname = `/store/${slug}`;
  return NextResponse.rewrite(url);
}
