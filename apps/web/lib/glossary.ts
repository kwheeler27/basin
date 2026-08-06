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
  satellite_model: {
    id: "satellite_model",
    label: "satellite model",
    short:
      "Estimated from Landsat imagery by an ensemble of models (OpenET — a NASA/USGS/DRI partnership), not measured by an instrument on the ground. Modeled values are always marked and never mixed with measurements.",
  },
};

export type TermId = keyof typeof GLOSSARY;
