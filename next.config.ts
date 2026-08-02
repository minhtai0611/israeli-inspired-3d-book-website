import type { NextConfig } from "next";

// Reasonable baseline hardening without a nonce-based CSP (which would require
// middleware to thread a per-request nonce into every inline script/style —
// out of scope for what this app actually needs). 'unsafe-inline' is required
// for the JSON-LD <script> tags in layout.tsx/sach/doc pages and Next's own
// inline hydration data; there is no user-controlled content reflected into
// those scripts, so the injection risk that CSP is meant to reduce here is low.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  // AudioCantillationBar plays PocketTorah recordings straight from GitHub's raw content
  // host (see getAudioCantillation() in src/lib/sefaria.ts) — without this, media-src falls
  // back to default-src 'self' and the browser silently refuses to load the <audio> src
  // (verified live 2026-08-02: play() rejected with NotSupportedError / "Media load
  // rejected by URL safety check" until this was added).
  "media-src 'self' https://raw.githubusercontent.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
