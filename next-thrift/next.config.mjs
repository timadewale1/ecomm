/** @type {import('next').NextConfig} */
import shareRouting from "./lib/shareRouting.cjs";

const nextConfig = {
  async redirects() {
    // Only the new public host gets the temporary homepage redirect. Keep the
    // existing renderer deployment and every product/vendor route intact.
    if (process.env.MYTHRIFT_REDIRECT_PUBLIC_HOME !== "true") return [];
    const origins = shareRouting.getOrigins();
    return ["shopmythrift.com", "www.shopmythrift.com"].map((host) => ({
      source: "/",
      has: [{ type: "host", value: host }],
      destination: `${origins.app}/`,
      permanent: false,
    }));
  },
};

export default nextConfig;
