import { MachineExplorer } from "@/components/MachineExplorer";
import { SYSTEM_NOTES } from "@/lib/infrastructure";
import { MAP_CONVEYANCE } from "@/lib/mapdata";
import { acreFeet } from "@/lib/format";
import nid from "@/public/geo/nid_reservoirs.json";

export const metadata = { title: "Infrastructure — Basin" };

const TYPOLOGY = [
  { verb: "Capture", what: "Dams and diversion structures raise and hold the river", have: `${(nid as { dams: unknown[] }).dams.length} large dams mapped (federal inventory) plus the 13 live-gauged reservoirs` },
  { verb: "Lift", what: "Pumping plants push water uphill — the defining machines of this basin", have: "19 plants across the two flagship aqueducts profiled below (5 CRA + 14 CAP)" },
  { verb: "Move", what: "Canals, pipelines, tunnels and siphons — water's rail network", have: "CAP's 336-mile canal drawn from operator geometry on the Overview; the full network inventory (USGS hydrography) is queued" },
  { verb: "Generate", what: "Hydropower at the dams and recovery turbines in the aqueducts pay part of the pumping bill", have: "16 recovery plants in MWD's system alone (operator-published); the federal generator inventory is queued" },
  { verb: "Bank", what: "Recharge basins store surplus underground", have: "6 CAP recharge sites named on the operator map; Arizona's underground-storage inventory is queued" },
] as const;

export default function Infrastructure() {
  return (
    <main>
      <h1 className="page-title">Infrastructure</h1>
      <p className="page-lede">
        The river is committed by law, but delivered by machines. This is the
        physical system — what captures the water, what lifts it, what moves
        it, and what pays for the electricity — from the operators&rsquo; own
        records.
      </p>

      <h2 className="section-title">The parts of the machine</h2>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>What it does</th>
              <th>On this site today</th>
            </tr>
          </thead>
          <tbody>
            {TYPOLOGY.map((t) => (
              <tr key={t.verb}>
                <td><strong>{t.verb}</strong></td>
                <td>{t.what}</td>
                <td>{t.have}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">Water, flowing uphill</h2>
      <p className="body-text">
        The basin&rsquo;s signature machines are its pumping plants: the river
        is lower than most of the people who drink it, so its water is lifted
        — thousands of vertical feet, at industrial scale, forever. Each
        vertical step below is one plant.
      </p>
      <MachineExplorer />

      <h2 className="section-title">Every delivery system</h2>
      <p className="body-text">
        The full roster, with 2025 accounted volumes where Reclamation&rsquo;s
        decree accounting provides them — and each system&rsquo;s defining
        piece of hardware.
      </p>
      <div className="watch-grid">
        {MAP_CONVEYANCE.map((c) => (
          <div className="watch-card" key={c.id}>
            <div className="watch-place">{c.operator ?? "—"}</div>
            <div className="watch-name">{c.name}</div>
            {c.approxAfPerYear && (
              <div>
                <span className="watch-status">
                  {acreFeet(c.approxAfPerYear)}{c.volumeSource?.includes("CY2025") ? " · CY2025" : " · AVG"}
                </span>
              </div>
            )}
            <p className="watch-body">
              {c.role}. {SYSTEM_NOTES[c.id] ?? ""}
            </p>
          </div>
        ))}
      </div>
      <div className="chain-caveat" style={{ marginTop: 10 }}>
        Volumes: Reclamation CY2025 Colorado River Accounting Report (Article V
        decree accounting); transbasin figure is an aggregated long-term
        average of operator reporting. System notes from operator publications.
      </div>

      <div className="note" style={{ marginTop: 26 }}>
        <p>
          <strong>What this page will grow into.</strong> The conveyance
          network as a drawn network (from the USGS national hydrography
          dataset&rsquo;s canal and pipeline classes), the hydropower fleet
          (federal generator inventory), treatment and public water systems
          (EPA), and Arizona&rsquo;s underground storage — each added the way
          everything on this site is added: from the agency of record, with
          the source on the figure.
        </p>
      </div>
    </main>
  );
}
