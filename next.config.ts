import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false, devIndicators: false, output: "standalone",
  async rewrites() { return [{ source: "/api/v1/:path*", destination: `${process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000"}/api/v1/:path*` }]; },
};
export default config;
