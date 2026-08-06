/**
 * Water markets — case files and the sourcing discipline behind them.
 *
 * Every fact on the Markets page carries one of two provenance grades:
 *
 *   "filed"    — the fact appears in a government record we have read
 *                (a Federal Register notice, an SEC filing, a court order,
 *                a recorded contract). Linked to the record itself.
 *   "reported" — the fact exists in journalism but not (yet) in a filing
 *                we hold. Always attributed to the named outlet.
 *
 * The distinction is load-bearing: land is bought by LLCs, and no basin
 * state keeps a water-right ownership registry, so the chain of documents
 * often stops at the LLC. Who stands behind it is knowable only through
 * reporting — and must be labeled as such. Intent never appears in a
 * filing either; these pages show fact patterns, never motive.
 */

export type SourceKind = "filed" | "reported";

export interface Source {
  kind: SourceKind;
  /** Outlet name for reported facts; record name for filed facts. */
  name: string;
  url?: string;
  date?: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  body: string;
  source: Source;
}

export interface WatchItem {
  place: string;
  name: string;
  status: string;
  body: string;
  source: Source;
}

const FR_NOI: Source = {
  kind: "filed",
  name: "Federal Register, 90 FR 44394",
  url: "https://www.federalregister.gov/documents/2025/09/15/2025-17743/notice-of-intent-to-prepare-an-environmental-impact-statement-for-the-gsc-farm-queen-creek-water",
  date: "2025-09-15",
};

const AZ_REPUBLIC: Source = {
  kind: "reported",
  name: "The Arizona Republic",
  url: "https://www.azcentral.com/story/news/local/arizona-environment/2020/09/05/arizona-gsc-farm-sell-colorado-river-water-queen-creek/5721243002/",
  date: "2020-09-05",
};

export const CASE_GSC = {
  kicker: "Case file № 1 · Cibola, Arizona",
  hed: "The farm that became a suburb's water supply.",
  status: "EIS IN PROGRESS",
  statusDetail:
    "A court-ordered Environmental Impact Statement is underway; the transfer contracts remain in effect while it runs. Final EIS expected by late 2027.",
  stats: [
    {
      num: "2,033.01",
      unit: "acre-feet/yr",
      label: "entitlement transferred to Queen Creek — about 5,300 households' annual water",
      source: FR_NOI,
    },
    {
      num: "$21M",
      unit: "one-time",
      label: "reported price paid by the town for the entitlement",
      source: AZ_REPUBLIC,
    },
    {
      num: "485",
      unit: "acres",
      label: "of farmland reported permanently retired to free the water",
      source: AZ_REPUBLIC,
    },
  ],
  timeline: [
    {
      date: "Dec 23, 2013",
      title: "A farm contracts for river water",
      body: "GSC Farm, LLC signs Contract No. 13-XX-30-W0571 with the Bureau of Reclamation: an entitlement to divert up to 2,913.3 acre-feet per year of fourth-priority Colorado River water, for irrigation near Cibola in La Paz County — right on the river.",
      source: FR_NOI,
    },
    {
      date: "Dec 2018",
      title: "A suburb 200 miles away signs a purchase agreement",
      body: "The Town of Queen Creek — a fast-growing Phoenix suburb far from the river — enters a Purchase and Transfer Agreement for Mainstream Colorado River Water Entitlement with GSC Farm.",
      source: FR_NOI,
    },
    {
      date: "Sept 2020",
      title: "Arizona sizes the transfer",
      body: "After consultation begun in August 2019, the Arizona Department of Water Resources recommends federal approval — initially 1,078.01 acre-feet per year, later revised to 2,033.01. GSC Farm keeps 50 acre-feet of consumptive use; 810.36 acre-feet of the farm's historical return flow stays in Lake Mead for downstream users.",
      source: FR_NOI,
    },
    {
      date: "Sept 2020",
      title: "The price — and the owner — become public",
      body: "The Republic reports the terms: a one-time $21 million payment, with 485 acres of farmland left permanently dry. It identifies GSC Farm as a subsidiary of Phoenix-based Greenstone, a company built to trade water, whose parent is the financial-services firm Barings.",
      source: AZ_REPUBLIC,
    },
    {
      date: "July 2022",
      title: "Federal review, the lighter form",
      body: "Reclamation issues a final Environmental Assessment and a Finding of No Significant Impact — the abbreviated tier of federal environmental review.",
      source: FR_NOI,
    },
    {
      date: "Apr 28, 2023",
      title: "The water changes hands",
      body: "Four contracts execute the same day: the partial assignment of 2,033.01 acre-feet per year to Queen Creek; the town's own delivery contract with the United States; the amendment shrinking GSC Farm's entitlement to 50 acre-feet; and a wheeling contract to move the water to the suburb through the Central Arizona Project canal.",
      source: FR_NOI,
    },
    {
      date: "Feb 21 & Aug 13, 2024",
      title: "A court orders the deeper review",
      body: "In Mohave County v. Bureau of Reclamation (D. Ariz., No. 3:22-cv-08246), river-county plaintiffs — the sellers' neighbors — win orders requiring a full Environmental Impact Statement. The contracts remain in effect while the study runs.",
      source: FR_NOI,
    },
    {
      date: "Sept 15, 2025",
      title: "The study begins",
      body: "Reclamation publishes its Notice of Intent to prepare the EIS, with scoping comments due October 15 and a final EIS expected “in two years or less.” Until then, the transfer stands.",
      source: FR_NOI,
    },
  ] satisfies TimelineEvent[],
};

export const WATCHLIST: WatchItem[] = [
  {
    place: "Grand Valley, Colorado",
    name: "Water Asset Management",
    status: "NO TRANSFER FILING VERIFIED",
    body: "A New York private-equity fund is now the largest landowner in the Grand Valley Water Users Association — purchases that prompted Colorado to convene its anti-speculation work group. The decisive fact is whether any change-of-use has been filed for that water. Colorado keeps that record public; the transaction ledger arriving on this page will answer it.",
    source: {
      kind: "reported",
      name: "Aspen Journalism",
      url: "https://aspenjournalism.org/colorado-is-examining-water-speculation-and-finding-its-all-the-problems-in-one/",
      date: "2021-05-05",
    },
  },
  {
    place: "Nevada & Arizona",
    name: "Vidler Water → D.R. Horton",
    status: "CLOSED · MAY 2022",
    body: "The largest U.S. homebuilder acquired Vidler Water Resources — a portfolio of water rights and related assets — for $15.75 per share in cash. Announced April 14, closed May 25, 2022. Water rights as an acquisition target at public-market scale, recorded in SEC filings.",
    source: {
      kind: "filed",
      name: "SEC 8-K filings",
      url: "https://www.sec.gov/Archives/edgar/data/830122/000119312522105010/d315776d8k.htm",
      date: "2022-04-14",
    },
  },
  {
    place: "La Paz County, Arizona",
    name: "Fondomonte Arizona",
    status: "STATE LEASES ENDED · PRIVATE PUMPING REPORTED",
    body: "The Saudi-owned alfalfa operation lost its Arizona state-land leases (terminated in 2023, the rest lapsed in 2025) — but pumping is reported to continue on roughly ten thousand privately held acres nearby. Not a river-water transfer; a groundwater-and-land case showing the same pattern from another angle.",
    source: {
      kind: "reported",
      name: "press accounts",
      date: "2025-02-01",
    },
  },
];
