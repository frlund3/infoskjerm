import type { NextConfig } from "next";

const baseSecurityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
]

// Everything except /widget gets X-Frame-Options (no external framing).
const securityHeaders = [
  ...baseSecurityHeaders,
  { key: "X-Frame-Options", value: "SAMEORIGIN" }, // SAMEORIGIN (ikke DENY) — iframe i builder-preview
]

// /widget/* are public, non-sensitive display pages (weather, ticker) that must
// render inside the Xibo signage player/preview — which can run from varying
// origins (CMS domain, raw IP, Pi player webview). They hold no secrets, auth or
// user data, so we allow any ancestor to frame them (no X-Frame-Options, and an
// explicit permissive frame-ancestors so the global rule can't tighten them).
const widgetHeaders = [
  ...baseSecurityHeaders,
  { key: "Content-Security-Policy", value: "frame-ancestors *" },
]

const nextConfig: NextConfig = {
  // Keep the server-side PDF rasteriser (kundeavis pre-render) out of the bundle
  // so its pdfjs/canvas internals load natively at runtime instead of being
  // webpacked (which breaks them).
  serverExternalPackages: ["pdf-to-img", "pdfjs-dist", "@napi-rs/canvas"],
  async headers() {
    return [
      {
        // All paths except /widget — negative lookahead keeps X-Frame-Options off /widget.
        source: "/((?!widget).*)",
        headers: securityHeaders,
      },
      {
        source: "/widget/:path*",
        headers: widgetHeaders,
      },
    ]
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin",
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
