import Link from "next/link";
import type { Route } from "next";
import { BasinStory } from "@/components/BasinStory";
import { MAP_RESERVOIRS } from "@/lib/mapdata";
import { fetchSeries } from "@/lib/rise";

export const revalidate = 3600;
// Pin static despite the no-store RISE fetches (see lib/rise.ts) — data
// updates via page-level ISR, never per-request.
export const dynamic = "force-static";
export const metadata = { title: "Basin Map — Basin" };

export default async function BasinMap() {
  // Live storage for every reservoir with a RISE item (11 of 13; Roosevelt
  // and Dillon have non-federal operators and no live feed).
  const withItems = MAP_RESERVOIRS.filter((r) => r.riseStorageItem);
  const series = await Promise.all(
    withItems.map((r) => fetchSeries(r.riseStorageItem!, 45)),
  );
  const liveStorage: Record<string, { af: number; asOf: string } | undefined> =
    {};
  withItems.forEach((r, i) => {
    const latest = series[i]!.latest;
    if (latest) liveStorage[r.id] = { af: latest.value, asOf: latest.date };
  });

  return (
    <main>
      <h1 className="page-title">The basin map</h1>
      <p className="page-lede">
        The whole system on one live map — switch layers, pan, zoom, tap
        anything for its numbers and sources. Prefer to be walked through it?
        The <Link href={"/report/the-system" as Route}>System chapter</Link>{" "}
        tells the same map as a five-scene story.
      </p>

      <BasinStory storage={liveStorage} variant="explore" />

      <p className="chain-caveat">
        Rivers and the watershed are real geometry (Natural Earth, USGS);
        delivery paths are schematic between real endpoints. Reservoir storage
        is live from Reclamation RISE, provisional. Dams: federal National
        Inventory of Dams. Cities: Census population estimates. County water
        use: USGS 2015 accounting. Field consumption: OpenET satellite model,
        marked as such.
      </p>
    </main>
  );
}
