import type { Source } from "@/lib/markets";

/**
 * Provenance badge: FILED RECORD (a government record we have read, linked)
 * vs REPORTED (journalism, attributed to the named outlet). The visual
 * asymmetry is intentional — filed facts are solid ink, reported facts are
 * outlined — so the grade is legible before the label is read.
 *
 * Hovering (or keyboard-focusing) the badge shows a source card pinned to
 * the bottom-right of the viewport: document type, source, date, and a
 * verbatim excerpt from the record. Hover-only devices get the card;
 * touch devices keep tap-to-open-the-record.
 */
export function SourceBadge({ source }: { source: Source }) {
  const label =
    source.kind === "filed" ? "FILED RECORD" : `REPORTED · ${source.name}`;

  const card = (
    <span className="src-card" aria-hidden="true">
      <span className="src-card-kicker">
        {source.docType ??
          (source.kind === "filed" ? "Government record" : "Press report")}
      </span>
      <span className="src-card-name">
        {source.name}
        {source.date && ` · ${source.date}`}
      </span>
      {source.excerpt && (
        <span className="src-card-excerpt">&ldquo;{source.excerpt}&rdquo;</span>
      )}
      {source.url && (
        <span className="src-card-url">
          {new URL(source.url).hostname.replace(/^www\./, "")} ↗
        </span>
      )}
      {!source.url && source.kind === "reported" && (
        <span className="src-card-url">not yet traced to a filed record</span>
      )}
    </span>
  );

  if (source.url) {
    return (
      <a
        className={`src-badge src-${source.kind}`}
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
        {card}
      </a>
    );
  }
  return (
    <span className={`src-badge src-${source.kind}`} tabIndex={0}>
      {label}
      {card}
    </span>
  );
}
