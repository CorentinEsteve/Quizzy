const DEFAULT_FEEDS = [
  {
    name: "Reuters World",
    url: "https://feeds.reuters.com/Reuters/worldNews"
  },
  {
    name: "Reuters Business",
    url: "https://feeds.reuters.com/reuters/businessNews"
  },
  {
    name: "Reuters Technology",
    url: "https://feeds.reuters.com/reuters/technologyNews"
  },
  {
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml"
  },
  {
    name: "BBC Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml"
  },
  {
    name: "NPR World",
    url: "https://feeds.npr.org/1004/rss.xml"
  },
  {
    name: "NPR Business",
    url: "https://feeds.npr.org/1006/rss.xml"
  },
  {
    name: "AP News",
    url: "https://apnews.com/hub/apf-topnews?output=1"
  },
  {
    name: "The Guardian World",
    url: "https://www.theguardian.com/world/rss"
  },
  {
    name: "The Guardian Business",
    url: "https://www.theguardian.com/business/rss"
  }
];

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1/responses";
const RECENT_NEWS_MAX_AGE_DAYS = 365;
const MIN_HEADLINE_LENGTH = 20;
const MAX_HEADLINE_LENGTH = 130;
const MIN_HEADLINE_WORDS = 4;
const HEADLINE_BANNED_PATTERNS = [
  /\band other\b/i,
  /\bfascinating\b/i,
  /\b(opinion|analysis|newsletter|podcast)\b/i,
  /\blive updates?\b/i,
  /^\s*watch[:\s]/i
];

function decodeEntities(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return decodeEntities(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function textBetween(item, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = item.match(regex);
  return match?.[1] ? stripHtml(match[1]) : "";
}

function normalizeLink(value) {
  if (typeof value !== "string") return "";
  const cleaned = value.trim();
  if (!cleaned) return "";
  if (!/^https?:\/\//i.test(cleaned)) return "";
  return cleaned;
}

function normalizeTitle(value) {
  return stripHtml(value).toLowerCase();
}

function normalizeFingerprint(value) {
  return normalizeSentence(value).toLowerCase();
}

function parseRssItems(xml, sourceName) {
  if (typeof xml !== "string" || !xml.trim()) return [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  return itemMatches
    .map((item) => {
      const title = sanitizeHeadline(textBetween(item, "title"));
      const link = normalizeLink(textBetween(item, "link"));
      const description = sanitizeHeadline(textBetween(item, "description"));
      const pubDateRaw = textBetween(item, "pubDate");
      const publishedAtMs = Date.parse(pubDateRaw || "");
      const publishedAt = Number.isFinite(publishedAtMs)
        ? new Date(publishedAtMs).toISOString()
        : null;
      if (!title || !link || !hasMinimumHeadlineQuality(title)) return null;
      return {
        title,
        link,
        description,
        publishedAt,
        source: sourceName
      };
    })
    .filter(Boolean);
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(items, seedValue) {
  const list = [...items];
  const random = mulberry32(hashString(seedValue));
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function toDisplayDate(isoOrNull) {
  if (!isoOrNull) return "today";
  const dt = new Date(isoOrNull);
  if (Number.isNaN(dt.getTime())) return "today";
  return dt.toISOString().slice(0, 10);
}

function asLocalized(text) {
  const safe = typeof text === "string" ? text.trim() : "";
  return { en: safe, fr: safe };
}

function normalizeSentence(text) {
  return String(text || "")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/["“”]/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeHeadline(text) {
  return normalizeSentence(text)
    .replace(/\s*[-|]\s*Reuters$/i, "")
    .replace(/\s*[-|]\s*BBC News$/i, "")
    .trim();
}

function hasMinimumHeadlineQuality(text) {
  const clean = sanitizeHeadline(text);
  if (!clean) return false;
  if (clean.length < MIN_HEADLINE_LENGTH || clean.length > MAX_HEADLINE_LENGTH) return false;
  if (clean.split(/\s+/).length < MIN_HEADLINE_WORDS) return false;
  if (HEADLINE_BANNED_PATTERNS.some((pattern) => pattern.test(clean))) return false;
  return true;
}

function trimToWordBoundary(text, maxLength) {
  const safe = normalizeSentence(text);
  if (safe.length <= maxLength) return safe;
  const sliced = safe.slice(0, maxLength + 1);
  const boundary = sliced.lastIndexOf(" ");
  const trimmed = boundary > 24 ? sliced.slice(0, boundary) : safe.slice(0, maxLength);
  return `${trimmed.trim()}...`;
}

function compactHeadlineLabel(title, fallbackSource) {
  const safe = sanitizeHeadline(title);
  if (!safe) return fallbackSource || "Headline";

  const candidates = [
    safe.split(" - ")[0],
    safe.includes(":") ? safe.split(":").slice(1).join(":").trim() : "",
    safe.split("|")[0]
  ]
    .map((item) => item.trim())
    .filter(Boolean);

  const best = candidates
    .sort((a, b) => a.length - b.length)
    .find((item) => item.length >= 18 && item.length <= 64);

  return trimToWordBoundary(best || safe, 84);
}

const ANCHOR_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "who",
  "what",
  "when",
  "where",
  "why",
  "how",
  "could",
  "would",
  "should",
  "might",
  "will",
  "can",
  "be",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "about",
  "after",
  "amid",
  "over",
  "under",
  "from",
  "into"
]);

function extractTitleAnchor(title) {
  const clean = sanitizeHeadline(title);
  if (!clean) return "this story";

  const properNounMatches = clean.match(
    /\b(?:[A-Z][A-Za-z-]+|[A-Z]{2,})(?:\s+(?:[A-Z][A-Za-z-]+|[A-Z]{2,}|of|the|and)){0,3}\b/g
  );
  if (properNounMatches?.length) {
    const filtered = properNounMatches
      .map((part) => part.trim())
      .find((part) => part.length >= 4 && !/^The\b/.test(part));
    if (filtered) return trimToWordBoundary(filtered, 44);
  }

  const numberPhrase = clean.match(/\b\d[\d,]*(?:\.\d+)?(?:\s*(?:lb|%|m|bn|million|billion))?(?:\s+[A-Za-z][A-Za-z'-]{2,}){0,2}\b/i);
  if (numberPhrase?.[0]) {
    return trimToWordBoundary(numberPhrase[0], 44);
  }

  const tokens = clean
    .replace(/[^A-Za-z0-9'\-\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const startIndex = tokens.findIndex(
    (token) => token.length >= 4 && !ANCHOR_STOP_WORDS.has(token.toLowerCase())
  );
  if (startIndex >= 0) {
    const phraseTokens = [];
    for (let i = startIndex; i < tokens.length; i += 1) {
      const lower = tokens[i].toLowerCase();
      if (ANCHOR_STOP_WORDS.has(lower) && phraseTokens.length > 0) break;
      if (tokens[i].length < 3) continue;
      phraseTokens.push(tokens[i]);
      if (phraseTokens.length >= 2) break;
    }
    const phrase = phraseTokens.join(" ").trim();
    if (phrase) return trimToWordBoundary(phrase, 44);
  }

  return trimToWordBoundary(clean, 44);
}

function buildPromptSnippet(title) {
  const clean = sanitizeHeadline(title);
  if (!clean) return "recent events";
  const anchor = extractTitleAnchor(clean);
  const escapedAnchor = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const anchorRegex = new RegExp(`\\b${escapedAnchor}\\b`, "i");
  const masked = clean.replace(anchorRegex, "____");
  const normalizedMasked = normalizeSentence(masked);
  if (normalizedMasked.includes("____")) {
    return trimToWordBoundary(normalizedMasked, 86);
  }
  const fallbackAnchor = clean
    .split(/\s+/)
    .find((token) => token.length >= 4 && !ANCHOR_STOP_WORDS.has(token.toLowerCase()));
  if (fallbackAnchor) {
    return trimToWordBoundary(
      normalizeSentence(clean.replace(new RegExp(`\\b${fallbackAnchor}\\b`, "i"), "____")),
      86
    );
  }
  return trimToWordBoundary(clean, 86);
}

function buildQuestionPrompt(item, index) {
  const snippet = buildPromptSnippet(item?.title || "");
  const templates = [
    (safeSnippet) => `Which headline best matches this summary: ${safeSnippet}?`,
    (safeSnippet) => `Select the headline that matches this recent summary: ${safeSnippet}?`,
    (safeSnippet) => `Which recent headline fits this summary: ${safeSnippet}?`,
    (safeSnippet) => `Pick the headline that matches: ${safeSnippet}?`
  ];
  return templates[index % templates.length](snippet);
}

const TITLE_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "to",
  "of",
  "and",
  "in",
  "on",
  "for",
  "with",
  "after",
  "amid",
  "over",
  "as",
  "at",
  "is",
  "are",
  "be",
  "by",
  "from",
  "new",
  "says",
  "say",
  "could",
  "will",
  "into",
  "about"
]);

function tokenizeTitle(text) {
  return normalizeSentence(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !TITLE_STOP_WORDS.has(token));
}

function scoreDistractor(targetTokens, candidateTokens) {
  if (!targetTokens.length || !candidateTokens.length) return 0;
  const targetSet = new Set(targetTokens);
  let shared = 0;
  for (const token of candidateTokens) {
    if (targetSet.has(token)) shared += 1;
  }
  return shared / Math.max(targetSet.size, 1);
}

function isRecentNewsItem(item, nowMs = Date.now(), maxAgeDays = RECENT_NEWS_MAX_AGE_DAYS) {
  const publishedAtMs = Date.parse(item?.publishedAt || "");
  if (!Number.isFinite(publishedAtMs)) return true;
  const ageMs = Math.max(nowMs - publishedAtMs, 0);
  return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

function buildQuestionFingerprint(question) {
  const prompt = normalizeFingerprint(question?.prompt?.en || "");
  const sourceUrl = normalizeFingerprint(question?.agentMeta?.sourceUrl || "");
  const topic = normalizeFingerprint(question?.agentMeta?.topic || "");
  return sourceUrl || `${topic}|${prompt}`;
}

export async function fetchNewsItems({
  fetchImpl,
  feeds = DEFAULT_FEEDS,
  timeoutMs = 7000,
  maxItemsPerFeed = 20
}) {
  const resolvedFetch = fetchImpl || globalThis.fetch;
  if (typeof resolvedFetch !== "function") {
    return { items: [], feedCount: feeds.length, succeededFeeds: 0, failedFeeds: feeds.length };
  }

  const settled = await Promise.allSettled(
    feeds.map(async (feed) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const response = await resolvedFetch(feed.url, {
          method: "GET",
          signal: ctrl.signal,
          headers: {
            "User-Agent": "Qwizzy-AgenticDailyQuiz/1.0"
          }
        });
        if (!response.ok) {
          throw new Error(`Feed ${feed.name} failed with status ${response.status}`);
        }
        const xml = await response.text();
        return parseRssItems(xml, feed.name).slice(0, maxItemsPerFeed);
      } finally {
        clearTimeout(timer);
      }
    })
  );

  const dedupeByTitle = new Set();
  const dedupeByLink = new Set();
  const items = [];
  let succeededFeeds = 0;
  let failedFeeds = 0;

  for (const result of settled) {
    if (result.status === "fulfilled") {
      succeededFeeds += 1;
      for (const item of result.value) {
        const titleKey = normalizeTitle(item.title);
        if (!titleKey || dedupeByTitle.has(titleKey) || dedupeByLink.has(item.link)) continue;
        dedupeByTitle.add(titleKey);
        dedupeByLink.add(item.link);
        items.push(item);
      }
    } else {
      failedFeeds += 1;
    }
  }

  const sorted = items.sort((a, b) => {
    const aTs = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTs = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bTs - aTs;
  });

  return {
    items: sorted,
    feedCount: feeds.length,
    succeededFeeds,
    failedFeeds
  };
}

export function buildRuleDraftQuestions({
  dateKey,
  newsItems,
  count = 18,
  excludedSourceUrls = [],
  excludedTopics = []
}) {
  if (!Array.isArray(newsItems) || newsItems.length < 4) return [];
  const excludedSourceUrlSet = new Set(
    (excludedSourceUrls || []).map((value) => normalizeFingerprint(value)).filter(Boolean)
  );
  const excludedTopicSet = new Set(
    (excludedTopics || []).map((value) => normalizeFingerprint(value)).filter(Boolean)
  );
  const eligible = newsItems.filter((item) => {
    const sourceUrl = normalizeFingerprint(item?.link || "");
    const topic = normalizeFingerprint(item?.title || "");
    if (!isRecentNewsItem(item)) return false;
    if (excludedSourceUrlSet.has(sourceUrl)) return false;
    if (excludedTopicSet.has(topic)) return false;
    return true;
  });
  if (eligible.length < 4) return [];
  const shuffled = seededShuffle(eligible, `${dateKey}:rule-draft`);
  const picked = shuffled.slice(0, Math.min(shuffled.length, count));
  const tokensByLink = new Map(
    eligible.map((item) => [item.link, tokenizeTitle(item.title)])
  );

  return picked.map((item, index) => {
    const targetTokens = tokensByLink.get(item.link) || [];
    const rankedDistractors = shuffled
      .filter((candidate) => candidate.link !== item.link)
      .map((candidate) => ({
        item: candidate,
        score: scoreDistractor(targetTokens, tokensByLink.get(candidate.link) || []),
        sameSource: candidate.source === item.source ? 1 : 0
      }))
      .sort((a, b) => b.sameSource - a.sameSource || b.score - a.score)
      .map((entry) => entry.item);

    const distractors = rankedDistractors.slice(0, 3);

    const fullOptionItems = [
      item,
      ...(distractors.length >= 3
        ? distractors
        : [
            ...distractors,
            ...seededShuffle(
              shuffled.filter((candidate) => candidate.link !== item.link),
              `${item.link}:fallback`
            )
          ].slice(0, 3))
    ]
      .slice(0, 4);

    const optionSet = seededShuffle(
      fullOptionItems.map((candidate) => ({
        title: normalizeSentence(candidate.title),
        display: compactHeadlineLabel(candidate.title, candidate.source)
      })),
      `${dateKey}:${item.link}`
    )
      .map((option) => ({
        ...option,
        display: normalizeSentence(option.display)
      }))
      .slice(0, 4);

    const uniqueDisplays = new Set(optionSet.map((option) => option.display.toLowerCase()));
    if (optionSet.length < 4 || uniqueDisplays.size !== 4) return null;

    const answer = optionSet.findIndex((option) => option.title === item.title);
    if (answer < 0) return null;

    return {
      id: `news_${dateKey}_${String(index + 1).padStart(2, "0")}`,
      prompt: asLocalized(buildQuestionPrompt(item, index)),
      options: {
        en: optionSet.map((option) => option.display),
        fr: optionSet.map((option) => option.display)
      },
      answer,
      agentMeta: {
        topic: item.title,
        sourceName: item.source,
        sourceUrl: item.link,
        sourcePublishedAt: item.publishedAt,
        optionTitles: optionSet.map((option) => option.title),
        verificationMode: "title_match"
      }
    };
  }).filter(Boolean);
}

function getUsageTokens(rawUsage) {
  if (!rawUsage || typeof rawUsage !== "object") {
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }
  const usage = rawUsage;
  const inputTokens = Number(usage.input_tokens || usage.prompt_tokens || 0);
  const outputTokens = Number(usage.output_tokens || usage.completion_tokens || 0);
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens
  };
}

export function estimateCostUsd(usage, pricing) {
  const safeInputRate = Number(pricing?.inputPer1M || 0);
  const safeOutputRate = Number(pricing?.outputPer1M || 0);
  if (!Number.isFinite(safeInputRate) || !Number.isFinite(safeOutputRate)) return 0;
  const input = Number(usage?.inputTokens || 0);
  const output = Number(usage?.outputTokens || 0);
  const cost = (input / 1_000_000) * safeInputRate + (output / 1_000_000) * safeOutputRate;
  return Number(cost.toFixed(6));
}

function parseJsonText(value) {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

function extractOutputText(responseJson) {
  if (!responseJson || typeof responseJson !== "object") return "";
  const output = Array.isArray(responseJson.output) ? responseJson.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const chunk of content) {
      if (!chunk || typeof chunk !== "object") continue;
      if (typeof chunk.text === "string" && chunk.text.trim()) return chunk.text;
    }
  }
  if (typeof responseJson.output_text === "string") return responseJson.output_text;
  return "";
}

function extractStructuredPayload(responseJson) {
  if (!responseJson || typeof responseJson !== "object") return null;
  if (responseJson.output_parsed && typeof responseJson.output_parsed === "object") {
    return responseJson.output_parsed;
  }
  const output = Array.isArray(responseJson.output) ? responseJson.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const chunk of content) {
      if (!chunk || typeof chunk !== "object") continue;
      if (chunk.parsed && typeof chunk.parsed === "object") return chunk.parsed;
      if (chunk.json && typeof chunk.json === "object") return chunk.json;
      if (typeof chunk.text === "string") {
        const parsed = parseJsonText(chunk.text);
        if (parsed) return parsed;
      }
    }
  }
  const textPayload = extractOutputText(responseJson);
  return parseJsonText(textPayload);
}

export async function rewriteDraftWithLlm({
  draftQuestions,
  dateKey,
  apiKey,
  model,
  fetchImpl,
  endpoint = OPENAI_DEFAULT_BASE_URL,
  timeoutMs = 15000
}) {
  if (!apiKey || !Array.isArray(draftQuestions) || draftQuestions.length === 0) {
    return {
      questions: [],
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      error: null
    };
  }
  const resolvedFetch = fetchImpl || globalThis.fetch;
  if (typeof resolvedFetch !== "function") {
    return {
      questions: [],
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      error: "No fetch implementation available"
    };
  }

  const compactInput = draftQuestions.map((question) => ({
    id: question.id,
    prompt: question.prompt?.en || "",
    options: question.options?.en || [],
    answerIndex: question.answer,
    source: question.agentMeta || null
  }));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await resolvedFetch(endpoint, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || "gpt-4.1-mini",
        text: {
          format: {
            type: "json_schema",
            name: "daily_quiz_prompt_rewrites",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      id: { type: "string" },
                      prompt: { type: "string" }
                    },
                    required: ["id", "prompt"]
                  }
                }
              },
              required: ["questions"]
            }
          }
        },
        input: [
          {
            role: "system",
            content:
              "You rewrite prompts into short, quiz-like lines for choosing the correct headline. Preserve factual meaning. Do not rewrite options or answers."
          },
          {
            role: "user",
            content:
              `Date: ${dateKey}\n` +
              "Rewrite each prompt as 'Which headline ... ?' or 'Select the headline ... .' format. Keep each prompt under 100 characters when possible. " +
              "Keep the same story anchor from the original prompt. " +
              "Return only JSON matching {questions:[{id,prompt}]}. " +
              `Input: ${JSON.stringify(compactInput)}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        questions: [],
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        error: `OpenAI request failed (${response.status}${errorText ? `: ${trimToWordBoundary(errorText, 180)}` : ""})`
      };
    }

    const data = await response.json();
    const usage = getUsageTokens(data.usage);
    const parsed = extractStructuredPayload(data);
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const normalized = questions
      .map((item) => {
        if (!item?.id || !item?.prompt) {
          return null;
        }
        return {
          id: String(item.id),
          prompt: asLocalized(String(item.prompt).trim())
        };
      })
      .filter(Boolean);

    return {
      questions: normalized,
      usage,
      error: normalized.length > 0 ? null : "OpenAI response contained no parseable question rewrites"
    };
  } catch (error) {
    return {
      questions: [],
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      error: error instanceof Error ? error.message : "Unknown OpenAI error"
    };
  } finally {
    clearTimeout(timer);
  }
}

export function verifyQuestions({ questions, newsItems }) {
  const validSourceByLink = new Map(
    (newsItems || []).map((item) => [item.link, item])
  );
  const accepted = [];
  const rejected = [];
  const promptSet = new Set();

  for (const question of questions || []) {
    const options = question?.options?.en;
    const answer = question?.answer;
    const prompt = question?.prompt?.en;
    if (!Array.isArray(options) || options.length !== 4) {
      rejected.push({ id: question?.id || "unknown", reason: "invalid_options" });
      continue;
    }
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      rejected.push({ id: question?.id || "unknown", reason: "invalid_answer_index" });
      continue;
    }
    const uniqueOptions = new Set(options.map((option) => option.trim().toLowerCase()));
    if (uniqueOptions.size !== 4) {
      rejected.push({ id: question?.id || "unknown", reason: "duplicate_options" });
      continue;
    }
    if (!prompt || promptSet.has(prompt.trim().toLowerCase())) {
      rejected.push({ id: question?.id || "unknown", reason: "duplicate_or_empty_prompt" });
      continue;
    }
    if (!/\?$|\.$/.test(prompt.trim())) {
      rejected.push({ id: question?.id || "unknown", reason: "invalid_prompt_style" });
      continue;
    }

    const sourceUrl = question?.agentMeta?.sourceUrl;
    const sourceItem = sourceUrl ? validSourceByLink.get(sourceUrl) : null;
    if (!sourceItem) {
      rejected.push({ id: question?.id || "unknown", reason: "missing_source" });
      continue;
    }
    if (!hasMinimumHeadlineQuality(sourceItem.title)) {
      rejected.push({ id: question?.id || "unknown", reason: "low_quality_source_title" });
      continue;
    }
    if (!isRecentNewsItem(sourceItem)) {
      rejected.push({ id: question?.id || "unknown", reason: "source_not_recent" });
      continue;
    }

    const optionTitles = Array.isArray(question?.agentMeta?.optionTitles)
      ? question.agentMeta.optionTitles
      : [];
    const expectedAnswer = sourceItem.title.trim().toLowerCase();
    const actualAnswer = String(optionTitles[answer] || options[answer] || "")
      .trim()
      .toLowerCase();
    if (expectedAnswer !== actualAnswer) {
      rejected.push({ id: question?.id || "unknown", reason: "answer_not_matched_to_source" });
      continue;
    }

    promptSet.add(prompt.trim().toLowerCase());
    accepted.push(question);
  }

  return {
    accepted,
    rejected
  };
}

export function buildDailyQuiz({ dateKey, questions, runId, mode, generatedAt }) {
  const safeQuestions = (questions || []).slice(0, 10);
  const topics = safeQuestions
    .map((question) => question?.agentMeta?.topic)
    .filter((topic) => typeof topic === "string" && topic.trim())
    .slice(0, 8);
  const uniqueSources = Array.from(
    new Set(
      safeQuestions
        .map((question) => question?.agentMeta?.sourceName)
        .filter((value) => typeof value === "string" && value.trim())
    )
  );

  return {
    id: `daily_${dateKey}`,
    categoryId: "daily",
    categoryLabel: "Daily Quiz",
    title: "Daily News Quiz",
    subtitle: `${safeQuestions.length} recent news questions`,
    rounds: safeQuestions.length,
    accent: "#F3B74E",
    questions: safeQuestions,
    meta: {
      generationMode: mode,
      generatedAt,
      runId,
      topics,
      sources: uniqueSources
    }
  };
}

export function summarizeRunForApi(run) {
  return {
    runId: run.runId,
    quizDate: run.quizDate,
    status: run.status,
    mode: run.mode,
    trigger: run.trigger,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    createdQuiz: Boolean(run.createdQuiz),
    updatedQuiz: Boolean(run.updatedQuiz),
    estimatedCostUsd: Number(run.estimatedCostUsd || 0),
    error: run.error || null,
    summary: run.summary || {},
    steps: Array.isArray(run.steps) ? run.steps : []
  };
}

export function summarizeTopics(newsItems, limit = 6) {
  return (newsItems || [])
    .slice(0, limit)
    .map((item) => item.title)
    .filter(Boolean);
}

export { DEFAULT_FEEDS, buildQuestionFingerprint, normalizeFingerprint };
