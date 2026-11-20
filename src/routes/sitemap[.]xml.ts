import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Public pages only (finance/fund pages require login).
const PATHS = ["/dashboard", "/members", "/leadership", "/elders", "/activities", "/news"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Absolute URLs are required by the sitemap spec. Prefer the configured
        // public URL (behind Railway's proxy the request host may be internal).
        const base = (process.env.PUBLIC_SITE_URL || new URL(request.url).origin).replace(
          /\/$/,
          "",
        );
        const urls = PATHS.map(
          (p) => `  <url><loc>${base}${p}</loc><changefreq>weekly</changefreq></url>`,
        ).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
