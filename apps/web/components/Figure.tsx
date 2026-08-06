import type { Sourced } from "@/lib/system";
import { acreFeet } from "@/lib/format";

const CLASS_LABEL: Record<string, string> = {
  observed: "observed",
  estimated: "estimated",
  reconstructed: "reconstructed",
  administrative: "legal",
  forecast: "forecast",
};

/**
 * A number with its epistemic class and provenance attached.
 *
 * Per docs/DESIGN_PRINCIPLES.md, `administrative` values are legal
 * instruments rather than measurements and are styled distinctly so they
 * cannot be read as observations.
 */
export function Figure({
  fact,
  size = "md",
}: {
  fact: Sourced;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className={`figure figure-${size} epi-${fact.epistemic}`}>
      <div className="figure-head">
        <span className="figure-label">{fact.label}</span>
        <span className={`chip chip-${fact.epistemic}`}>
          {CLASS_LABEL[fact.epistemic] ?? fact.epistemic}
        </span>
        {fact.confidence !== "high" && (
          <span className="chip chip-conf">{fact.confidence} confidence</span>
        )}
      </div>
      <div className="figure-value">{acreFeet(fact.acreFeet)}</div>
      {fact.note && <p className="figure-note">{fact.note}</p>}
      <div className="figure-prov">
        {fact.source} · {fact.period}
      </div>
    </div>
  );
}
