import { MEASURES } from "@basin/contracts";
import { ElevationSeries } from "@/components/ElevationSeries";
import type { ReservoirRef, Threshold } from "@/lib/reservoirs";
import type { Series } from "@/lib/rise";
import {
  acreFeet,
  feet,
  formatDate,
  percent,
  signed,
} from "@/lib/format";

function ThresholdRow({
  threshold,
  current,
}: {
  threshold: Threshold;
  current: number;
}) {
  const gap = current - threshold.elevation;
  const below = gap < 0;
  return (
    <div className="threshold" title={threshold.note}>
      <span className={`threshold-dot dot-${threshold.kind}`} />
      <span>{threshold.short}</span>
      {threshold.confidence === "medium" && (
        <span className="badge badge-med" title="Not confirmed in a primary Reclamation document">
          med. confidence
        </span>
      )}
      <span className="threshold-gap">
        {below ? "passed" : `${Math.round(gap).toLocaleString()} ft above`}
      </span>
    </div>
  );
}

export function ReservoirCard({
  reservoir,
  elevation,
  storage,
}: {
  reservoir: ReservoirRef;
  elevation: Series;
  storage: Series;
}) {
  const elevMeasure = MEASURES[reservoir.elevationMeasureId as keyof typeof MEASURES];
  const storMeasure = MEASURES[reservoir.storageMeasureId as keyof typeof MEASURES];

  if (!elevation.latest || !storage.latest) {
    return (
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">{reservoir.name}</h2>
          <span className="card-sub">{reservoir.dam}</span>
        </div>
        <p className="err">
          Live data unavailable{elevation.error ? `: ${elevation.error}` : "."} Showing
          no value rather than a stale or assumed one.
        </p>
      </section>
    );
  }

  const pctFull = (storage.latest.value / reservoir.capacityAcreFeet) * 100;
  const storageDelta = storage.yearAgo
    ? storage.latest.value - storage.yearAgo.value
    : null;
  const elevDelta = elevation.yearAgo
    ? elevation.latest.value - elevation.yearAgo.value
    : null;

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">{reservoir.name}</h2>
        <span className="card-sub">{reservoir.dam}</span>
      </div>

      <div className="readout">
        <div className="readout-item">
          <div className="readout-label">Elevation</div>
          <div className="readout-value">{feet(elevation.latest.value)}</div>
          {elevDelta !== null && (
            <div className={`readout-delta ${elevDelta < 0 ? "down" : "up"}`}>
              {signed(elevDelta, (n) => `${n.toFixed(1)} ft`)} in 1 yr
            </div>
          )}
        </div>
        <div className="readout-item">
          <div className="readout-label">Storage</div>
          <div className="readout-value">{acreFeet(storage.latest.value)}</div>
          {storageDelta !== null && (
            <div className={`readout-delta ${storageDelta < 0 ? "down" : "up"}`}>
              {signed(storageDelta, acreFeet)} in 1 yr
            </div>
          )}
        </div>
        <div className="readout-item">
          <div className="readout-label">Percent full</div>
          <div className="readout-value">{percent(pctFull, 1)}</div>
          <div className="readout-delta" style={{ color: "var(--faint)" }}>
            of {acreFeet(reservoir.capacityAcreFeet)}
          </div>
        </div>
      </div>

      <ElevationSeries
        name={reservoir.name}
        points={elevation.points}
        thresholds={reservoir.thresholds.map((t) => ({
          elevation: t.elevation,
          short: t.short,
          kind: t.kind,
        }))}
      />

      <div className="thresholds">
        {reservoir.thresholds.map((t) => (
          <ThresholdRow key={t.elevation} threshold={t} current={elevation.latest!.value} />
        ))}
      </div>

      <div className="prov">
        <div className="prov-row">
          <span className="badge badge-prov">provisional</span>
          {(elevation.hasRevisions || storage.hasRevisions) && (
            <span className="badge" title="Upstream values in this window carry revision stamps">
              revised upstream
            </span>
          )}
          <span>as of {formatDate(elevation.latest.date)}</span>
        </div>
        <div style={{ marginTop: 4 }}>
          {elevMeasure?.provenance.agency} {elevMeasure?.provenance.system} · items{" "}
          {reservoir.riseElevationItem}, {reservoir.riseStorageItem} ·{" "}
          {storMeasure?.accountingConcept} / {storMeasure?.measurementClass}
        </div>
        <div style={{ marginTop: 4 }}>
          Percent full uses {reservoir.capacityBasis}; sedimentation shifts the real
          area-capacity curve and re-surveys disagree.
        </div>
      </div>
    </section>
  );
}
