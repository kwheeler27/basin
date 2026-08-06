import { AzExportMap } from "@/components/AzExportMap";
import { RightsDrillIn } from "@/components/RightsDrillIn";
import { RightsMap } from "@/components/RightsMap";
import { SourceBadge } from "@/components/SourceBadge";
import { CASE_GSC, WATCHLIST } from "@/lib/markets";
import ledger from "@/public/geo/transactions_gv.json";
import owners from "@/public/geo/rights_owner_agg.json";
import utChanges from "@/public/geo/changes_ut.json";
import caPetitions from "@/public/geo/petitions_ca.json";

export const metadata = { title: "Water Rights — Basin" };

export default function WaterRights() {
  return (
    <main>
      <h1 className="page-title">Water rights</h1>
      <p className="page-lede">
        Who may take water, from where, since when, for what — the western
        rights system as the public record shows it, county by county. Below
        the map: the transactions where rights change hands, traced through
        filings and labeled by what the record can and cannot say.
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

      <h2 className="section-title">Transactions</h2>

      <div className="note">
        <p>
          <strong>How to read this page.</strong> Every fact carries one of two
          grades. <span className="src-badge src-filed">FILED RECORD</span>{" "}
          means it appears in a government record we have read — a Federal
          Register notice, an SEC filing, a court order — and links to it.{" "}
          <span className="src-badge src-reported">REPORTED · OUTLET</span>{" "}
          means it exists so far only in journalism, and names the outlet.
          The gap between the two matters: land is bought through LLCs, no
          basin state keeps a registry of who owns water rights, and intent
          never appears in a filing. So this page shows fact patterns — buy,
          hold, transfer — and never claims motive; characterizations are
          attributed or self-descriptions, never our own. Entities and
          structures, not individuals. The facts carry the argument.
        </p>
      </div>

      <section className="fieldnote">
        <div className="fieldnote-kicker">{CASE_GSC.kicker}</div>
        <h2 className="fieldnote-hed">{CASE_GSC.hed}</h2>
        <p className="body-text">
          In 2013, GSC Farm, LLC contracted for Colorado River water to
          irrigate farmland at Cibola, on the Arizona bank of the river. A
          decade later, most of that entitlement belongs to a Phoenix-area
          suburb two hundred miles away — the first legal challenge decided in
          federal court, the court-ordered review still open. The sequence,
          from the filings:
        </p>

        <div className="stat-row">
          {CASE_GSC.stats.map((s) => (
            <div className="stat" key={s.label}>
              <div className="stat-num">
                {s.num} <small>{s.unit}</small>
              </div>
              <div className="stat-label">{s.label}</div>
              <div className="tl-src">
                <SourceBadge source={s.source} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ margin: "10px 0 4px" }}>
          <span className="case-status">{CASE_GSC.status}</span>
          <span className="subline" style={{ marginLeft: 10 }}>
            {CASE_GSC.statusDetail}
          </span>
        </div>

        <ol className="tl">
          {CASE_GSC.timeline.map((ev) => (
            <li className={`tl-item ${ev.source.kind}`} key={ev.title}>
              <div className="tl-date">{ev.date}</div>
              <div className="tl-title">{ev.title}</div>
              <p className="tl-body">{ev.body}</p>
              <div className="tl-src">
                <SourceBadge source={ev.source} />
              </div>
            </li>
          ))}
        </ol>

        <div className="note" style={{ marginTop: 6 }}>
          <p>
            <strong>Where the paper trail ends.</strong> The filed record names
            exactly one seller: <em>GSC Farm, LLC</em>. That the LLC is a
            subsidiary of Greenstone — a Phoenix company that describes itself
            as advancing water transactions — and that Greenstone&rsquo;s
            parent is the financial-services firm Barings, is known only
            through reporting. This is why the badges exist: the documents
            stop at the LLC, in every state.
          </p>
        </div>
      </section>

      <h2 className="section-title">The watchlist</h2>
      <p className="body-text">
        Other acquisitions where the water may be the asset — each held to the
        same standard, each with the specific public record that would settle
        what the reporting alleges.
      </p>
      <div className="watch-grid">
        {WATCHLIST.map((w) => (
          <div className="watch-card" key={w.name}>
            <div className="watch-place">{w.place}</div>
            <div className="watch-name">{w.name}</div>
            <div>
              <span className="watch-status">{w.status}</span>
            </div>
            <p className="watch-body">{w.body}</p>
            <div className="tl-src">
              <SourceBadge source={w.source} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="section-title">The ledger — Colorado: Grand Valley, first cut</h2>
      <p className="body-text">
        Watching water markets case-by-case has a ceiling — the systematic view
        needs a systematic record. Colorado is the only basin state that
        publishes one: every court-decreed transaction on a water right,
        queryable down to the ditch. This is Water District 72 — the Grand
        Valley — filtered to the market signal: changes of use, transfers, and
        abandonments. Since 2017, <strong>{ledger.casesSince2017} cases</strong>
        , every one a small spring, drain, pump, or well.
      </p>
      <div className="note">
        <p>
          <strong>Which answers the watchlist question.</strong> No change case
          touching the valley&rsquo;s major canal systems appears in this
          ledger since 2017 — the era of the investment-fund purchases. The
          last canal-system change cases are 2011 and 2002. Whatever the
          fund&rsquo;s intentions, on paper its water is still farming. The
          record can&rsquo;t prove a negative forever — this page re-checks on
          every data refresh.
        </p>
      </div>
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
        chain ends at county deeds, by design of the record, which is exactly
        what the badges above are for.
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

      <h2 className="section-title">The legal geography — where Arizona groundwater can cash out</h2>
      <p className="body-text">
        Arizona law generally prohibits transporting rural groundwater to the
        urban Active Management Areas — with four named exceptions, written
        into statute. Land over these basins therefore carries the only rural
        groundwater in the state that can legally be conveyed to the AMAs;
        the basins are where transfer proposals concentrate.
      </p>
      <AzExportMap />
      <div className="chain-caveat" style={{ marginTop: 10 }}>
        <span className="src-badge src-filed" style={{ marginRight: 8 }}>
          FILED RECORD
        </span>
        Basin boundaries: Arizona Department of Water Resources public feature
        services (2024). Legal basis: A.R.S. §45-551 et seq. — groundwater
        transportation to Active Management Areas. ADWR&rsquo;s surface-water
        registry (99,775 filings, 25,659 of them assignments) is public on
        the same servers; Colorado River mainstem entitlements, like the
        case-file transfer above, are federal Reclamation contracts and do
        not appear in state filings.
      </div>
    </main>
  );
}
