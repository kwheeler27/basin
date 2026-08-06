"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

const TABS: readonly { href: Route; label: string }[] = [
  { href: "/", label: "Overview" },
  { href: "/supply", label: "Supply" },
  { href: "/demand", label: "Demand" },
  { href: "/reservoirs", label: "Reservoirs" },
  { href: "/distribution", label: "Distribution" },
  { href: "/water-rights", label: "Water Rights" },
  { href: "/data", label: "Data" },
];

/** Stages not yet built, shown so the shape of the product is legible. */
const PLANNED = ["Infrastructure", "Agriculture"] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      <div className="nav-tabs">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`nav-tab${pathname === t.href ? " active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
        <span className="nav-divider" />
        {PLANNED.map((p) => (
          <span key={p} className="nav-tab planned" title="Not built yet">
            {p}
          </span>
        ))}
      </div>
    </nav>
  );
}
