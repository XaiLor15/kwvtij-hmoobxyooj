import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Liveness probe for Railway / Docker. Never exposes configuration values.
export const Route = createFileRoute("/healthz")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            ok: true,
            supabaseConfigured: Boolean(
              (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
              (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
            ),
          },
          { headers: { "Cache-Control": "no-store" } },
        ),
    },
  },
});
