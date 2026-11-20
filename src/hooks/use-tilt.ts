import { useCallback, type PointerEvent } from "react";

/**
 * Pointer-driven 3D tilt for `.tilt-card` elements. Writes CSS variables only
 * (no React state → no re-renders). The visual effect is defined in
 * styles.css and is active only for fine pointers without reduced motion.
 */
export function useTilt<T extends HTMLElement>(maxDeg = 6) {
  const onPointerMove = useCallback(
    (e: PointerEvent<T>) => {
      if (e.pointerType !== "mouse") return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width; // 0..1
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--tilt-x", `${((0.5 - py) * maxDeg).toFixed(2)}deg`);
      el.style.setProperty("--tilt-y", `${((px - 0.5) * maxDeg).toFixed(2)}deg`);
      el.style.setProperty("--tilt-mx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--tilt-my", `${(py * 100).toFixed(1)}%`);
      el.dataset.tilting = "true";
    },
    [maxDeg],
  );
  const onPointerLeave = useCallback((e: PointerEvent<T>) => {
    const el = e.currentTarget;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
    el.dataset.tilting = "false";
  }, []);
  return { onPointerMove, onPointerLeave };
}
