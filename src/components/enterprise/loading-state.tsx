import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * LoadingState — skeleton placeholders shown while data is loading, keeping
 * layout stable and avoiding spinner "jank". Variants cover common shapes.
 */
export function LoadingState({
  variant = "list",
  rows = 5,
  className,
  label = "ກຳລັງໂຫຼດ...",
}: {
  variant?: "list" | "cards" | "table";
  rows?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("w-full", className)} role="status" aria-busy="true" aria-label={label}>
      {variant === "cards" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-border p-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {variant === "list" && (
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {variant === "table" && (
        <div className="overflow-hidden rounded-lg border border-border">
          <Skeleton className="h-10 w-full rounded-none" />
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none border-t border-border" />
          ))}
        </div>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}
