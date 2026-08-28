"use client";

/**
 * Measure a container's rendered width so charts can draw at TRUE pixel
 * size instead of scaling a fixed viewBox down — the fixed-920 pattern
 * turns mobile charts into postage stamps (4px fonts, hairline strokes).
 * Returns 0 until first measure; render a placeholder until then.
 */

import { useEffect, useRef, useState } from "react";

export function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}
