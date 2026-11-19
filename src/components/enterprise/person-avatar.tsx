import { initialsOf } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

const TONES = [
  "bg-primary-subtle text-primary",
  "bg-success-subtle text-success",
  "bg-info-subtle text-info",
  "bg-warning-subtle text-warning-foreground",
];

/** Photo if available, otherwise initials on a stable tone derived from the id. */
export function PersonAvatar({
  name,
  photo,
  id = 0,
  size = "md",
  muted = false,
  className,
}: {
  name: string;
  photo?: string | null;
  id?: number;
  size?: "sm" | "md" | "lg" | "xl";
  muted?: boolean;
  className?: string;
}) {
  const dim =
    size === "sm"
      ? "h-8 w-8 text-[11px]"
      : size === "lg"
        ? "h-12 w-12 text-sm"
        : size === "xl"
          ? "h-16 w-16 text-lg"
          : "h-10 w-10 text-xs";
  const tone = muted ? "bg-muted text-muted-foreground" : TONES[Math.abs(id) % TONES.length];
  return photo ? (
    <img
      src={photo}
      alt={name}
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 rounded-full object-cover", dim, muted && "grayscale", className)}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        dim,
        tone,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
