"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

/**
 * The nav order is the user journey (docs/IA.md v2): what's happening →
 * why → let me look myself → audit the data.
 */
const TABS: readonly { href: Route; label: string }[] = [
  { href: "/current-state", label: "Current state" },
  { href: "/report", label: "Report" },
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
