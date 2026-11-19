import type { FormEvent, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * FormDialog — the single modal pattern for every create/edit form:
 * sticky header + scrollable body + sticky footer, full-height on phones,
 * submit button with a pending state, and an inline error banner.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  onSubmit,
  submitLabel = "ບັນທຶກ",
  cancelLabel = "ຍົກເລີກ",
  pending = false,
  error,
  size = "md",
  footerExtra,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  error?: string | null;
  size?: "sm" | "md" | "lg";
  footerExtra?: ReactNode;
}) {
  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!pending) onSubmit();
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent
        className={cn(
          "flex max-h-[100dvh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[90vh]",
          "h-[100dvh] max-w-full rounded-none sm:h-auto sm:rounded-xl",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
        )}
      >
        <form onSubmit={handle} className="flex min-h-0 flex-1 flex-col" noValidate>
          <DialogHeader className="border-b border-border px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2 pr-6 text-base">
              {icon && <span className="text-primary">{icon}</span>}
              {title}
            </DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive-subtle px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            {children}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-3 sm:flex-row sm:items-center sm:justify-end">
            {footerExtra && <div className="sm:mr-auto">{footerExtra}</div>}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
