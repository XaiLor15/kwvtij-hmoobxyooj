import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/lib/auth-context";
import { LoadingState } from "./loading-state";

/**
 * Gate for pages whose data is private to signed-in members (RLS blocks
 * anonymous reads). Shows an explanatory panel instead of an empty page with
 * misleading zero totals.
 */
export function RequireAuth({ children, what }: { children: ReactNode; what: string }) {
  const { session, isAuthenticated } = usePermissions();
  if (!session.ready) return <LoadingState variant="cards" rows={3} />;
  if (isAuthenticated) return <>{children}</>;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-14 text-center shadow-xs">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
        <Lock className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <h2 className="text-base font-semibold">ສະເພາະສະມາຊິກທີ່ເຂົ້າລະບົບ</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {what} ເປັນຂໍ້ມູນພາຍໃນຂອງຕະກູນ. ກະລຸນາເຂົ້າລະບົບເພື່ອເບິ່ງ.
        </p>
      </div>
      <Button asChild>
        <Link to="/login">ເຂົ້າລະບົບ</Link>
      </Button>
    </div>
  );
}
