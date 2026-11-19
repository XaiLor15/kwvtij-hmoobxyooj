import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "../components/app-shell";
import { Toaster } from "../components/ui/sonner";
import { MediaLightboxProvider } from "../components/media-lightbox";
import { initData } from "../lib/init-data";
import { AuthProvider } from "../lib/permissions";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">ບໍ່ພົບໜ້ານີ້</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ໜ້າທີ່ທ່ານກຳລັງຊອກຫາ ບໍ່ມີຢູ່ ຫຼື ຖືກຍ້າຍໄປແລ້ວ.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            ກັບສູ່ໜ້າຫຼັກ
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          ບໍ່ສາມາດໂຫຼດໜ້ານີ້ໄດ້
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ມີບັນຫາເກີດຂຶ້ນ ກະລຸນາລອງໃໝ່ ຫຼື ກັບໄປໜ້າຫຼັກ.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            ລອງໃໝ່
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            ກັບໜ້າຫຼັກ
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ລະບົບຄຸ້ມຄອງຂໍ້ມູນສະມາຊິກ, ກິດຈະກຳ ແລະ ການເງິນຕະກູນ" },
      { property: "og:title", content: "ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { property: "og:description", content: "ລະບົບຄຸ້ມຄອງຂໍ້ມູນສະມາຊິກ, ກິດຈະກຳ ແລະ ການເງິນຕະກູນ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "twitter:description", content: "ລະບົບຄຸ້ມຄອງຂໍ້ມູນສະມາຊິກ, ກິດຈະກຳ ແລະ ການເງິນຕະກູນ" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a684e0ec-60a1-478f-8cfe-1cf34636171a/id-preview-4f970d52--0d362673-02de-4639-8ddb-0b2017b42fc2.lovable.app-1782660068586.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a684e0ec-60a1-478f-8cfe-1cf34636171a/id-preview-4f970d52--0d362673-02de-4639-8ddb-0b2017b42fc2.lovable.app-1782660068586.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="lo">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    initData();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MediaLightboxProvider>
        <AppShell>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </AppShell>
        </MediaLightboxProvider>
        <Toaster richColors position="top-right" />
        </AuthProvider>
    </QueryClientProvider>
  );
}
