import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * PageContainer — the standard page width/padding wrapper used across every
 * route. `page-enter` gives each page a staggered entrance (see styles.css);
 * it re-plays on navigation because each route mounts its own container.
 */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "page-enter mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
