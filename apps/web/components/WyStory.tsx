"use client";

/**
 * WY2026, told as an event-annotated data spine — Basin's first temporal
 * narrative. A sticky stage draws one of three charts (Powell elevation,
 * cumulative inflow, Flaming Gorge storage), revealed only up to the
 * active beat's date, with the season's decisions pinned to the line
 * they bent. Scroll drives the beats; every fact is from the record.
 */

import { useEffect, useRef, useState } from "react";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

const MAF = 1_000_000;

export interface DayPoint {
  readonly date: string;
  readonly value: number;
}

interface Props {
  readonly powellElev: readonly DayPoint[];
  readonly inflow: readonly DayPoint[];
  readonly fgStorage: readonly DayPoint[];
}

type StageKind = "elev" | "inflow" | "fg";

const EVENTS: { date: string; label: string }[] = [
  { date: "2025-10-01", label: "release set: 7.48" },
  { date: "2025-12-15", label: "releases reshaped" },
  { date: "2026-04-01", label: "snowpack 27%" },
  { date: "2026-04-17", label: "cut to 6.00" },
  { date: "2026-08-21", label: "ROD signed" },
];

const BEATS: {
  kicker: string;
  hed: string;
  body: string;
  stage: StageKind;
  reveal: string; // draw data up to this date
}[] = [
  {
    kicker: "October 1, 2025",
    hed: "The year opens by the book.",
    body:
      "Lake Powell starts Water Year 2026 near 3,551 feet. Under the 2007 rules, the August projection set the Mid-Elevation Release Tier: 7.48 million acre-feet to be released downstream over the year. Routine, on paper.",
    stage: "elev",
    reveal: "2025-11-01",
  },
  {
    kicker: "November – December",
    hed: "The snow doesn't come.",
    body:
      "This line is the water actually arriving above Lake Powell, added up day by day. By midwinter it is tracking far below the pace that would reach the recent-era mean (the dashed line). Storage is the lagging indicator; this is the leading one.",
    stage: "inflow",
    reveal: "2026-01-15",
  },
  {
    kicker: "December 2025",
    hed: "The first flinch.",
    body:
      "Reclamation quietly reshapes the winter release schedule — 0.598 million acre-feet held back between December and April to defend elevation 3,525. The annual number still says 7.48; the monthly numbers no longer do.",
    stage: "elev",
    reveal: "2026-01-15",
  },
  {
    kicker: "Spring 2026",
    hed: "Runoff season fails.",
    body:
      "April 1 snowpack reads 27% of median across the Upper Colorado's SNOTEL stations — the date that usually marks the peak. The runoff that follows is the driest of the era; the water year will finish around 40% of the recent-era mean.",
    stage: "inflow",
    reveal: "2026-04-16",
  },
  {
    kicker: "April 17, 2026",
    hed: "The rules bend.",
    body:
      "With projections crossing 3,500 feet, the Interior Department invokes its drought authority and cuts the annual release from 7.48 to 6.00 million acre-feet — water withheld from Lake Mead to keep Glen Canyon Dam operable. Watch the slope of the line change.",
    stage: "elev",
    reveal: "2026-05-31",
  },
  {
    kicker: "Spring – summer",
    hed: "The sacrifice play.",
    body:
      "Upstream, Flaming Gorge opens its gates — up to one million acre-feet of drought-response releases, one reservoir visibly drained to defend another. Its storage line is the season's physical evidence, the way a sinking tank lid betrays an emptying tank.",
    stage: "fg",
    reveal: "2026-12-31",
  },
  {
    kicker: "August 21, 2026",
    hed: "The rules break — and re-form.",
    body:
      "Nineteen years of operating rules end early in spirit: the Post-2026 Record of Decision is signed, and the 2027–2028 Operating Guidelines replace elevation tiers with a fixed Shortage Condition and a release ladder built to defend 3,510. WY2026 is the year that made them.",
    stage: "elev",
    reveal: "2026-12-31",
  },
];

function Stage({
  kind,
  reveal,
  active,
  powellElev,
  inflow,
  fgStorage,
  width,
}: {
  kind: StageKind;
  reveal: string;
  active: number;
  powellElev: readonly DayPoint[];
  inflow: readonly DayPoint[];
  fgStorage: readonly DayPoint[];
  width: number;
}) {
  const W = width;
  const H = Math.round(Math.min(W * 0.62, 380));
  const narrow = W < 600;
  const M = narrow
    ? { t: 26, r: 14, b: 26, l: 42 }
    : { t: 26, r: 20, b: 28, l: 46 };

  // Shared x scale: the full water year, so the reveal reads as time.
  const X0 = Date.parse("2025-10-01");
  const X1 = Date.parse("2026-09-30");
  const x = (dateStr: string) =>
    M.l + ((Date.parse(dateStr) - X0) / (X1 - X0)) * (W - M.l - M.r);

  const monthTicks = [
    "2025-10-01", "2025-12-01", "2026-02-01", "2026-04-01",
    "2026-06-01", "2026-08-01",
  ];

  let content: React.ReactNode = null;
  let unitNote = "";
  const shown = (pts: readonly DayPoint[]) =>
    pts.filter((p) => p.date >= "2025-10-01" && p.date <= reveal);

  if (kind === "elev") {
    const pts = shown(powellElev);
    const all = powellElev.filter((p) => p.date >= "2025-10-01");
    const lo = Math.min(...all.map((p) => p.value)) - 6;
    const hi = Math.max(...all.map((p) => p.value)) + 6;
    const y = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);
    unitNote = "Lake Powell elevation, feet — daily (Reclamation RISE, provisional)";
    const dPath = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`)
      .join(" ");
    const last = pts[pts.length - 1];
    const refs = [
      { v: 3525, label: "3,525 · old defend target" },
      { v: 3500, label: "3,500 · critical" },
    ].filter((r) => r.v > lo && r.v < hi);
    content = (
      <>
        {refs.map((r) => (
          <g key={r.v}>
            <line x1={M.l} x2={W - M.r} y1={y(r.v)} y2={y(r.v)} className="es-ref power" />
            <text x={M.l + 6} y={y(r.v) - 4} className="es-reflabel power" style={{ fontSize: 10.5 }}>
              {r.label}
            </text>
          </g>
        ))}
        <path d={dPath} className="tl-line" />
        {last && <circle cx={x(last.date)} cy={y(last.value)} r={3.5} className="tl-now" />}
        {EVENTS.filter((e) => e.date <= reveal).map((e, ei) => {
          const near = all.reduce((b, p) =>
            Math.abs(Date.parse(p.date) - Date.parse(e.date)) <
            Math.abs(Date.parse(b.date) - Date.parse(e.date)) ? p : b,
          );
          // Stagger label rows so near-together events never collide.
          const row = ei % 2;
          return (
            <g key={e.date}>
              <line x1={x(e.date)} x2={x(e.date)} y1={M.t + 10 + row * 13} y2={y(near.value)} className="ws-pin" />
              <circle cx={x(e.date)} cy={y(near.value)} r={3} className="ws-pindot" />
              <text x={x(e.date)} y={M.t + 2 + row * 13} className="ws-pinlabel">
                {e.label}
              </text>
            </g>
          );
        })}
      </>
    );
  } else if (kind === "inflow") {
    const pts = shown(inflow);
    let run = 0;
    const cum = pts.map((p) => ({ date: p.date, value: (run += p.value) }));
    const hi = 8_390_000 * 1.08;
    const y = (v: number) => H - M.b - (v / hi) * (H - M.t - M.b);
    unitNote = "Water arriving above Lake Powell, cumulative acre-feet since October 1";
    const dPath = cum
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`)
      .join(" ");
    const last = cum[cum.length - 1];
    content = (
      <>
        <line x1={M.l} x2={W - M.r} y1={y(8_390_000)} y2={y(8_390_000)} className="es-ref" />
        <text x={M.l + 6} y={y(8_390_000) - 5} className="es-reflabel" style={{ fontSize: 10.5 }}>
          8.4M · recent-era full-year mean
        </text>
        <path d={dPath} className="tl-line" />
        {last && (
          <>
            <circle cx={x(last.date)} cy={y(last.value)} r={3.5} className="tl-now" />
            <text x={x(last.date) - 8} y={y(last.value) - 8} className="tl-endlabel" style={{ textAnchor: "end" }}>
              {(last.value / MAF).toFixed(1)}M
            </text>
          </>
        )}
      </>
    );
  } else {
    const pts = shown(fgStorage);
    const all = fgStorage.filter((p) => p.date >= "2025-10-01");
    const lo = Math.min(...all.map((p) => p.value)) * 0.98;
    const hi = Math.max(...all.map((p) => p.value)) * 1.02;
    const y = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);
    unitNote = "Flaming Gorge storage, acre-feet — the reservoir drained to defend Powell";
    const dPath = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`)
      .join(" ");
    const last = pts[pts.length - 1];
    const first = pts[0];
    content = (
      <>
        <path d={dPath} className="tl-line" />
        {last && first && (
          <>
            <circle cx={x(last.date)} cy={y(last.value)} r={3.5} className="tl-now" />
            <text x={x(last.date) - 8} y={y(last.value) - 10} className="tl-endlabel" style={{ textAnchor: "end" }}>
              −{((first.value - last.value) / MAF).toFixed(2)} MAF this year
            </text>
          </>
        )}
      </>
    );
  }

  return (
    <div className="ws-stagecard">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={unitNote}>
        <text x={M.l - 4} y={14} className="cc-tick unit" style={{ textAnchor: "start" }}>
          {narrow ? unitNote.split(" — ")[0] : unitNote}
        </text>
        {monthTicks.map((m) => (
          <text key={m} x={x(m)} y={H - 8} className="cc-tick x">
            {new Date(`${m}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
          </text>
        ))}
        {content}
      </svg>
      <div className="cc-readout">
        Beat {active + 1} of {BEATS.length} · the chart draws only what had
        happened by {new Date(`${reveal}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}.
      </div>
    </div>
  );
}

export function WyStory({ powellElev, inflow, fgStorage }: Props) {
  const [active, setActive] = useState(0);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.beat);
            setActive(idx);
          }
        }
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    cardRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const beat = BEATS[active]!;
  const today = new Date().toISOString().slice(0, 10);
  const reveal = beat.reveal > today ? today : beat.reveal;

  return (
    <div className="ws" ref={ref}>
      <div className="ws-stage">
        {width > 0 && (
          <Stage
            kind={beat.stage}
            reveal={reveal}
            active={active}
            powellElev={powellElev}
            inflow={inflow}
            fgStorage={fgStorage}
            width={Math.min(width, 860)}
          />
        )}
      </div>
      <div className="ws-cards">
        {BEATS.map((b, i) => (
          <article
            key={b.hed}
            data-beat={i}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className={`ws-card${i === active ? " on" : ""}`}
          >
            <div className="ws-kicker">{b.kicker}</div>
            <h3 className="ws-hed">{b.hed}</h3>
            <p className="ws-body">{b.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
