import { MEASURES } from "@basin/contracts";
import type { ReservoirRef, Threshold } from "@/lib/reservoirs";
import type { Series } from "@/lib/rise";
import {
  acreFeet,
  feet,
  formatDate,
  percent,
  signed,
  sparklinePath,
} from "@/lib/format";

/** Vertical elevation gauge with operating thresholds drawn to scale. */
function ElevationGauge({
  current,
  reservoir,
}: {
  current: number;
  reservoir: ReservoirRef;
}) {
  const dead = reservoir.thresholds.find((t) => t.kind === "dead")!.elevation;
  const top = reservoir.fullPoolElevation;
  const span = top - dead;
  const pct = (e: number) => ((e - dead) / span) * 100;

  const W = 100;
  const H = 132;
  const y = (e: number) => H - (pct(e) / 100) * H;

  return (
    <div className="gauge">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`${reservoir.name} elevation ${current} feet against operating thresholds`}>
        <rect x="0" y="0" width={W} height={H} fill="var(--surface-2)" rx="2" />
        <rect
          x="0"
          y={y(current)}
          width={W}
          height={H - y(current)}
          fill="var(--water)"
          opacity="0.85"
          rx="2"
        />
        {reservoir.thresholds.map((t) => (
          <line
            key={t.elevation}
            x1="0"
            x2={W}
            y1={y(t.elevation)}
            y2={y(t.elevation)}
            stroke={
              t.kind === "dead"
                ? "var(--danger)"
                : t.kind === "power"
                  ? "var(--danger)"
                  : "var(--warn)"
            }
            strokeWidth="1"
            strokeDasharray={t.kind === "tier" ? "3 3" : undefined}
            opacity={t.kind === "power" ? 0.7 : 1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <line
          x1="0"
          x2={W}
          y1={y(current)}
          y2={y(current)}
          stroke="var(--text)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

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

  const spark = sparklinePath(storage.points.map((p) => p.value));

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

      <ElevationGauge current={elevation.latest.value} reservoir={reservoir} />

      {spark && (
        <div className="spark">
          <svg viewBox="0 0 240 40" preserveAspectRatio="none" role="img"
            aria-label={`${reservoir.name} storage over the past year`}>
            <path d={spark} fill="none" stroke="var(--water)" strokeWidth="1.5"
              vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="card-sub" style={{ marginTop: 2 }}>
            storage, past {Math.round(storage.points.length / 30)} months
          </div>
        </div>
      )}

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
