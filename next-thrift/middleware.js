import { NextResponse } from "next/server";

export const config = { matcher: ["/"] };

export function middleware(req) {
  const host = (req.headers.get("host") || "").replace(/:\d+$/, "");
  const apex = process.env.NEXT_PUBLIC_APEX_DOMAIN || "shopmythrift.store";

  const isVendor =
    host.endsWith(`.${apex}`) && host !== apex && !host.startsWith("www.");

  if (!isVendor) return NextResponse.next();

  const slug = host.replace(`.${apex}`, "");

  // Always rewrite root → /store/<slug> (no external redirect)
  const url = req.nextUrl.clone();
  url.pathname = `/store/${slug}`;
  return NextResponse.rewrite(url);
}
