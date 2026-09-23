// Parser checks: load the feed fixture in a real browser and run extension/parse.js on it.
import puppeteer from "puppeteer";
import fs from "node:fs";

const fixture = fs.readFileSync(new URL("./fixture.html", import.meta.url), "utf8");
const parser = fs.readFileSync(new URL("../extension/parse.js", import.meta.url), "utf8");
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? "✔" : "✖"} ${msg}`); if (!ok) failures++; };

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(fixture);
await page.addScriptTag({ content: parser });
const posts = await page.evaluate(() => JevedinParse.findPosts().map(JevedinParse.parsePost));

check(posts.length === 5, `finds the 5 posts and skips the composer and sort control (${posts.length})`);
const [gina, sam, acme, dana, pat] = posts;
check(gina.author === "Gina Growth", `author from the profile aria-label (${gina.author})`);
check(gina.headline === "Growth Coach | 10x your reach", `headline skips the '• 2nd' line (${gina.headline})`);
check(gina.text.startsWith("Agree? 👇") && gina.text.includes("Tag 3 people"), "post text from the expandable text box");
check(gina.social === "1,204 reactions, 893 comments", `engagement counts (${gina.social})`);
check(!gina.promoted && !sam.promoted && acme.promoted, "only the sponsored post is marked promoted");
check(acme.author === "Acme AI", `company author (${acme.author})`);
check(pat.text.includes("SaaStr") && !pat.text.includes("Feed post"), `image post falls back to visible text without chrome (${pat.text})`);
check(pat.media.includes("image"), "image post has image media");
check(new Set(posts.map((p) => p.id)).size === 5, "every post gets a distinct id");

// Same author + text -> same id, on any page, for any user: that's what makes the shared cache work.
const again = await page.evaluate((p) => JevedinParse.postId(p), { author: dana.author, text: dana.text });
check(again === dana.id && /^p[0-9a-z]+$/.test(dana.id), `ids are content fingerprints (${dana.id})`);

await browser.close();
console.log(failures ? `\n${failures} parser check(s) failed` : "\nparser: all checks passed");
process.exit(failures ? 1 : 0);
