/**
 * Map QA harness — captures EVERY story step at BOTH viewports.
 *
 * Desktop and mobile ship from one codebase, but they only stay in sync if
 * both are looked at. Run this before deploying any map change and eyeball
 * the grid (docs/MAP_DESIGN.md — the validator checks color, not layout).
 *
 *   pnpm start -p 3111   (in another shell, after pnpm build)
 *   pnpm qa:map
 *
 * Output: .qa/<viewport>-step<N>.png + a tap-through smoke test that fails
 * loudly if the detail sheet stops opening on either viewport.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.QA_BASE ?? "http://localhost:3111";
const VIEWPORTS = [
  { name: "desktop", width: 1360, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const STEPS = [0, 1, 2, 3, 4]; // story chapters; explore is the hero on top

mkdirSync(".qa", { recursive: true });
const browser = await chromium.launch();
let failures = 0;

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: vp });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));

  for (const step of STEPS) {
    await page.goto(`${BASE}/report/the-system?step=${step}`, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `.qa/${vp.name}-step${step}.png`, fullPage: step === 0 });
  }

  // smoke: the explore map must render its six layer pills and switch layers
  await page.goto(`${BASE}/explore/map`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(2600);
  const pills = await page.locator(".explore-hero .story-radio").count();
  if (pills !== 6) { console.error(`✗ ${vp.name}: hero has ${pills} pills, expected 6`); failures++; }
  else {
    await page.locator(".explore-hero .story-radio.flows").evaluate((el) => el.click());
    await page.waitForTimeout(300);
    const on = await page.locator(".explore-hero .story-radio.flows.on").count();
    if (on !== 1) { console.error(`✗ ${vp.name}: hero layer switch broken`); failures++; }
    else console.log(`✓ ${vp.name}: hero pills + layer switch`);
  }
  await page.screenshot({ path: `.qa/${vp.name}-hero.png` });

  // smoke: the rights stage must render its four layers and open a county sheet
  await page.goto(`${BASE}/explore/rights`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(1500);
  const rPills = await page.locator(".rightsmap .story-radio").count();
  const rCounties = await page.locator(".rightsmap .rm-county").count();
  if (rPills !== 4 || rCounties < 200) {
    console.error(`✗ ${vp.name}: rights stage broken (pills=${rPills}, counties=${rCounties})`); failures++;
  } else {
    await page.locator(".rightsmap .rm-county:not(.nodata)").first().evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.waitForTimeout(400);
    const rSheet = (await page.locator(".sheet").count()) === 1;
    if (!rSheet) { console.error(`✗ ${vp.name}: rights county sheet did not open`); failures++; }
    else console.log(`✓ ${vp.name}: rights stage (${rCounties} counties, sheet opens)`);
    await page.keyboard.press("Escape");
  }
  await page.screenshot({ path: `.qa/${vp.name}-rights.png` });

  // smoke: tapping the largest farm circle must open the sheet with chips
  await page.goto(`${BASE}/report/the-system?step=4`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(2600);
  const circles = await page.locator(".story:not(.explore-hero) circle.st-farm").all();
  let biggest = null, r0 = 0;
  for (const c of circles) {
    const r = parseFloat(await c.getAttribute("r"));
    if (r > r0) { r0 = r; biggest = c; }
  }
  if (!biggest) { console.error(`✗ ${vp.name}: no farm circles rendered`); failures++; }
  else {
    await biggest.click({ force: true });
    await page.waitForTimeout(400);
    const sheetOk = (await page.locator(".sheet").count()) === 1;
    const chips = await page.locator(".term-chip").count();
    if (!sheetOk || chips < 2) { console.error(`✗ ${vp.name}: tap sheet broken (sheet=${sheetOk}, chips=${chips})`); failures++; }
    else console.log(`✓ ${vp.name}: ${circles.length} circles, sheet + ${chips} chips`);
  }
  if (errors.length) { console.error(`✗ ${vp.name} page errors:`, errors); failures++; }
  await page.close();
}

await browser.close();
if (failures) { console.error(`\n✗ map QA failed (${failures})`); process.exit(1); }
console.log(`\n✓ both viewports captured to .qa/ — now EYEBALL them`);
