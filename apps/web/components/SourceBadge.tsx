import type { Source } from "@/lib/markets";

/**
 * Provenance badge: FILED RECORD (a government record we have read, linked)
 * vs REPORTED (journalism, attributed to the named outlet). The visual
 * asymmetry is intentional — filed facts are solid ink, reported facts are
 * outlined — so the grade is legible before the label is read.
 */
export function SourceBadge({ source }: { source: Source }) {
  const label =
    source.kind === "filed" ? "FILED RECORD" : `REPORTED · ${source.name}`;
  const title =
    source.kind === "filed"
      ? `${source.name}${source.date ? `, ${source.date}` : ""}`
      : `${source.name}${source.date ? `, ${source.date}` : ""} — not yet traced to a filed record`;

  if (source.url) {
    return (
      <a
        className={`src-badge src-${source.kind}`}
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
      >
        {label}
      </a>
    );
  }
  return (
    <span className={`src-badge src-${source.kind}`} title={title}>
      {label}
    </span>
  );
}
