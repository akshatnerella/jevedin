// End-to-end: the real extension on a LinkedIn feed page (the fixture, served at
// https://www.linkedin.com/feed/ via request interception, since the live feed needs a login),
// classified by the production jev-backend.
import puppeteer from "puppeteer";
import fs from "node:fs";

const EXT = new URL("../extension", import.meta.url).pathname;
const fixture = fs.readFileSync(new URL("./fixture.html", import.meta.url), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? "✔" : "✖"} ${msg}`); if (!ok) failures++; };

const browser = await puppeteer.launch({ headless: true, pipe: true, enableExtensions: [EXT], defaultViewport: { width: 1280, height: 1400 } });
try {
  const sw = await (await browser.waitForTarget((t) => t.type() === "service_worker", { timeout: 10000 })).worker();
  const extId = new URL(sw.url()).host;
  await sleep(800);
  check((await browser.pages()).some((p) => p.url().endsWith("/welcome.html")), "welcome page opens on install");

  const page = await browser.newPage();
  await page.bringToFront();
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    const u = r.url();
    if (u.startsWith("https://www.linkedin.com/")) r.respond({ status: 200, contentType: "text/html", body: fixture });
    else if (u.includes("licdn.com")) r.respond({ status: 200, contentType: "image/gif", body: "" });
    else r.continue();
  });
  const t0 = Date.now();
  await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll("[data-je-state=done]").length >= 5, { timeout: 30000, polling: 100 }).catch(() => {});
  console.log(`  labels on screen ${Date.now() - t0}ms after navigation`);
  const labels = await page.evaluate(() => [...document.querySelectorAll("[data-je-id]")].map((el) => ({
    state: el.dataset.jeState, cat: el.dataset.jeCat, label: el.dataset.jeLabel,
    author: el.querySelector("[aria-label^='View ']")?.textContent })));
  labels.forEach((l) => console.log(`    ${(l.label || l.state).padEnd(26)} ${l.author}`));
  const byAuthor = Object.fromEntries(labels.map((l) => [l.author, l]));
  check(labels.length === 5 && labels.every((l) => l.state === "done"), "all 5 posts labeled, nothing pending");
  check(byAuthor["Gina Growth"]?.cat === "engagement_bait", "'Comment YES…' is engagement bait");
  check(byAuthor["Sam Staff"]?.cat === "insight", "latency write-up is real insight");
  check(byAuthor["Acme AI"]?.cat === "promotion", "sponsored post is promotion");
  check(byAuthor["Dana Humble"]?.cat === "humblebrag", "'humbled and honored' is a humblebrag");
  check(!!byAuthor["Pat Photos"]?.cat, `image post labeled (${byAuthor["Pat Photos"]?.cat})`);
  await page.screenshot({ path: "feed.png" });

  // --- Blur: LinkedIn's "Promoted" marker is certain, so that post is blurred until clicked ---
  const acmeState = () => page.evaluate(() => {
    const el = [...document.querySelectorAll("[data-je-id]")].find((x) => x.querySelector("[aria-label='View company: Acme AI']"));
    return { mode: el.dataset.jeMode, revealed: !!el.dataset.jeRevealed, cover: getComputedStyle(el, "::before").content,
      blur: getComputedStyle(el, "::before").backdropFilter, url: location.href };
  });
  let acme = await acmeState();
  check(acme.mode === "blur" && acme.cover.includes("Promoted · click to show") && acme.blur.includes("blur"),
    `promoted post is blurred behind a cover (${acme.mode}, ${acme.cover})`);
  const box = await page.evaluate(() => {
    const el = [...document.querySelectorAll("[data-je-id]")].find((x) => x.querySelector("[aria-label='View company: Acme AI']"));
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(box.x, box.y);
  await sleep(300);
  acme = await acmeState();
  check(acme.revealed && acme.cover === "none" && acme.url === "https://www.linkedin.com/feed/", "one click reveals it and doesn't navigate away");
  check(!(await page.evaluate(() => [...document.querySelectorAll("[data-je-mode='blur']")].some((el) => el.dataset.jePromoted !== "1" && el.dataset.jeCat !== "promotion"))),
    "nothing else is blurred");

  // Setting Promotion to Box doesn't unblur a post LinkedIn itself marked as Promoted...
  await sw.evaluate(async () => {
    const settings = await Jev.load();
    settings.categories.find((c) => c.id === "promotion").mode = "box";
    await Jev.save(settings);
  });
  await sleep(500);
  check((await acmeState()).mode === "blur", "page-marked promoted posts stay blurred even when their category is set to Box");
  // ...but turning the toggle off does.
  await sw.evaluate(async () => {
    const settings = await Jev.load();
    settings.blurSponsored = false;
    await Jev.save(settings);
  });
  await sleep(500);
  check((await acmeState()).mode === "box", "turning off 'Blur promoted posts' shows them normally");

  // Hide engagement bait from the settings page and watch it disappear live.
  const opts = await browser.newPage();
  await opts.goto(`chrome-extension://${extId}/options.html`);
  await opts.waitForSelector(".cat");
  check((await opts.$$(".cat")).length === 9, "9 default categories on the settings page");
  check((await opts.$$eval(".cat .modes", (m) => m[0].textContent)) === "BoxDimBlurHideOff", "settings offer a Blur mode");
  await opts.evaluate(() => {
    const li = [...document.querySelectorAll(".cat")].find((x) => x.querySelector(".name").value === "Engagement bait");
    [...li.querySelectorAll(".modes button")].find((b) => b.textContent === "Hide").click();
  });
  await sleep(700);
  const hidden = await page.evaluate(() => [...document.querySelectorAll("[data-je-cat='engagement_bait']")].every((el) => getComputedStyle(el).display === "none"));
  check(hidden, "setting a category to Hide hides it on the open feed");

  // Test-a-post on the settings page.
  await opts.type("#testTitle", "I fired my best employee today.\n\nShe was brilliant.\n\nBut she was holding the team back.\n\nHere's what I learned about leadership:");
  await opts.click("#testForm button");
  await opts.waitForFunction(() => document.querySelector("#testResult .pill"), { timeout: 20000, polling: 200 }).catch(() => {});
  const verdict = await opts.$eval("#testResult .pill", (e) => e.textContent).catch(() => "");
  check(verdict === "Broetry", `test-a-post labels a broetry post as Broetry (${verdict})`);
  await opts.screenshot({ path: "options.png", fullPage: true });

  const popup = await browser.newPage();
  await popup.setViewport({ width: 340, height: 560 });
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await sleep(600);
  const names = await popup.$$eval(".name", (els) => els.map((e) => e.textContent));
  check(names[0] === "Engagement bait" && names.at(-1) === "Other", "popup lists JevedIn's categories");
  await popup.screenshot({ path: "popup.png" });
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : "\ne2e: all checks passed");
process.exit(failures ? 1 : 0);
