import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type Trend = "up" | "down" | "neutral";

/**
 * StatCard — KPI tile with icon, value, label and optional delta/trend.
 * Token-driven; used on dashboard and module overviews.
 */
export function StatCard({
  label,
  value,
  icon,
  hint,
  delta,
  trend = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  delta?: string;
  trend?: Trend;
  className?: string;
}) {
  const trendClass =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4 shadow-xs transition-shadow hover:shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary">
            {icon}
          </span>
        )}
        {delta && <span className={cn("text-xs font-medium", trendClass)}>{delta}</span>}
      </div>
      <div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground/80">{hint}</div>}
      </div>
    </Card>
  );
}
