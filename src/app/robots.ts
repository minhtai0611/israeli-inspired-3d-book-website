import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { generateSitemaps } from "./sitemap";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // `generateSitemaps` splits the catalog into /sitemap/0.xml, /sitemap/1.xml,
  // etc. — there is no single /sitemap.xml once it's used (verified against
  // a local build), so every chunk must be listed here directly. The
  // sitemap protocol supports multiple `Sitemap:` directives, so this is
  // standards-compliant, not a workaround.
  const ids = await generateSitemaps();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: ids.map(({ id }) => `${SITE_URL}/sitemap/${id}.xml`),
    host: SITE_URL,
  };
}
