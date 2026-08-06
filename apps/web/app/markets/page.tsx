import { SourceBadge } from "@/components/SourceBadge";
import { CASE_GSC, WATCHLIST } from "@/lib/markets";

export const metadata = { title: "Markets — Basin" };

export default function Markets() {
  return (
    <main>
      <h1 className="page-title">Markets</h1>
      <p className="page-lede">
        When a farm sells, sometimes the crop was never the point. This page
        tracks transactions where land changed hands and the water was the
        asset — traced through the public record, and labeled by what the
        record can and cannot say.
      </p>

      <div className="note">
        <p>
          <strong>How to read this page.</strong> Every fact carries one of two
          grades. <span className="src-badge src-filed">FILED RECORD</span>{" "}
          means it appears in a government record we have read — a Federal
          Register notice, an SEC filing, a court order — and links to it.{" "}
          <span className="src-badge src-reported">REPORTED · OUTLET</span>{" "}
          means it exists so far only in journalism, and names the outlet.
          The gap between the two is the story: land is bought through LLCs,
          no basin state keeps a registry of who owns water rights, and intent
          never appears in a filing. So we show fact patterns — buy, hold,
          transfer — and never claim motive. Entities and structures, not
          individuals.
        </p>
      </div>

      <section className="fieldnote">
        <div className="fieldnote-kicker">{CASE_GSC.kicker}</div>
        <h2 className="fieldnote-hed">{CASE_GSC.hed}</h2>
        <p className="body-text">
          In 2013, a company no one had heard of contracted for Colorado River
          water to irrigate a farm at Cibola, on the Arizona bank. A decade
          later, most of that water belongs to a Phoenix suburb two hundred
          miles away — the first fight over it decided in federal court, the
          next one still open. This is the whole arc of a water market in one
          case, told in filings.
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
            subsidiary of Greenstone — a Phoenix company built to trade water —
            and that Greenstone&rsquo;s parent is the financial-services firm
            Barings, is known only through reporting. This is not a footnote;
            it is the reason the badges exist. The documents stop at the LLC,
            everywhere, in every state.
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

      <div className="note" style={{ marginTop: 26 }}>
        <p>
          <strong>What comes next: the ledger.</strong> Watching water markets
          case-by-case has a ceiling — the systematic view needs a systematic
          record. Colorado is the only basin state that publishes one: every
          court-decreed change in how a water right is used, queryable down to
          the ditch. A live feed of that ledger is the next piece of this
          page — and its first query will be the Grand Valley entry above.
        </p>
      </div>
    </main>
  );
}
