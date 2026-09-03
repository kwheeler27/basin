import Link from "next/link";
import type { Route } from "next";
import { Cite } from "@/components/Cite";
import { WyStory, type DayPoint } from "@/components/WyStory";
import { MAP_RESERVOIRS } from "@/lib/mapdata";
import { POWELL, POWELL_UNREG_INFLOW_ITEM } from "@/lib/reservoirs";
import { fetchSeries } from "@/lib/rise";

export const revalidate = 3600;
// Pin static despite the no-store RISE fetches (see lib/rise.ts).
export const dynamic = "force-static";
export const metadata = { title: "WY2026: The Year the River Nearly Broke Its Rules — Basin" };

export default async function Wy2026() {
  const fg = MAP_RESERVOIRS.find((r) => r.id === "flaming_gorge")!;
  const [powellElev, inflow, fgStorage] = await Promise.all([
    fetchSeries(POWELL.riseElevationItem, 430),
    fetchSeries(POWELL_UNREG_INFLOW_ITEM, 430),
    fetchSeries(fg.riseStorageItem!, 430),
  ]);
  const wy = (s: { points: readonly { date: string; value: number }[] }): DayPoint[] =>
    s.points
      .filter((p) => p.date >= "2025-10-01")
      .map((p) => ({ date: p.date, value: p.value }));

  return (
    <main>
      <div className="ch-kicker">
        <Link href={"/report" as Route}>The report</Link>
        <span> · field investigation</span>
      </div>
      <h1 className="page-title">
        WY2026: the year the river nearly broke its rules.
      </h1>
      <p className="page-lede">
        A water year told through the lines it bent — the driest season of
        the era, the emergency release cut, one reservoir drained to save
        another, and the rulebook that didn&rsquo;t survive it. Every beat
        is drawn from the live record; scroll to watch the year unfold.
      </p>

      <WyStory
        powellElev={wy(powellElev)}
        inflow={wy(inflow)}
        fgStorage={wy(fgStorage)}
      />

      <h2 className="section-title">Where this leaves the river</h2>
      <p className="body-text">
        The water year ends September 30 with Powell near 3,516 feet —
        26 feet above the critical elevation, defended by a release cut and
        an upstream sacrifice. The rules that managed this year are expired;
        the ones that replace them<Cite id="og2728" /> assume years like
        this will come again. Test that assumption yourself in the{" "}
        <Link href={"/explore/scenarios" as Route}>scenario lab</Link>, or
        read what the new rules say at today&rsquo;s levels on{" "}
        <Link href={"/current-state" as Route}>Now</Link>.
      </p>

      <div className="chain-caveat" style={{ marginTop: 22 }}>
        Sources: Reclamation RISE daily elevations, storage, and unregulated
        inflow<Cite id="rise" /> (provisional, revised without
        announcement); the 24-Month Study record for the December reshaping
        and release decisions<Cite id="ms24" />; SEIS ROD §6.E for the
        April 17 cut authority<Cite id="seisrod2024" />; NRCS SNOTEL for
        the snowpack index<Cite id="awdb" /> (our computed basin index —
        sum of station readings over sum of medians); the Post-2026 Record
        of Decision<Cite id="p26rod2026" /> and 2027&ndash;2028 Operating
        Guidelines<Cite id="og2728" />. Charts draw the live series and
        update as the record does.
      </div>

      <div className="ch-pager">
        <Link className="ch-pager-link" href={"/report/reservoirs" as Route}>
          <span className="ch-pager-dir">← Chapter 4</span>
          <span className="ch-pager-title">Reservoirs</span>
        </Link>
        <Link className="ch-pager-link next" href={"/explore/scenarios" as Route}>
          <span className="ch-pager-dir">What happens next →</span>
          <span className="ch-pager-title">The scenario lab</span>
        </Link>
      </div>
    </main>
  );
}
