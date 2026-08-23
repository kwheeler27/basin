import Link from "next/link";
import type { Route } from "next";
import { AzExportMap } from "@/components/AzExportMap";
import { ChapterKicker, ChapterPager } from "@/components/Chapter";
import { SourceBadge } from "@/components/SourceBadge";
import { CASE_GSC, WATCHLIST } from "@/lib/markets";

export const metadata = { title: "Water Rights — Basin" };

export default function WaterRightsChapter() {
  return (
    <main>
      <ChapterKicker slug="water-rights" />
      <h1 className="page-title">Water rights</h1>
      <p className="page-lede">
        Who may take water, from where, since when, for what — and what
        happens when those rights start changing hands. The full record is an
        instrument of its own:{" "}
        <Link href={"/explore/rights" as Route}>
          open the rights ledger
        </Link>{" "}
        to see all 333,459 recorded rights, the largest holders, and the live
        state trackers. This chapter tells the story the record supports.
      </p>

      <div className="note">
        <p>
          <strong>Why the record looks the way it does.</strong> West of
          roughly the 100th meridian, water law runs on prior appropriation —
          first-in-time, first-in-right — which produces the records the
          ledger maps: points of diversion, priority dates, decreed uses. The
          eastern states run on riparian doctrine, where rights attach to
          landownership and no comparable statewide record exists. Within the
          West, coverage follows each state&rsquo;s record system — the shape
          of the record is itself part of the picture.
        </p>
      </div>

      <div className="note">
        <p>
          <strong>How to read this chapter.</strong> Every fact carries one of
          two grades. <span className="src-badge src-filed">FILED RECORD</span>{" "}
          means it appears in a government record we have read — a Federal
          Register notice, an SEC filing, a court order — and links to it.{" "}
          <span className="src-badge src-reported">REPORTED · OUTLET</span>{" "}
          means it exists so far only in journalism, and names the outlet.
          The gap between the two matters: land is bought through LLCs, no
          basin state keeps a registry of who owns water rights, and intent
          never appears in a filing. So this chapter shows fact patterns —
          buy, hold, transfer — and never claims motive; characterizations
          are attributed or self-descriptions, never our own. Entities and
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

      <div className="note" style={{ marginTop: 18 }}>
        <p>
          <strong>What the systematic record says so far.</strong> Colorado is
          the only basin state that publishes every court-decreed transaction
          on a water right. In the Grand Valley — home of the
          investment-fund purchases above — no change case touching the
          valley&rsquo;s major canal systems appears in that ledger since
          2017; on paper, the water is still farming. The record can&rsquo;t
          prove a negative forever, so the{" "}
          <Link href={"/explore/rights" as Route}>rights ledger</Link>{" "}
          re-checks the decree record, Utah&rsquo;s live change-application
          tracker, and California&rsquo;s petition notices on every data
          refresh.
        </p>
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

      <ChapterPager slug="water-rights" />
    </main>
  );
}
