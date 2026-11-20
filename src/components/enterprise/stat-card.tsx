import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useTilt } from "@/hooks/use-tilt";

type Tone = "primary" | "success" | "warning" | "destructive" | "info" | "neutral";

const toneClass: Record<Tone, string> = {
  primary: "bg-primary-subtle text-primary",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning-foreground",
  destructive: "bg-destructive-subtle text-destructive",
  info: "bg-info-subtle text-info",
  neutral: "bg-muted text-muted-foreground",
};

const valueTone: Partial<Record<Tone, string>> = {
  success: "text-success",
  destructive: "text-destructive",
};

/**
 * StatCard — KPI tile. Renders as a link when `to` is given. Use
 * `colorValue` to tint the number itself (e.g. negative balance in red).
 */
export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "primary",
  colorValue = false,
  to,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  colorValue?: boolean;
  to?: string;
  className?: string;
}) {
  const tilt = useTilt<HTMLElement>(to ? 7 : 5);
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span
            className={cn(
              "tilt-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-md [&_svg]:h-4 [&_svg]:w-4",
              toneClass[tone],
            )}
          >
            {icon}
          </span>
        )}
        <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div
        className={cn(
          "tilt-pop-sm mt-3 truncate text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl",
          colorValue && valueTone[tone],
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
    </>
  );
  const base = cn(
    "tilt-card block min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm",
    to && "transition-colors hover:border-primary/40",
    className,
  );
  return to ? (
    <Link to={to} className={base} {...tilt}>
      {body}
    </Link>
  ) : (
    <div className={base} {...tilt}>
      {body}
    </div>
  );
}
