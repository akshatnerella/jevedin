// Server-side validation of the categories a client asks Jev to choose between.
// Clients send their own set (user-editable in the extension); these defaults cover old clients.
import { createHash } from "node:crypto";

export const PROMPT_VERSION = "v1";
export const MAX_CATEGORIES = 13; // 12 user categories + "other"
const ID = /^[a-z0-9_]{1,24}$/;
const MAX_DESCRIPTION = 240;

export const DEFAULT_CATEGORIES = [
  { id: "engagement_bait", description: "A post built to farm reactions rather than say anything: 'Agree?', 'Comment YES and I'll send it', tag-three-friends chains, repost-if-you-care, obvious polls, one-word-answer questions." },
  { id: "humblebrag", description: "Self-promotion dressed up as humility or gratitude: 'humbled and honored to announce', award and promotion flexes, revenue screenshots, staged vulnerability about success." },
  { id: "ai_slop", description: "Generic AI-written filler: listicles of platitudes, 'Here are 7 lessons', hollow corporate prose with no specifics, obviously LLM-generated advice that could apply to anyone." },
  { id: "broetry", description: "A story told one short line at a time with dramatic spacing, building to a fake-deep twist and a forced business lesson." },
  { id: "hiring", description: "Job openings, 'we're hiring', recruiter outreach, referral requests, and candidates announcing they are open to work." },
  { id: "promotion", description: "Promotes a product, service, course, newsletter, webinar, event or the poster's own business, including sponsored posts." },
  { id: "insight", description: "Substantive professional content with specifics: real numbers, technical detail, how something actually worked or failed." },
  { id: "news", description: "Factual industry or world news: funding rounds, layoffs, acquisitions, product launches, regulation, research results." },
  { id: "personal", description: "A genuine personal update or milestone: a new job, graduation, birth, loss, anniversary, or a real life event shared plainly." },
  { id: "other", description: "None of the other categories fit this post." },
];

const OTHER_DESCRIPTION = "None of the other categories fit this post.";

// Returns a clean category list, or null if the input is unusable.
export function sanitizeCategories(input) {
  if (input == null) return DEFAULT_CATEGORIES;
  if (!Array.isArray(input)) return null;
  const seen = new Set();
  const out = [];
  for (const c of input) {
    if (!c || !ID.test(c.id) || seen.has(c.id) || typeof c.description !== "string") return null;
    const description = c.description.replace(/\s+/g, " ").trim().slice(0, MAX_DESCRIPTION);
    if (!description) return null;
    seen.add(c.id);
    out.push({ id: c.id, description: c.id === "other" ? OTHER_DESCRIPTION : description });
  }
  if (!seen.has("other")) out.push({ id: "other", description: OTHER_DESCRIPTION });
  if (out.length < 2 || out.length > MAX_CATEGORIES) return null;
  return out;
}

export function categorySetHash(categories) {
  return createHash("sha256").update(JSON.stringify(categories)).digest("hex").slice(0, 16);
}
