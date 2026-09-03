import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:4123/", { waitUntil: "networkidle" });
const row = p.locator(".rb-row.db-tappable").first();
await row.hover();
await p.waitForTimeout(350);
const visible = await p.locator(".sheet").isVisible();
console.log("sheet on hover:", visible);
// move pointer into the sheet — must stay open
const sb = await p.locator(".sheet").boundingBox();
await p.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2, { steps: 8 });
await p.waitForTimeout(350);
console.log("still open inside sheet:", await p.locator(".sheet").isVisible());
await p.screenshot({ path: "/private/tmp/claude-501/-Users-kevinwheeler-projects/2b58ccf9-3eea-4520-89bf-8a0adac36fdc/scratchpad/hover-sheet.png" });
// leave — must close
await p.mouse.move(30, 30, { steps: 8 });
await p.waitForTimeout(450);
console.log("closed after leaving:", !(await p.locator(".sheet").isVisible()));
await b.close();
