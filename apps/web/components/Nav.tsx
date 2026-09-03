"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

/**
 * The nav order is the user journey (docs/IA.md v2): what's happening →
 * why → let me look myself → audit the data.
 */
// IA v3 (docs/decisions/2026-09-03-ia-v3-report-consolidation.md): the
// Report tab is retired — chapters are reached from the landing's beats;
// "Current state" wears its journey name, Now.
const TABS: readonly { href: Route; label: string }[] = [
  { href: "/current-state", label: "Now" },
  { href: "/explore", label: "Explore" },
  { href: "/data", label: "Data" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      <div className="nav-tabs">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`nav-tab${
              pathname === t.href || pathname.startsWith(`${t.href}/`)
                ? " active"
                : ""
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
