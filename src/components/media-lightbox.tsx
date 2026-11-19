import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type MediaItem = { type: "image" | "video"; src: string; alt?: string };

type Ctx = { open: (item: MediaItem) => void };
const MediaLightboxCtx = createContext<Ctx | null>(null);

export function useMediaLightbox() {
  const ctx = useContext(MediaLightboxCtx);
  if (!ctx) throw new Error("useMediaLightbox must be used within MediaLightboxProvider");
  return ctx;
}

export function MediaLightboxProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const open = useCallback((m: MediaItem) => setItem(m), []);
  const close = useCallback(() => setItem(null), []);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [item, close]);

  return (
    <MediaLightboxCtx.Provider value={{ open }}>
      {children}
      {item && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2 sm:p-6 animate-in fade-in-0"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-3 right-3 z-10 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 backdrop-blur-sm transition-colors"
            aria-label="ປິດ"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative max-h-full max-w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {item.type === "image" ? (
              <img
                src={item.src}
                alt={item.alt ?? ""}
                className="max-h-[92vh] max-w-[96vw] object-contain rounded-md shadow-2xl"
              />
            ) : (
              <video
                src={item.src}
                controls
                autoPlay
                playsInline
                controlsList="nodownload"
                className="max-h-[92vh] max-w-[96vw] rounded-md shadow-2xl bg-black"
              />
            )}
          </div>
        </div>
      )}
    </MediaLightboxCtx.Provider>
  );
}

/** Convenience: an <img> that opens the lightbox when clicked. */
export function ZoomableImage({
  src,
  alt,
  className,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { open } = useMediaLightbox();
  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      className={(className ?? "") + " cursor-zoom-in"}
      onClick={(e) => {
        e.stopPropagation();
        if (src) open({ type: "image", src: String(src), alt });
      }}
    />
  );
}

/** Convenience: a video thumbnail with a play overlay that opens fullscreen player. */
export function ZoomableVideo({
  src,
  className,
  poster,
}: {
  src: string;
  className?: string;
  poster?: string;
}) {
  const { open } = useMediaLightbox();
  return (
    <button
      type="button"
      onClick={() => open({ type: "video", src })}
      className={"group relative block w-full overflow-hidden bg-black " + (className ?? "")}
      aria-label="ຫຼິ້ນວິດີໂອ"
    >
      <video
        src={src}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        className="w-full h-full object-cover pointer-events-none"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black shadow-lg group-hover:scale-105 transition-transform">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 ml-0.5">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
