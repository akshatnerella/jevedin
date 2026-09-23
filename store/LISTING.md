# Chrome Web Store submission kit

Upload `dist/linkedout-<version>.zip` (build it with `./scripts/package.sh`) at
https://chrome.google.com/webstore/devconsole, then paste the fields below.

## Store listing

**Name** (comes from the manifest): LinkedOut: Cut the Slop from LinkedIn

**Summary** (132 chars max):
Color-codes every LinkedIn post as engagement bait, humblebrag, AI slop or your own categories, so you can skip the noise.

**Category:** Productivity. Language: English.

**Description:**

Your LinkedIn feed is full of "Agree?", "humbled and honored to announce" and AI-written listicles. LinkedOut puts a colored box around every post and tells you what it really is, so you can skip straight to the posts worth reading.

WHAT IT LABELS
• Engagement bait: "Comment YES", tag-three-friends, repost-if-you-care
• Humblebrag: award and promotion flexes dressed up as gratitude
• AI slop: generic AI-written listicles and hollow corporate prose
• Broetry: one-line-per-sentence stories with a forced business lesson
• Hiring: job openings, recruiters, open-to-work posts
• Promotion: products, courses, webinars and sponsored posts
• Real insight: specific, substantive posts with real numbers and detail
• News: funding rounds, launches, layoffs, industry news
• Personal: genuine life and career milestones

MAKE YOUR OWN CATEGORIES
Want to spot recruiter spam, AI hype or event promos? Add up to 12 categories of your own, describe them in plain English, and LinkedOut sorts your feed by them. Paste any post on the settings page to see how it would be labeled.

YOU'RE IN CONTROL
Set each category to box, dim, hide or off. Hide engagement bait entirely, dim humblebrags, keep real insight front and center. A dashed box means the model is unsure, and hovering any label shows the full breakdown. Toggle LinkedOut anywhere with Alt+Shift+L.

PRIVATE BY DESIGN
• No account or sign-in
• Reads only the posts shown in your LinkedIn feed
• Never touches your messages, connections, profile or any other website

Powered by Jev, a fast decision model from TypeSafe AI. LinkedOut is an independent tool and is not affiliated with or endorsed by LinkedIn.

**Screenshots** (1280×800): `store/screenshot-1-feed.png`, `store/screenshot-2-settings.png`, `store/screenshot-3-welcome.png`
**Small promo tile** (440×280): `store/promo-small-440x280.png`
**Icon:** included in the zip (`icons/icon128.png`)

## Privacy practices tab

**Single purpose:**
Label the posts in a user's LinkedIn feed by type (engagement bait, humblebrag, AI slop, hiring, promotion, insight, news, personal, or user-defined categories) so users can spot and optionally dim or hide them.

**Permission justifications:**
- `storage`: saves the user's settings and custom categories (synced across their browsers), a random install ID used for fair-use rate limiting, and a local cache of labels so posts aren't re-checked.
- Host permission `https://jev-backend.vercel.app/*`: the extension's own backend, which labels the posts. No other hosts are contacted.
- Content script on `linkedin.com`: reads the text of the posts in the feed and draws the labels on the page.

**Remote code:** No, I am not using remote code. (All JS is in the package; the backend returns JSON labels only.)

**Data usage disclosures** (tick these):
- "Website content": yes. The text of feed posts (post text, author name and headline, sponsored/repost flags, visible reaction counts) is sent to the backend to produce labels, together with the user's category names/descriptions.
- Everything else (personally identifiable info, health, financial, authentication, personal communications, location, web history, user activity): **not collected**.

Certify all three: data is not sold to third parties; not used for purposes unrelated to the single purpose; not used for creditworthiness or lending.

**Privacy policy URL:** https://jev-backend.vercel.app/linkedout/privacy.html

**Homepage URL:** https://jev-backend.vercel.app

## Distribution
Public, all regions. Brave, Edge, Arc, Opera and Vivaldi users install from the same Chrome Web Store listing.
