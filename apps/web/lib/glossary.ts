/**
 * Plain-language glossary — the teaching layer behind every tappable term.
 *
 * Written for an informed general reader: no jargon in the definitions
 * themselves, one concrete anchor each. Definitional distinctions here match
 * the measure registry's accounting concepts (docs/DATA_MODEL.md) — this is
 * the registry's semantics surfacing in the UI.
 */

export interface Term {
  readonly id: string;
  readonly label: string;
  readonly short: string;
}

export const GLOSSARY: Record<string, Term> = {
  acre_foot: {
    id: "acre_foot",
    label: "acre-foot",
    short:
      "The volume that covers one acre a foot deep — about 326,000 gallons. A typical household uses roughly a third of an acre-foot a year, so 1 acre-foot ≈ 2–3 households for a year.",
  },
  maf: {
    id: "maf",
    label: "MAF",
    short:
      "Million acre-feet. The river's modern annual flow is about 12.4 MAF; Lake Mead can hold about 26 MAF when full.",
  },
  mgd: {
    id: "mgd",
    label: "MGD",
    short:
      "Million gallons per day — how the USGS reports water use. 1 MGD sustained for a year ≈ 1,120 acre-feet ≈ 2,900 households.",
  },
  withdrawal: {
    id: "withdrawal",
    label: "withdrawal",
    short:
      "Water taken from a river, lake, or well — before any of it returns. Much irrigation and cooling water flows back; withdrawal counts it all, so it overstates what's truly used up.",
  },
  consumptive_use: {
    id: "consumptive_use",
    label: "consumptive use",
    short:
      "Water that does NOT return — evaporated, transpired by crops, or embedded in products. This is the number that matters for the river's balance, and it's always smaller than withdrawals.",
  },
  storage_capacity: {
    id: "storage_capacity",
    label: "storage vs. capacity",
    short:
      "Capacity is the size of the bathtub; storage is the water actually in it. The dashed ring is capacity, the filled circle is today's storage.",
  },
  provisional: {
    id: "provisional",
    label: "provisional",
    short:
      "Fresh government data that hasn't been through final review — agencies revise it without announcement, sometimes a week later. Fine to read, unwise to memorize.",
  },
  watershed: {
    id: "watershed",
    label: "watershed",
    short:
      "All the land that drains to one river — the shaded shape on the map. Rain or snow inside the line ends up in the Colorado; outside it, some other river.",
  },
  aqueduct: {
    id: "aqueduct",
    label: "aqueduct / transbasin",
    short:
      "Engineered channels and tunnels that move water where gravity wouldn't — including under the Continental Divide. Water sent outside the watershed never returns to the river.",
  },
  service_population: {
    id: "service_population",
    label: "service population",
    short:
      "People living where a water provider delivers — as the provider reports it. Approximate by nature, and one person can sit in more than one provider's tally.",
  },
  census_2015: {
    id: "census_2015",
    label: "the 2015 census",
    short:
      "The last time the federal government counted water use county-by-county across all sectors (USGS, 2015). The 2020 update covered only three categories at watershed scale — so 2015 remains the most detailed picture that exists.",
  },
  irrigation_withdrawal: {
    id: "irrigation_withdrawal",
    label: "irrigation withdrawals",
    short:
      "Water diverted or pumped for crops. Some returns to rivers and aquifers as runoff and seepage — so this is bigger than what crops actually consume.",
  },
  evapotranspiration: {
    id: "evapotranspiration",
    label: "evapotranspiration",
    short:
      "Water that leaves as vapor — evaporated from soil plus transpired through plants. For a farm field, it IS consumption: measured in inches of depth, like rainfall in reverse.",
  },
  basin: {
    id: "basin",
    label: "the basin",
    short:
      "The Colorado River and all the land that drains into it — parts of seven US states and two Mexican states, about 246,000 square miles. The 1922 Compact splits it at Lee Ferry, Arizona into an Upper Basin (WY, CO, UT, NM) and a Lower Basin (AZ, NV, CA), each entitled to 7.5 MAF a year.",
  },
  reclamation: {
    id: "reclamation",
    label: "Reclamation",
    short:
      "The Bureau of Reclamation — the federal agency that operates the river's big dams (Hoover, Glen Canyon) and keeps its official books. 'On Reclamation's accounting' means their published numbers.",
  },
  lower_basin: {
    id: "lower_basin",
    label: "Lower Basin",
    short:
      "Arizona, Nevada, and California — the states supplied from Lake Mead. The 1922 Compact split the river at Lee Ferry into an Upper and a Lower Basin and gave each the right to use 7.5 MAF a year.",
  },
  upper_basin: {
    id: "upper_basin",
    label: "Upper Basin",
    short:
      "Wyoming, Colorado, Utah, and New Mexico — the states upstream of Lee Ferry. They draw from the river and its tributaries directly, and have never used their full 7.5 MAF share.",
  },
  apportionment: {
    id: "apportionment",
    label: "apportionment",
    short:
      "The share of the river a state or country is legally entitled to use, fixed by the 1922 Compact, later law, and the 1944 treaty with Mexico. The entitlements add to 16.5 MAF a year — more than the river now produces.",
  },
  natural_flow: {
    id: "natural_flow",
    label: "natural flow",
    short:
      "What the river would carry with no dams or diversions — Reclamation reconstructs it from gauge records by adding back upstream use. It's the honest measure of what the river produces.",
  },
  decree_accounting: {
    id: "decree_accounting",
    label: "decree accounting",
    short:
      "The annual audit of who used how much Lower Basin water, which the Supreme Court's decree in Arizona v. California requires Reclamation to publish every year. This site's year-by-year consumption series comes from those reports.",
  },
  water_year: {
    id: "water_year",
    label: "water year",
    short:
      "The hydrologist's year: October 1 through September 30, named for the year it ends — so a winter's snow and the runoff it becomes stay in the same bucket.",
  },
  satellite_model: {
    id: "satellite_model",
    label: "satellite model",
    short:
      "Estimated from Landsat imagery by an ensemble of models (OpenET — a NASA/USGS/DRI partnership), not measured by an instrument on the ground. Modeled values are always marked and never mixed with measurements.",
  },
};

export type TermId = keyof typeof GLOSSARY;
