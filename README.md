# LinkedOut

A Chrome/Brave extension that draws a colored box around every post in your LinkedIn feed and labels it as **Engagement bait, Humblebrag, AI slop, Broetry, Hiring, Promotion, Real insight, News, Personal**, or any categories you define. Labels come from [Jev](https://docs.typesafe.ai), served through the Vercel AI Gateway.

Sibling project to [SloppyYT](https://github.com/akshatnerella/sloppyyt), which does the same for YouTube.

## Layout

```
extension/   MV3 extension (what ships to the Chrome Web Store). No secrets in here.
  parse.js   Reading LinkedIn's feed DOM, kept separate so it can be tested on a fixture.
server/      Vercel project: POST /api/classify + privacy page. Holds the API keys.
store/       Store listing text, screenshots, promo tile.
tests/       Parser tests against a saved feed fixture, plus settings/popup checks.
scripts/     package.sh builds dist/linkedout-<version>.zip for upload.
```

```
content.js (LinkedIn tab) ──▶ background.js ──▶ https://linkedout.vercel.app/api/classify ──▶ AI Gateway (typesafe-ai/jev)
  finds posts near the           local cache,      validates input + categories,        └─ on 429/503: TypeSafe API direct
  viewport, paints boxes         install ID        shared cache, daily limits
```

- **One Jev call per batch.** Up to 8 posts go into `state.posts`. Each gets a `choice` question (category) and a `boolean` question (is this farming engagement?).
- **Post text is data, never instructions.** The question wording lives on the server, so a post that says "ignore previous instructions" is just text being classified. There's a test for it.
- **No stable post id exists in LinkedIn's DOM**, so posts are identified by a fingerprint of author + text. The same post gets the same id for everyone, which makes the shared cache work across users. The fingerprint can't be reversed into the post.
- **LinkedIn ships hashed class names** (`._48e06e86`) that change every deploy, so `parse.js` selects only on `data-testid`, aria-labels and link shapes.
- **Custom categories.** Up to 12, edited on the settings page. Each description is exactly what Jev reads.

## Develop

```sh
git push                                     # Vercel deploys server/ (AI_GATEWAY_API_KEY + TYPESAFE_API_KEY)
./scripts/package.sh                         # -> dist/linkedout-<version>.zip
cd server && npm test                        # unit tests, no network
cd tests && npm install && npm test          # parser tests against the saved feed fixture
```

**Test locally in Brave/Chrome:** open `brave://extensions`, turn on Developer mode, click **Load unpacked** and pick `extension/`.

**When LinkedIn changes its markup**, `tests/fixture.html` is the thing to refresh: save a feed page, strip personal content, and re-run the parser tests.

## Publish

See `store/LISTING.md` for every field the Chrome Web Store dashboard asks for.
