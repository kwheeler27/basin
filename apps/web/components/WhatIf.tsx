"use client";

/**
 * What happens next? — the twin's first interactive projection.
 *
 * One slider (additional Lower Basin conservation, 0-3 MAF/yr) selects a
 * precomputed scenario from the response surface (13 cuts x 21 historical
 * inflow sequences x 5 years) baked by packages/model — the browser never
 * runs the model, so the slider is instant and the canonical model stays in
 * Python with its tests.
 *
 * Two small multiples on ELEVATION axes, because that's where the law lives:
 * Mead's tier lines and Powell's balancing/power thresholds are drawn, and
 * the headline states when the median trajectory crosses them. MODELED,
 * badged as such, assumptions expandable.
 */

import { useEffect, useMemo, useState } from "react";

interface YearQ {
  wy: number;
  powellElev: [number, number, number];
  meadElev: [number, number, number];
  meadAf: [number, number, number];
}
interface Scenario {
  cutMaf: number;
  years: YearQ[];
  crossings: { res: string; elev: number; label: string; wy: number }[];
}
interface Surface {
  source: string;
  modelVersion: string;
  rulebook: string;
  baked: string;
  assumptions: string[];
  startWy: number;
  traceCount: number;
  histMonths: string[];
  histPowellElev: (number | null)[];
  histMeadElev: (number | null)[];
  surface: Scenario[];
}

const W = 440;
const H = 240;
const M = { t: 18, r: 74, b: 24, l: 40 };

const MEAD_LINES = [
  { elev: 1075, label: "Tier 1 · 1,075" },
  { elev: 1050, label: "Tier 2 · 1,050" },
  { elev: 1025, label: "Tier 3 · 1,025" },
  { elev: 950, label: "power pool · 950" },
];
const POWELL_LINES = [
  { elev: 3525, label: "balancing · 3,525" },
  { elev: 3490, label: "power pool · 3,490" },
];

function Panel({
  title,
  hist,
  months,
  years,
  q,
  domain,
  refs,
}: {
  title: string;
  hist: (number | null)[];
  months: string[];
  years: YearQ[];
  q: (y: YearQ) => [number, number, number];
  domain: [number, number];
  refs: { elev: number; label: string }[];
}) {
  const histN = hist.length;
  const projN = years.length;
  const total = histN + projN * 12; // month-scale x for continuity
  const x = (i: number) => M.l + (i / (total - 1)) * (W - M.l - M.r);
  const y = (e: number) =>
    H - M.b - ((e - domain[0]) / (domain[1] - domain[0])) * (H - M.t - M.b);

  const histPath = useMemo(() => {
    let d = "";
    let pen = false;
    hist.forEach((v, i) => {
      if (v === null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  }, [hist, domain]);

  const px = (yi: number) => x(histN - 1 + (yi + 1) * 12);
  const lastHist = [...hist].reverse().find((v) => v !== null) ?? domain[0];
  const medPath =
    `M${x(histN - 1).toFixed(1)},${y(lastHist).toFixed(1)} ` +
    years.map((yy, yi) => `L${px(yi).toFixed(1)},${y(q(yy)[1]).toFixed(1)}`).join(" ");
  const band =
    `M${x(histN - 1).toFixed(1)},${y(lastHist).toFixed(1)} ` +
    years.map((yy, yi) => `L${px(yi).toFixed(1)},${y(q(yy)[2]).toFixed(1)}`).join(" ") +
    " " +
    [...years].reverse().map((yy) => {
      const yi = years.indexOf(yy);
      return `L${px(yi).toFixed(1)},${y(q(yy)[0]).toFixed(1)}`;
    }).join(" ") +
    ` L${x(histN - 1).toFixed(1)},${y(lastHist).toFixed(1)} Z`;

  const yearTicks = months
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.endsWith("-01") && Number(m.slice(0, 4)) % 2 === 1);

  return (
    <div className="wi-panel">
      <div className="wi-title">{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: history and projected range`}>
        {refs.map((r) => (
          <g key={r.elev}>
            <line x1={M.l} x2={W - M.r} y1={y(r.elev)} y2={y(r.elev)} className="wi-ref" />
            <text x={W - M.r + 4} y={y(r.elev) + 3} className="wi-ref-label">{r.label}</text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 6} className="cc-tick unit" style={{ textAnchor: "start" }}>
          elevation, ft
        </text>
        {[domain[0], (domain[0] + domain[1]) / 2].map((e) => (
          <text key={e} x={M.l - 4} y={y(e) + 3} className="cc-tick" style={{ textAnchor: "end" }}>
            {Math.round(e).toLocaleString()}
          </text>
        ))}
        {yearTicks.map(({ m, i }) => (
          <text key={m} x={x(i)} y={H - 7} className="cc-tick x">{m.slice(2, 4)}</text>
        ))}
        {years.map((yy, yi) => (
          <text key={yy.wy} x={px(yi)} y={H - 7} className="cc-tick x proj">{String(yy.wy).slice(2)}</text>
        ))}
        <line x1={x(histN - 1)} x2={x(histN - 1)} y1={M.t} y2={H - M.b} className="wi-now" />
        <path d={band} className="wi-band" />
        <path d={histPath} className="wi-hist" />
        <path d={medPath} className="wi-med" />
        <text x={x(histN - 1) - 4} y={M.t + 9} className="wi-nowlabel">history</text>
        <text x={x(histN - 1) + 6} y={M.t + 9} className="wi-nowlabel proj">projected</text>
      </svg>
    </div>
  );
}

export function WhatIf() {
  const [surface, setSurface] = useState<Surface | null>(null);
  const [ci, setCi] = useState(0);
  const [showAssumptions, setShowAssumptions] = useState(false);

  useEffect(() => {
    fetch("/geo/whatif_surface.json").then((r) => r.json()).then(setSurface);
  }, []);

  if (!surface) return <div className="drawdown loading">Loading the model surface…</div>;

  const sc = surface.surface[ci]!;
  const meadCross = sc.crossings.filter((c) => c.res === "mead");
  const headline =
    meadCross.length === 0
      ? "the median trajectory crosses no new shortage tier within five years."
      : "the median trajectory crosses " +
        meadCross.map((c) => `${c.label} (${c.elev.toLocaleString()} ft) in WY${c.wy}`).join(", then ") +
        ".";

  return (
    <section className="whatif">
      <div className="wi-head">
        <div>
          <h3 className="wi-hed">
            Cut Lower Basin use by{" "}
            <strong>{sc.cutMaf.toFixed(2)} MAF</strong> per year —{" "}
            {headline}
          </h3>
        </div>
        <span className="clock-badge clock-model">MODELED · {surface.rulebook}</span>
      </div>

      <input
        className="wi-slider"
        type="range"
        min={0}
        max={surface.surface.length - 1}
        value={ci}
        aria-label="Additional Lower Basin conservation, million acre-feet per year"
        onChange={(e) => setCi(Number(e.currentTarget.value))}
      />
      <div className="wi-slider-row">
        <span>no extra conservation</span>
        <span>−3.0 MAF/yr (the scale of proposals on the table)</span>
      </div>

      <div className="wi-grid">
        <Panel
          title="Lake Powell"
          hist={surface.histPowellElev}
          months={surface.histMonths}
          years={sc.years}
          q={(yy) => yy.powellElev}
          domain={[3440, 3720]}
          refs={POWELL_LINES}
        />
        <Panel
          title="Lake Mead"
          hist={surface.histMeadElev}
          months={surface.histMonths}
          years={sc.years}
          q={(yy) => yy.meadElev}
          domain={[930, 1240]}
          refs={MEAD_LINES}
        />
      </div>

      <div className="wi-foot">
        <button
          className="wi-assume-toggle"
          aria-expanded={showAssumptions}
          onClick={() => setShowAssumptions(!showAssumptions)}
        >
          {showAssumptions ? "▾" : "▸"} model assumptions & validation
        </button>
        {showAssumptions && (
          <ul className="wi-assumptions">
            {surface.assumptions.map((a) => <li key={a}>{a}</li>)}
            <li>
              Bands are the 10th–90th percentile across {surface.traceCount} rolling
              historical inflow sequences (2001–2025) — the range of recent hydrology,
              not a forecast of it.
            </li>
          </ul>
        )}
        <div className="chain-caveat" style={{ marginTop: 8 }}>
          {surface.source} Baked {surface.baked}. Reduced-form and independent —
          compare with Reclamation&rsquo;s official{" "}
          <a href="https://www.usbr.gov/lc/region/g4000/riverops/24ms-projections.html">
            24-Month Study
          </a>.
        </div>
      </div>
    </section>
  );
}
