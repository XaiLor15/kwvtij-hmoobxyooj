import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Segmented filter control (chips). Scrolls horizontally on small screens. */
export function Segmented<V extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: ReactNode; count?: number }[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {o.label}
            {o.count != null && (
              <span
                className={cn(
                  "rounded px-1 text-[10px] tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-muted",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
