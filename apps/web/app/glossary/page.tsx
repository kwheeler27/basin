import { GLOSSARY } from "@/lib/glossary";

export const metadata = { title: "Glossary — Basin" };

/**
 * The teaching layer in one place (DESIGN_PRINCIPLES §11). Definitions come
 * from lib/glossary.ts — the same entries that power hover cards in prose
 * and chips in detail sheets — so wording can never fork.
 */
const GROUPS: readonly { title: string; ids: readonly string[] }[] = [
  {
    title: "Units & measures",
    ids: ["acre_foot", "maf", "mgd", "water_year", "storage_capacity"],
  },
  {
    title: "How water use is counted",
    ids: [
      "withdrawal",
      "consumptive_use",
      "irrigation_withdrawal",
      "evapotranspiration",
      "natural_flow",
      "decree_accounting",
      "provisional",
      "satellite_model",
      "census_2015",
      "service_population",
    ],
  },
  {
    title: "Geography & law",
    ids: [
      "basin",
      "watershed",
      "upper_basin",
      "lower_basin",
      "apportionment",
      "reclamation",
      "aqueduct",
    ],
  },
];

export default function Glossary() {
  return (
    <main>
      <h1 className="page-title">Glossary</h1>
      <p className="page-lede">
        Every term this site leans on, in plain language. These same
        definitions appear across the site as hover cards on underlined terms
        and as tappable chips on detail cards — one wording, everywhere.
      </p>
      {GROUPS.map((g) => (
        <section key={g.title}>
          <h2 className="section-title">{g.title}</h2>
          <dl className="glossary-list">
            {g.ids.map((id) => {
              const t = GLOSSARY[id];
              if (!t) return null;
              return (
                <div key={id} className="glossary-row" id={id}>
                  <dt>{t.label}</dt>
                  <dd>{t.short}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </main>
  );
}
