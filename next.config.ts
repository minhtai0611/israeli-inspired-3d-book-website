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
  // AudioCantillationBar's <audio> plays through /api/audio-cantillation/stream (same origin),
  // not raw.githubusercontent.com directly — that host serves every file with
  // `Content-Disposition: attachment`, which silently prevents browsers from ever playing it
  // as a media source regardless of CSP (verified live 2026-08-02). media-src falling back to
  // default-src 'self' is exactly right for the proxied same-origin src.
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
