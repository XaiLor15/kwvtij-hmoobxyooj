import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ViewAllButton — consistent "ເບິ່ງທັງໝົດ" link used on dashboard section
 * headers. Ghost/secondary style with a right arrow that shifts on hover
 * for a subtle, enterprise-feel affordance.
 */
export function ViewAllButton({
  to,
  label = "ເບິ່ງທັງໝົດ",
  className,
}: {
  to: string;
  label?: string;
  className?: string;
}) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn(
        "group h-8 shrink-0 gap-1 rounded-md px-2.5 text-xs font-medium text-primary",
        "hover:bg-primary/10 hover:text-primary focus-visible:ring-1 focus-visible:ring-primary/40",
        className,
      )}
    >
      <Link to={to} aria-label={label}>
        <span>{label}</span>
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          strokeWidth={2.25}
          aria-hidden
        />
      </Link>
    </Button>
  );
}
