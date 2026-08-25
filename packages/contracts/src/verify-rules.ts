/**
 * Drift guard: replay every Python-computed vector through the TS evaluator.
 *
 * The rulebook data is generated from Python, but evaluation is implemented
 * twice (Python for the model, TypeScript for the web). This asserts they
 * agree at every band boundary and either side of it. CI runs it; any
 * divergence fails the build.
 *
 * Run: pnpm verify:rules
 */

import {
  RULE_VECTORS,
  SUCCESSOR_VECTORS,
  determineMead,
  determinePowell,
  determinePowellRange,
} from "./rules";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`  ✗ ${label}: TS ${a} !== Python ${e}`);
    failures++;
  }
}

for (const v of RULE_VECTORS.mead) {
  const d = determineMead(v.elevation);
  const at = `mead @ ${v.elevation} ft`;
  check(`${at} tierLabel`, d.tierLabel, v.tierLabel);
  check(`${at} arizona`, d.arizona, v.arizona);
  check(`${at} nevada`, d.nevada, v.nevada);
  check(`${at} california`, d.california, v.california);
  check(`${at} mexicoReduction`, d.mexicoReduction, v.mexicoReduction);
  check(`${at} mexicoSavings`, d.mexicoSavings, v.mexicoSavings);
  check(`${at} usLowerBasin`, d.usLowerBasin, v.usLowerBasin);
  check(`${at} totalIncludingSavings`, d.totalIncludingSavings, v.totalIncludingSavings);
}

for (const v of RULE_VECTORS.powell) {
  const d = determinePowell(v.powellElevation, v.meadElevation);
  const at = `powell @ ${v.powellElevation} ft (mead ${v.meadElevation})`;
  check(`${at} tier`, d.tier, v.tier);
  check(`${at} releaseAf`, d.releaseAf, v.releaseAf);
  check(`${at} balancingRange`, d.balancingRange, v.balancingRange);
  check(`${at} meadOverrideApplied`, d.meadOverrideApplied, v.meadOverrideApplied);
  check(`${at} releaseOrMidpoint`, d.releaseOrMidpoint, v.releaseOrMidpoint);
}

for (const v of SUCCESSOR_VECTORS) {
  const d = determinePowellRange(v.projectedOct1Elevation);
  const at = `og2027 powell @ projected ${v.projectedOct1Elevation} ft`;
  check(`${at} rangeName`, d.rangeName, v.rangeName);
  check(`${at} releaseLadderAf`, d.releaseLadderAf, v.releaseLadderAf);
  check(`${at} releaseFloorAf`, d.releaseFloorAf, v.releaseFloorAf);
  check(`${at} protectionTargetFt`, d.protectionTargetFt, v.protectionTargetFt);
}

const total =
  RULE_VECTORS.mead.length +
  RULE_VECTORS.powell.length +
  SUCCESSOR_VECTORS.length;
if (failures > 0) {
  console.error(`\n✗ rules drift: ${failures} mismatch(es) across ${total} vectors`);
  process.exit(1);
}
console.log(
  `✓ TS evaluator matches Python engine across ${total} vectors ` +
    `(${RULE_VECTORS.mead.length} mead, ${RULE_VECTORS.powell.length} powell, ` +
    `${SUCCESSOR_VECTORS.length} og2027)`,
);
