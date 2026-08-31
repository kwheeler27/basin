import Link from "next/link";
import type { Route } from "next";
import { REFERENCES } from "@/lib/references";

/**
 * Inline citation: a superscript link into the bibliography. Anchors are
 * stable ids, not numbers, so adding entries never renumbers anything.
 */
export function Cite({ id }: { id: string }) {
  const r = REFERENCES.find((x) => x.id === id);
  if (!r) return null; // an unknown id renders nothing rather than a dead link
  return (
    <sup className="cite-sup">
      <Link href={`/references#${id}` as Route} title={r.cite}>
        [ref]
      </Link>
    </sup>
  );
}
