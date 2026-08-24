import Link from "next/link";
import type { Route } from "next";
import { MachineExplorer } from "@/components/MachineExplorer";

export const metadata = { title: "Machine Explorer — Basin" };

export default function MachinePage() {
  return (
    <main>
      <h1 className="page-title">The machine explorer</h1>
      <p className="page-lede">
        The basin&rsquo;s signature machines are its pumping plants: the river
        is lower than most of the people who drink it, so its water is lifted
        — thousands of vertical feet, at industrial scale, forever. One
        system at a time: zoom the map, tap a plant for its card, and read
        the elevation profile underneath — the terrain, and the water&rsquo;s
        path through it. The story of why these machines exist is the{" "}
        <Link href={"/report/infrastructure" as Route}>
          Infrastructure chapter
        </Link>
        .
      </p>

      <MachineExplorer />
    </main>
  );
}
