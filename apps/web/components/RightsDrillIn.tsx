"use client";

/**
 * Lazy gate for the point map: MapLibre + tiles load only when the reader
 * asks (mobile TTI gate, WATER_RIGHTS_DESIGN.md Phase 3).
 */
import dynamic from "next/dynamic";
import { useState } from "react";

const RightsPointsMap = dynamic(() => import("@/components/RightsPointsMap"), {
  ssr: false,
  loading: () => <div className="story-loading" style={{ height: 420 }}>Loading 333,459 rights…</div>,
});

export function RightsDrillIn() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className="drillin-btn" onClick={() => setOpen(true)}>
        Open the point map — every recorded right, zoomable ↗
      </button>
    );
  }
  return <RightsPointsMap />;
}
