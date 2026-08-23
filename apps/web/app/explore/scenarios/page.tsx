import Link from "next/link";
import type { Route } from "next";
import { WhatIf } from "@/components/WhatIf";

export const metadata = { title: "Scenario Lab — Basin" };

export default function ScenarioLab() {
  return (
    <main>
      <h1 className="page-title">The scenario lab</h1>
      <p className="page-lede">
        What happens next is not a line, it&rsquo;s a band. This model runs
        the verified operating rules forward over every recent-history inflow
        sequence — move the slider to see what additional Lower Basin
        conservation does to the trajectories, and when the rules&rsquo; own
        thresholds get crossed. The context for what you&rsquo;re looking at
        is the <Link href={"/report/reservoirs" as Route}>Reservoirs chapter</Link>.
      </p>

      <WhatIf />

      <div className="note" style={{ marginTop: 22 }}>
        <p>
          <strong>What this will grow into.</strong> Today: one lever (Lower
          Basin conservation), Mead trajectories, threshold crossings. Planned
          (docs/IA.md): rulebook selection, snowpack and temperature levers,
          and a published backtest against Reclamation&rsquo;s 24-Month
          Studies — including the cases where this model does worse. A
          reduced-form model, independent of and not equivalent to
          Reclamation&rsquo;s CRSS; every output is stamped with its model,
          rulebook, and input-data versions.
        </p>
      </div>
    </main>
  );
}
