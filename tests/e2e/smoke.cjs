const { chromium } = require("playwright");
const { seed, install, sessionInit } = require("./mock.cjs");
const OUT = __dirname + "/shots";
require("fs").mkdirSync(OUT, { recursive: true });

const BASE = "http://127.0.0.1:8080";
const PAGES = ["/dashboard", "/members", "/leadership", "/elders", "/activities", "/news", "/finance", "/fund-contributors", "/donation-tracking", "/login"];
const VIEWPORTS = { desktop: [1440, 900], laptop: [1280, 800], tablet: [820, 1180], mobile: [390, 844] };
const IGNORE = /realtime|websocket|Download the React DevTools|favicon|\[vite\]/i;

(async () => {
  const browser = await chromium.launch();
  const failures = [];
  let checks = 0;
  for (const authed of [false, true]) {
    for (const [vpName, [w, h]] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const s = sessionInit(authed);
      if (s.key) await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [s.key, s.value]);
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => m.type() === "error" && !IGNORE.test(m.text()) && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
      await install(page, { authed, db: seed(), log: [] });
      for (const p of PAGES) {
        errors.length = 0;
        await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        const h1 = await page.locator("main h1").first().textContent().catch(() => null);
        checks++;
        const tag = `${authed ? "member" : "guest"}/${vpName}${p}`;
        if (overflow > 1) failures.push(`${tag}: horizontal overflow ${overflow}px`);
        if (!h1) failures.push(`${tag}: no page heading rendered`);
        if (errors.length) failures.push(`${tag}: console errors: ${errors.slice(0, 3).join(" | ")}`);
        if (vpName === "desktop" || vpName === "mobile")
          await page.screenshot({ path: `${OUT}/${authed ? "m" : "g"}-${vpName}-${p.slice(1)}.png`, fullPage: false });
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`checked ${checks} page loads`);
  console.log(failures.length ? "FAILURES:\n" + failures.join("\n") : "ALL PAGE CHECKS PASSED");
})();
