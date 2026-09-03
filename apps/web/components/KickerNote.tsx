"use client";

/**
 * A stat-tile kicker that carries its number's provenance: hover (or tap)
 * the header and a card says where the number comes from, with citations.
 * Same interaction contract and card styling as the glossary Term component
 * (hover opens, tap toggles, Escape/outside/scroll closes) — but the content
 * is per-number source notes passed in by the page, not glossary entries.
 */

import { useEffect, useRef, useState } from "react";

interface CardPos {
  left: number;
  top: number;
  up: boolean;
}

const CARD_W = 340;

export function KickerNote({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<CardPos | null>(null);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPos(null);
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPos(null);
    };
    const onScroll = () => setPos(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pos]);

  const open = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const w = Math.min(CARD_W, vw - 24);
    const left = Math.min(Math.max(r.left, 12), vw - w - 12);
    const up = r.top > 230;
    setPos({ left, top: up ? r.top - 8 : r.bottom + 8, up });
  };

  return (
    <span className="term" ref={wrapRef} onMouseEnter={open} onMouseLeave={() => setPos(null)}>
      <button
        type="button"
        className="hs-kicker-btn"
        aria-expanded={pos !== null}
        aria-label={`${label} — where this number comes from`}
        onClick={() => (pos ? setPos(null) : open())}
      >
        {label}
      </button>
      {pos && (
        <span
          className="term-card wide"
          role="tooltip"
          style={{
            left: pos.left,
            top: pos.top,
            transform: pos.up ? "translateY(-100%)" : undefined,
          }}
        >
          <span className="term-card-label">Where this number comes from</span>
          <span className="term-card-def">{children}</span>
        </span>
      )}
    </span>
  );
}
