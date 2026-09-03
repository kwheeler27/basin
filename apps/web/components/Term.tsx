"use client";

/**
 * A term of art in running prose, wearing its definition: dotted underline,
 * hover shows a plain-language card (tap toggles it on touch), Escape or an
 * outside tap closes. Definitions come from lib/glossary.ts — the single
 * teaching layer (DESIGN_PRINCIPLES §11); this component never carries its
 * own wording. Cards link to /glossary for the full list.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { GLOSSARY } from "@/lib/glossary";

interface CardPos {
  left: number;
  top: number;
  up: boolean;
}

const CARD_W = 290;

export function Term({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<CardPos | null>(null);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const term = GLOSSARY[id];

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPos(null);
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPos(null);
    };
    const onScroll = () => setPos(null); // fixed-position card would drift
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pos]);

  if (!term) return <>{children}</>;

  const open = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const w = Math.min(CARD_W, vw - 24);
    const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, 12), vw - w - 12);
    const up = r.top > 190;
    setPos({ left, top: up ? r.top - 8 : r.bottom + 8, up });
  };

  return (
    <span className="term" ref={wrapRef} onMouseEnter={open} onMouseLeave={() => setPos(null)}>
      <button
        type="button"
        className="term-trigger"
        aria-expanded={pos !== null}
        onClick={() => (pos ? setPos(null) : open())}
      >
        {children}
      </button>
      {pos && (
        <span
          className="term-card"
          role="tooltip"
          style={{
            left: pos.left,
            top: pos.top,
            transform: pos.up ? "translateY(-100%)" : undefined,
          }}
        >
          <span className="term-card-label">{term.label}</span>
          <span className="term-card-def">{term.short}</span>
          <Link href={"/glossary" as Route} className="term-card-more">
            Full glossary →
          </Link>
        </span>
      )}
    </span>
  );
}
