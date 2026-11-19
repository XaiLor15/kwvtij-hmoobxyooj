import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * PageContainer — the standard page width/padding wrapper used across every
 * route so horizontal rhythm and max-width stay consistent (8pt spacing).
 */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8", className)}>
      {children}
    </div>
  );
}
