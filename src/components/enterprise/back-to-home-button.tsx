import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * BackToHomeButton — always navigates to the app home (/dashboard) via the
 * TanStack Router, never `window.history.back`, so users don't land on an
 * arbitrary previous page (e.g. login). Ghost/outline styling keeps it
 * visible without competing with the page title.
 */
export function BackToHomeButton({
  to = "/dashboard",
  label = "ກັບຄືນ",
  variant = "ghost",
  className,
}: {
  to?: string;
  label?: string;
  variant?: "ghost" | "outline";
  className?: string;
}) {
  return (
    <Button
      asChild
      variant={variant}
      size="sm"
      className={cn(
        "group h-8 shrink-0 gap-1.5 rounded-md px-2 text-xs font-medium",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "focus-visible:ring-1 focus-visible:ring-primary/40",
        variant === "outline" && "border-border",
        className,
      )}
    >
      <Link to={to} aria-label={label}>
        <ArrowLeft
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
          strokeWidth={2.25}
          aria-hidden
        />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    </Button>
  );
}
