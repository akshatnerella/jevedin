// Reading LinkedIn's feed DOM. Kept separate from the rest of the extension so it can be
// tested against a saved feed fixture (see tests/parse.test.mjs).
//
// LinkedIn ships hashed class names (._48e06e86) that change on every deploy, so nothing here
// selects on a class. The stable hooks are data-testid attributes, aria-labels and link shapes.
(() => {
  const FEED = '[data-testid="mainFeed"]';
  const TEXT_BOX = '[data-testid="expandable-text-box"]';
  const PROFILE_LINK = 'a[href*="/in/"], a[href*="/company/"], a[href*="/school/"]';

  const clean = (s) => (s || "").replace(/[ \t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const oneLine = (s) => clean(s).replace(/\s+/g, " ");

  // Posts are the direct children of the feed container that actually hold a post.
  function findPosts(root = document) {
    const feed = root.querySelector(FEED);
    const candidates = feed ? [...feed.children] : [...root.querySelectorAll("[data-view-name='feed-full-update']")];
    return candidates.filter(isPost);
  }

  function isPost(el) {
    if (!el.querySelector) return false;
    if (!el.querySelector(TEXT_BOX) && !el.querySelector(PROFILE_LINK)) return false;
    const text = el.innerText || "";
    return /^\s*Feed post/.test(text) || !!el.querySelector(TEXT_BOX);
  }

  // LinkedIn wraps posts in zero-height layout divs; the box goes on the first child with a size.
  function paintTarget(el) {
    let t = el;
    while (t && !t.getBoundingClientRect().height) t = t.firstElementChild;
    return t || el;
  }

  function authorOf(el) {
    const viewLabel = [...el.querySelectorAll("[aria-label]")]
      .map((x) => x.getAttribute("aria-label"))
      .find((l) => /^View /.test(l));
    if (viewLabel) {
      const m = viewLabel.match(/^View (?:company: |page: )?(.+?)(?:['’]s profile)?$/);
      if (m) return oneLine(m[1]);
    }
    const link = el.querySelector(PROFILE_LINK);
    return oneLine(link?.innerText || "");
  }

  // Lines of chrome LinkedIn puts inside the post that aren't the post itself.
  const NOISE = /^(Feed post|Promoted|Follow|Following|\+ Follow|Like|Comment|Repost|Send|See more|…more|more|Load more comments|Activate to view larger image|Video Player|Play|Mute|Copy link to post|\d+(st|nd|rd|th))$/i;
  const SOCIAL = /^[\d,.]+[KM]?\s*(reactions?|comments?|reposts?|impressions?|likes?)\b/i;
  const FOLLOWERS = /^[\d,.]+[KM]?\s*followers?$/i;
  const TIME_AGO = /^\d+\s*(s|m|h|d|w|mo|y|second|minute|hour|day|week|month|year)s?\b.*$/i;
  // Connection degree, on its own line ("• 1st") or after the name ("Jane Doe • 2nd").
  const DEGREE = /(^|\s)•\s*(1st|2nd|3rd\+?|Following|Author)\s*$/i;

  function parsePost(el) {
    const rawLines = (el.innerText || "").split("\n").map(oneLine).filter(Boolean);
    const author = authorOf(el);
    const promoted =
      rawLines.some((l) => /^Promoted$/i.test(l)) ||
      !!el.querySelector('[aria-label*="Sponsored" i]');
    const repost = /\breposted this\b/i.test(rawLines.slice(0, 4).join(" "));

    // The author's headline is the first real line after their name.
    const isChrome = (l) =>
      l === author || DEGREE.test(l) || NOISE.test(l) || SOCIAL.test(l) || FOLLOWERS.test(l) || TIME_AGO.test(l);
    const at = rawLines.findIndex((l) => l === author || l.startsWith(`${author} •`));
    const headline = at >= 0 ? rawLines.slice(at + 1, at + 4).find((l) => !isChrome(l)) || "" : "";

    let text = clean(el.querySelector(TEXT_BOX)?.innerText || "");
    if (!text) {
      // Image-only posts, some reposts, and layout variants: rebuild from the visible lines,
      // skipping the author block and LinkedIn's own chrome.
      text = rawLines
        .filter((l) => !isChrome(l) && l !== headline && !l.startsWith(`${author} •`))
        .slice(0, 12)
        .join(" ")
        .trim();
    }

    const social = rawLines.filter((l) => SOCIAL.test(l)).slice(0, 2).join(", ");
    const media = [
      el.querySelector('video, [aria-label*="Video Player" i]') && "video",
      el.querySelector('img[src*="media"], img[src*="dms-image"]') && "image",
      el.querySelector('[aria-label*="document" i], [data-testid*="document" i]') && "document",
      /\bPoll\b|\bvotes?\b/i.test(rawLines.join(" ")) && "poll",
    ].filter(Boolean);

    if (!text && !author) return null;
    const post = {
      author,
      headline: headline === author ? "" : headline,
      text: text.slice(0, 1500),
      promoted,
      repost,
      media: media.join(", "),
      social,
    };
    post.id = postId(post);
    return post;
  }

  // Content-addressed: the same post gets the same id for every user, so the shared cache works
  // even though LinkedIn exposes no stable post id in the DOM.
  function postId(post) {
    const str = `${post.author}|${post.text.slice(0, 400)}`;
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return `p${n.toString(36)}`;
  }

  self.JevedinParse = { FEED, TEXT_BOX, findPosts, isPost, parsePost, paintTarget, postId };
})();
