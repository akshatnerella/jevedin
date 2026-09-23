# LinkedOut

A Chrome/Brave extension that draws a colored box around every post in your LinkedIn feed and labels it as **Engagement bait, Humblebrag, AI slop, Broetry, Hiring, Promotion, Real insight, News, Personal**, or any categories you define. Labels come from [Jev](https://docs.typesafe.ai).

This repo is the **client only**. Classification runs on the shared [jev-backend](https://github.com/akshatnerella/jev-backend) at `POST https://jev-backend.vercel.app/api/linkedout/classify`, which also serves [SloppyYT](https://github.com/akshatnerella/jevtube).

## Layout

```
extension/   MV3 extension (what ships to the Chrome Web Store). No secrets in here.
  parse.js   Reading LinkedIn's feed DOM, kept separate so it can be tested on a fixture.
store/       Store listing text, screenshots, promo tile.
tests/       Parser tests and an end-to-end run of the real extension on a feed fixture.
scripts/     package.sh builds dist/linkedout-<version>.zip for upload.
```

```
content.js (LinkedIn tab)              background.js              jev-backend
  finds posts near the viewport,  ──▶   local cache,       ──▶   /api/linkedout/classify
  parses them (parse.js),               install ID               (validation, shared cache,
  paints boxes + labels                                           limits, Jev)
```

- **One Jev call per batch.** Up to 8 posts go into `state.posts`. Each gets a `choice` question (category) and a `boolean` question (is this farming engagement?).
- **Post text is data, never instructions.** The question wording lives in jev-backend, so a post that says "ignore previous instructions" is just text being classified. The live feed already contains bait like this (a promoted post whose whole text was a reversed URL aimed at AI scrapers). jev-backend has a test for it.
- **No stable post id exists in LinkedIn's DOM**, so posts are identified by a fingerprint of author + text. The same post gets the same id for everyone, which makes the shared cache work across users. The fingerprint can't be reversed into the post.
- **LinkedIn ships hashed class names** (`._48e06e86`) that change every deploy, so `parse.js` selects only on `data-testid`, aria-labels and link shapes.
- **Custom categories.** Up to 12, edited on the settings page. Each description is exactly what Jev reads.

## Develop

```sh
./scripts/package.sh                         # -> dist/linkedout-<version>.zip
cd tests && npm install && npm test          # parser checks + the real extension on the fixture, against production
```

**Test locally in Brave/Chrome:** open `brave://extensions`, turn on Developer mode, click **Load unpacked** and pick `extension/`.

**When LinkedIn changes its markup**, `tests/fixture.html` is the thing to refresh: mirror the new structure (with made-up people and posts) and re-run the tests. LinkedIn's live feed needs a login, so the tests serve the fixture at `https://www.linkedin.com/feed/` through request interception and the real extension runs on it.

## Publish

See `store/LISTING.md` for every field the Chrome Web Store dashboard asks for.
