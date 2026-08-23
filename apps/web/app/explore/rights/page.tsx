import Link from "next/link";
import type { Route } from "next";
import { RightsDrillIn } from "@/components/RightsDrillIn";
import { RightsMap } from "@/components/RightsMap";
import ledger from "@/public/geo/transactions_gv.json";
import owners from "@/public/geo/rights_owner_agg.json";
import utChanges from "@/public/geo/changes_ut.json";
import caPetitions from "@/public/geo/petitions_ca.json";

export const metadata = { title: "Rights Ledger — Basin" };

export default function RightsLedger() {
  return (
    <main>
      <h1 className="page-title">The rights ledger</h1>
      <p className="page-lede">
        The western rights system as the public record shows it — county
        aggregates, every individually recorded right, the largest holders,
        and the live state trackers where rights change hands. For the story
        these records support — the Cibola transfer, the watchlist, the legal
        geography — read the{" "}
        <Link href={"/report/water-rights" as Route}>
          Water Rights chapter
        </Link>
        .
      </p>

      <RightsMap />

      <div className="note" style={{ marginTop: 14 }}>
        <p>
          <strong>Why the map covers what it covers.</strong> West of roughly
          the 100th meridian, water law runs on prior appropriation —
          first-in-time, first-in-right — which produces the records mapped
          here: points of diversion, priority dates, decreed uses. The eastern
          states run on riparian doctrine, where rights attach to landownership
          and no comparable statewide record exists. Within the West, coverage
          follows each state&rsquo;s record system: Colorado, Arizona, and
          California publish machine-readable rights with priority dates; New
          Mexico publishes points of diversion without one; Utah, Nevada, and
          Wyoming keep records that are public but not yet machine-readable —
          shown as such on the Coverage layer, because the shape of the record
          is itself part of the picture.
        </p>
      </div>

      <h2 className="section-title">Every recorded right, one by one</h2>
      <p className="body-text">
        The county picture above is an aggregate; underneath it are 333,459
        individually recorded rights. The point map serves them all from a
        single 9&nbsp;MB static tile file — color is priority year, and each
        point carries its record identifier. Holder names appear only for
        entities, agencies, and tribal governments; individual holders are
        never shown.
      </p>
      <RightsDrillIn />

      <h2 className="section-title">The largest holders of record</h2>
      <p className="body-text">
        Ranked by count of active filings in each state&rsquo;s record system —
        entities, agencies, and tribal governments only; individual holders
        appear in the county statistics above but are never named. Colorado is
        absent because its net-amounts record does not carry a holder name
        (ownership lives at the county recorder).
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>State</th>
              <th>Holder of record</th>
              <th>Class</th>
              <th>Filings</th>
              <th>Counties</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(
              (owners as unknown as {
                states: Record<string, { name: string; class: string; n: number; counties: number }[]>;
              }).states,
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .flatMap(([st, list]) =>
                list.slice(0, 6).map((o, i) => (
                  <tr key={`${st}-${o.name}`}>
                    <td>{i === 0 ? st.toUpperCase() : ""}</td>
                    <td>{o.name}</td>
                    <td>{o.class === "public" ? "agency" : o.class === "tribal_govt" ? "tribal govt" : "entity"}</td>
                    <td>{o.n.toLocaleString()}</td>
                    <td>{o.counties}</td>
                  </tr>
                )),
              )}
          </tbody>
        </table>
      </div>
      <div className="chain-caveat" style={{ marginTop: 10 }}>
        <span className="src-badge src-filed" style={{ marginRight: 8 }}>
          FILED RECORD
        </span>
        {(owners as unknown as { note: string }).note} Class labels are
        heuristic where the source does not state one. Snapshot{" "}
        {(owners as unknown as { fetched: string }).fetched}.
      </div>

      <h2 className="section-title">The ledger — Colorado: Grand Valley, first cut</h2>
      <p className="body-text">
        Watching water markets case-by-case has a ceiling — the systematic view
        needs a systematic record. Colorado is the only basin state that
        publishes one: every court-decreed transaction on a water right,
        queryable down to the ditch. This is Water District 72 — the Grand
        Valley — filtered to the market signal: changes of use, transfers, and
        abandonments. Since 2017, <strong>{ledger.casesSince2017} cases</strong>
        , every one a small spring, drain, pump, or well — no change case
        touching the valley&rsquo;s major canal systems, which is the finding
        the <Link href={"/report/water-rights" as Route}>chapter</Link>{" "}
        rests on. This table re-checks on every data refresh.
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Filed</th>
              <th>Case</th>
              <th>Type</th>
              <th>Structures decreed</th>
            </tr>
          </thead>
          <tbody>
            {ledger.cases
              .filter((c) => c.year >= 2017)
              .map((c) => (
                <tr key={c.case}>
                  <td>{c.year}</td>
                  <td>
                    <a href={c.url} target="_blank" rel="noopener noreferrer">
                      {c.case}
                    </a>
                  </td>
                  <td>{c.types.join(", ")}</td>
                  <td>
                    {c.structures.join(" · ")}
                    {c.structureCount > c.structures.length &&
                      ` · +${c.structureCount - c.structures.length} more`}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="chain-caveat" style={{ marginTop: 10 }}>
        <span className="src-badge src-filed" style={{ marginRight: 8 }}>
          FILED RECORD
        </span>
        {ledger.source} Case links open the water-court record. Type codes per
        DWR HydroBase: C change of water right · TT/TF transferred to/from ·
        AB abandonment. Snapshot {ledger.fetched};{" "}
        {ledger.marketRowsSince2000} decree rows since 2000 across{" "}
        {ledger.caseCount} cases. Ownership is not recorded in CDSS — that
        chain ends at county deeds, by design of the record.
      </div>

      <h2 className="section-title">The ledger — Utah: every change application, live</h2>
      <p className="body-text">
        Utah runs the strongest change-of-use tracker in the basin: a live
        public list of every application to move a water right to a new use,
        place, or point of diversion — applicant named, protest status shown.
        In the current six-month window: <strong>{utChanges.count}</strong>{" "}
        applications. The twenty-five most recently filed:
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Filed</th>
              <th>Change №</th>
              <th>Applicant</th>
              <th>Protested</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {[...utChanges.applications]
              .filter((a) => a.filed)
              .sort((a, b) => (b.filed! < a.filed! ? -1 : 1))
              .slice(0, 25)
              .map((a) => (
                <tr key={a.change}>
                  <td>{a.filed}</td>
                  <td>{a.change}</td>
                  <td>{a.applicant}</td>
                  <td>{a.protested ? "Y" : "—"}</td>
                  <td>{a.comments ?? ""}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="chain-caveat" style={{ marginTop: 10 }}>
        <span className="src-badge src-filed" style={{ marginRight: 8 }}>
          FILED RECORD
        </span>
        {utChanges.source} Snapshot {utChanges.fetched}. Utah&rsquo;s legal
        office of record for ownership is still the county recorder; this
        tracker is the division&rsquo;s live administrative feed.
      </div>

      <h2 className="section-title">The ledger — California: change petitions on notice</h2>
      <p className="body-text">
        California publishes every petition to change a permitted or licensed
        water right as a public notice — holder named, change type spelled
        out. All {caPetitions.count} currently on the books:
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Noticed</th>
              <th>Water-right holder</th>
              <th>Change sought</th>
              <th>Protest deadline</th>
            </tr>
          </thead>
          <tbody>
            {caPetitions.petitions.map((p) => (
              <tr key={`${p.applications}-${p.holder}`}>
                <td>{p.noticed ?? "—"}</td>
                <td>{p.holder}</td>
                <td>{p.changeTypes}</td>
                <td>{p.protestDeadline ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="chain-caveat" style={{ marginTop: 10 }}>
        <span className="src-badge src-filed" style={{ marginRight: 8 }}>
          FILED RECORD
        </span>
        {caPetitions.source} Snapshot {caPetitions.fetched}. Both this table
        and the state&rsquo;s points-of-diversion API sit outside the
        in-flight eWRIMS→CalWATRS migration. Wyoming and Nevada publish no
        equivalent tracker — changes there are paper filings, which is itself
        a finding this page reports rather than hides.
      </div>
    </main>
  );
}
