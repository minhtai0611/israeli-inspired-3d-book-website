// Single source of truth for the deployed site origin. Every canonical URL,
// robots/sitemap entry, and JSON-LD `url` field must derive from this instead
// of hardcoding a domain — the production host is a Vercel URL today, not a
// custom domain, and that can change without every reference being hunted down.
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
