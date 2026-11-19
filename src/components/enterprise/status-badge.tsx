import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "info" | "destructive" | "primary";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning-foreground",
  info: "bg-info-subtle text-info",
  destructive: "bg-destructive-subtle text-destructive",
  primary: "bg-primary-subtle text-primary",
};

/**
 * StatusBadge — token-driven status pill with a consistent set of tones so
 * every module signals state (approved/pending/etc.) the same way.
 */
export function StatusBadge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />}
      {children}
    </span>
  );
}
