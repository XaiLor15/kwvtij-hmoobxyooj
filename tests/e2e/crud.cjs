const { chromium } = require("playwright");
const { seed, install, sessionInit } = require("./mock.cjs");
const BASE = "http://127.0.0.1:8080";
const results = [];
const ok = (name, cond, info = "") => { console.log((cond?"PASS":"FAIL")+"  "+name+(info?"  — "+info:"")); return results.push(`${cond ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); };

(async () => {
  const browser = await chromium.launch();
  global.__b = browser;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const s = sessionInit(true);
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [s.key, s.value]);
  const page = await ctx.newPage();
  const db = seed();
  const log = [];
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await install(page, { authed: true, db, log });
  const dialog = () => page.getByRole("dialog");
  const settle = () => page.waitForTimeout(500);
  page.setDefaultTimeout(8000);

  // 1) Add member with a parent → generation computed, relation row written
  await page.goto(BASE + "/members?action=add");
  await dialog().waitFor(); 
  await dialog().getByLabel("ຊື່ ແລະ ນາມສະກຸນ").fill("ທ້າວ ທົດສອບ ລະບົບ");
  await dialog().getByLabel("ວັນເດືອນປີເກີດ").fill("2010-05-01");
  await dialog().getByRole("combobox", { name: "ພໍ່ / ແມ່" }).click();
  await page.getByRole("option", { name: /ສົມພອນ/ }).click();
  const genHint = await dialog().getByText(/ລຸ້ນ: ລຸ້ນທີ 3/).count();
  ok("generation auto-computed from parent (Phaj 3)", genHint > 0);
  await dialog().getByRole("button", { name: "ບັນທຶກ" }).click();
  await settle();
  const added = db.members.find((m) => m.name === "ທ້າວ ທົດສອບ ລະບົບ");
  ok("member inserted with parent_id=3 and gen=3", added && added.parent_id === 3 && added.gen === 3, JSON.stringify(added && { p: added.parent_id, g: added.gen, age: added.age }));
  ok("child relation inserted", db.member_relations.some((r) => r.related_id === added?.id && r.member_id === 3));
  ok("age stored from birthdate (16)", added?.age === 16);
  ok("new member visible in table", (await page.getByText("ທ້າວ ທົດສອບ ລະບົບ").count()) > 0);

  // 2) Cycle guard: editing the root ancestor must not allow a descendant as parent
  await page.goto(BASE + "/members?edit=1");
  await dialog().waitFor();
  await dialog().getByRole("combobox", { name: "ພໍ່ / ແມ່" }).click();
  const descendant = page.getByRole("option", { name: /ນັນທະວົງ/ });
  ok("descendant shown as disabled parent option", (await descendant.getAttribute("aria-disabled")) === "true");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await settle();

  // 3) Duplicate detection
  await page.goto(BASE + "/members?action=add");
  await dialog().waitFor();
  await dialog().getByLabel("ຊື່ ແລະ ນາມສະກຸນ").fill("ທ້າວ ບຸນມີ ແສງສະຫວັນ");
  await dialog().getByLabel("ວັນເດືອນປີເກີດ").fill("1947-03-12");
  const before = db.members.length;
  await dialog().getByRole("button", { name: "ບັນທຶກ" }).click();
  await settle();
  ok("duplicate warning blocks first save", db.members.length === before && (await dialog().getByText("ອາດມີຂໍ້ມູນຊ້ຳ:").count()) > 0);
  await dialog().getByRole("button", { name: "ຍົກເລີກ" }).click();

  // 4) Finance: add income with explicit date → balance updates (signed)
  await page.goto(BASE + "/finance?action=income");
  await dialog().waitFor();
  await dialog().getByLabel("ຈຳນວນເງິນ (ກີບ)").fill("50000");
  await dialog().getByLabel("ວັນທີ").fill("2026-11-02");
  await dialog().getByRole("button", { name: "ບັນທຶກ" }).click();
  await settle();
  const tx = db.transactions.find((t) => t.amount === 50000);
  ok("income transaction inserted with chosen date", tx?.date === "2026-11-02" && tx.direction === "income", tx?.id);
  ok("transaction id is collision-resistant format", /^TXN-[0-9A-Z]+-[0-9A-Z]{4}$/.test(tx?.id ?? ""));
  ok("balance shows signed total -730,000 ₭", (await page.getByText("-730,000 ₭").count()) > 0);
  await page.getByRole("radio", { name: "ເດືອນນີ້" }).click();
  ok("date-range filter applies (this month = 50,000 balance)", (await page.getByText("50,000 ₭").first().count()) > 0 && (await page.getByText("-730,000 ₭").count()) === 0);

  // 5) Fund: remove a member → success toast with Undo (old code always showed failure)
  await page.goto(BASE + "/fund-contributors");
  await page.getByRole("button", { name: "ເອົາອອກຈາກກອງທຶນ" }).first().waitFor();
  const fmBefore = db.fund_members.length;
  await page.getByRole("button", { name: "ເອົາອອກຈາກກອງທຶນ" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "ເອົາອອກ" }).click();
  await settle();
  ok("fund member deleted", db.fund_members.length === fmBefore - 1);
  ok("success toast with Undo shown", (await page.getByRole("button", { name: "ຍົກເລີກ" }).count()) > 0 && (await page.getByText("ບໍ່ສາມາດລຶບໄດ້").count()) === 0);
  await page.getByRole("button", { name: "ຍົກເລີກ" }).first().click();
  await settle();
  ok("Undo restores the enrolment", db.fund_members.length === fmBefore);

  // 6) Activities: create event, end time before start is rejected
  await page.goto(BASE + "/activities?action=add");
  await dialog().waitFor();
  await dialog().getByLabel("ຊື່ກິດຈະກຳ").fill("ງານທົດສອບ");
  await dialog().getByLabel("ວັນທີ").fill("2026-12-20");
  await dialog().getByLabel("ເລີ່ມ").fill("10:00");
  await dialog().getByLabel("ສິ້ນສຸດ").fill("09:00");
  await dialog().getByLabel("ສະຖານທີ່").fill("ບ້ານ");
  await dialog().getByRole("button", { name: "ບັນທຶກ" }).click();
  await settle();
  ok("end-before-start rejected", (await dialog().getByText("ເວລາສິ້ນສຸດຕ້ອງຫຼັງເວລາເລີ່ມ").count()) > 0);
  await dialog().getByLabel("ສິ້ນສຸດ").fill("12:00");
  await dialog().getByRole("button", { name: "ບັນທຶກ" }).click();
  await settle();
  const ev = db.events.find((e) => e.title === "ງານທົດສອບ");
  ok("event inserted with time range", ev?.time === "10:00 – 12:00");
  ok("detail sheet opened for the new event", (await page.getByRole("dialog").getByText("ງານທົດສອບ").count()) > 0);

  // 7) News drafts visible to members (with badge)
  await page.goto(BASE + "/news");
  await page.getByText("ຮ່າງ: ແຜນງົບປະມານ").waitFor().catch(() => {});
  ok("member sees draft with badge", (await page.getByText("ຮ່າງ: ແຜນງົບປະມານ").count()) > 0 && (await page.getByText("ສະບັບຮ່າງ").count()) > 0);

  // 8) Delete member
  await page.goto(BASE + `/members?member=${added.id}`);
  await page.getByRole("dialog").getByRole("button", { name: "ລຶບ" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "ລຶບ" }).click();
  await settle();
  ok("member deleted", !db.members.some((m) => m.id === added.id));

  ok("no uncaught page errors", errors.length === 0, errors.join(" | "));
  await page.screenshot({ path: __dirname + "/shots/crud-end.png" });

  // Guest: drafts hidden, no write controls, no member edit
  const g = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const gp = await g.newPage();
  await install(gp, { authed: false, db: seed(), log: [] });
  await gp.goto(BASE + "/news");
  await gp.waitForTimeout(800);
  ok("guest does not see draft news", (await gp.getByText("ຮ່າງ: ແຜນງົບປະມານ").count()) === 0);
  await gp.goto(BASE + "/members?member=1");
  await gp.waitForTimeout(800);
  ok("guest has no edit/delete in member sheet", (await gp.getByRole("dialog").getByRole("button", { name: /ແກ້ໄຂ|ລຶບ/ }).count()) === 0);
  ok("guest sees no phone (login prompt instead)", (await gp.getByText("ເຂົ້າລະບົບເພື່ອເບິ່ງ").count()) > 0);
  await gp.goto(BASE + "/members?action=add");
  await gp.waitForTimeout(600);
  ok("guest deep-link ?action=add does not open form", (await gp.getByRole("dialog").count()) === 0);

  await browser.close();
  console.log("\nwrites:", log.join(", "));
  const fails = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
})().catch((e) => {
  console.log(results.join("\n"));
  console.error("CRASH", e.message);
  global.__b?.close();
});
