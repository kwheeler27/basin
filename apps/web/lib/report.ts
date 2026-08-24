/**
 * The report's spine: chapters in reading order (docs/IA.md v2).
 * The nav, the report index, the front door, and every chapter's
 * prev/next pager all render from this list — order lives here only.
 */
export type Chapter = {
  slug: string;
  title: string;
  /** The question the chapter answers (DESIGN_PRINCIPLES §1). */
  question: string;
};

export const CHAPTERS: readonly Chapter[] = [
  {
    slug: "the-system",
    title: "The System",
    question:
      "Why is a river 40 million people depend on running a structural deficit?",
  },
  {
    slug: "supply",
    title: "Supply",
    question: "How big is the river — and why is it shrinking?",
  },
  {
    slug: "demand",
    title: "Demand",
    question: "Who consumes the water?",
  },
  {
    slug: "reservoirs",
    title: "Reservoirs",
    question: "How long does the buffer last?",
  },
  {
    slug: "agriculture",
    title: "Agriculture",
    question: "What does the water actually grow?",
  },
  {
    slug: "infrastructure",
    title: "Infrastructure",
    question: "What machines deliver a river uphill?",
  },
  {
    slug: "water-rights",
    title: "Water Rights",
    question: "Who may take water — and how does that change hands?",
  },
  {
    slug: "distribution",
    title: "Distribution",
    question: "Where did the deliveries actually go?",
  },
];

/** The instruments: full-page, stateful, URL-addressable (docs/IA.md v2). */
export type Instrument = {
  slug: string;
  title: string;
  blurb: string;
};

export const INSTRUMENTS: readonly Instrument[] = [
  {
    slug: "map",
    title: "Basin map",
    blurb:
      "The live map — reservoirs, rivers, dams, cities, county water use, and satellite-measured consumption, layer by layer.",
  },
  {
    slug: "rights",
    title: "Rights ledger",
    blurb:
      "333,459 recorded rights served point by point, the largest holders of record, and the live state trackers where rights change hands.",
  },
  {
    slug: "machine",
    title: "Machine explorer",
    blurb:
      "The aqueduct systems one at a time — every pumping plant on real terrain, and how far each one lifts the water.",
  },
  {
    slug: "scenarios",
    title: "Scenario lab",
    blurb:
      "Run the verified operating rules forward over recent-history inflows and see when the thresholds get crossed.",
  },
];
