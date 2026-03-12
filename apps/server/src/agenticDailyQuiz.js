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
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml"
  },
  {
    name: "AP News",
    url: "https://apnews.com/hub/apf-topnews?output=1"
  }
];

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1/responses";

function decodeEntities(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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

function parseRssItems(xml, sourceName) {
  if (typeof xml !== "string" || !xml.trim()) return [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  return itemMatches
    .map((item) => {
      const title = textBetween(item, "title");
      const link = normalizeLink(textBetween(item, "link"));
      const description = textBetween(item, "description");
      const pubDateRaw = textBetween(item, "pubDate");
      const publishedAtMs = Date.parse(pubDateRaw || "");
      const publishedAt = Number.isFinite(publishedAtMs)
        ? new Date(publishedAtMs).toISOString()
        : null;
      if (!title || !link) return null;
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

function buildQuestionContext(item) {
  const description = stripHtml(item?.description || "");
  if (description) {
    return description.slice(0, 180);
  }
  return String(item?.title || "").slice(0, 120);
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

export function buildRuleDraftQuestions({ dateKey, newsItems, count = 10 }) {
  if (!Array.isArray(newsItems) || newsItems.length < 4) return [];
  const shuffled = seededShuffle(newsItems, `${dateKey}:rule-draft`);
  const picked = shuffled.slice(0, Math.min(shuffled.length, count));

  return picked.map((item, index) => {
    const distractors = shuffled
      .filter((candidate) => candidate.link !== item.link)
      .slice(index + 1)
      .concat(shuffled.filter((candidate) => candidate.link !== item.link).slice(0, index + 1))
      .slice(0, 3)
      .map((candidate) => candidate.title);

    const optionSet = seededShuffle([
      item.title,
      ...(distractors.length >= 3
        ? distractors
        : [...distractors, ...seededShuffle(shuffled.map((candidate) => candidate.title), `${item.link}:fallback`)].slice(0, 3))
    ], `${dateKey}:${item.link}`).slice(0, 4);

    const answer = optionSet.findIndex((option) => option === item.title);
    if (answer < 0 || optionSet.length < 4) return null;

    const dateLabel = toDisplayDate(item.publishedAt);
    const context = buildQuestionContext(item);
    return {
      id: `news_${dateKey}_${String(index + 1).padStart(2, "0")}`,
      prompt: asLocalized(
        `Which headline matches this ${item.source} story from ${dateLabel}: ${context}`
      ),
      options: {
        en: optionSet,
        fr: optionSet
      },
      answer,
      agentMeta: {
        topic: item.title,
        sourceName: item.source,
        sourceUrl: item.link,
        sourcePublishedAt: item.publishedAt,
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
    return { questions: [], usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
  }
  const resolvedFetch = fetchImpl || globalThis.fetch;
  if (typeof resolvedFetch !== "function") {
    return { questions: [], usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
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
              "You rewrite quiz prompts for clarity. Preserve factual meaning. Do not rewrite options or answers."
          },
          {
            role: "user",
            content: `Date: ${dateKey}\nRewrite each question prompt to be concise and engaging. Return only the schema output with {questions:[{id,prompt}]}. Input: ${JSON.stringify(compactInput)}`
          }
        ]
      })
    });

    if (!response.ok) {
      return { questions: [], usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
    }

    const data = await response.json();
    const usage = getUsageTokens(data.usage);
    const rawText = extractOutputText(data);
    const parsed = parseJsonText(rawText);
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

    return { questions: normalized, usage };
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

    const sourceUrl = question?.agentMeta?.sourceUrl;
    const sourceItem = sourceUrl ? validSourceByLink.get(sourceUrl) : null;
    if (!sourceItem) {
      rejected.push({ id: question?.id || "unknown", reason: "missing_source" });
      continue;
    }

    const expectedAnswer = sourceItem.title.trim().toLowerCase();
    const actualAnswer = String(options[answer] || "").trim().toLowerCase();
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

export function buildFallbackQuestions({ dateKey, pool, count = 10, startIndex = 1 }) {
  const sourcePool = Array.isArray(pool) ? pool : [];
  if (sourcePool.length === 0) return [];
  return seededShuffle(sourcePool, `${dateKey}:fallback`)
    .slice(0, count)
    .map((question, index) => ({
      ...question,
      id: `fallback_${dateKey}_${String(startIndex + index).padStart(2, "0")}_${question.id}`,
      agentMeta: {
        sourceName: "Fallback quiz bank",
        sourceUrl: "",
        sourcePublishedAt: null,
        topic: question.prompt?.en || "Fallback topic",
        verificationMode: "banked_question"
      }
    }));
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
    subtitle: `${safeQuestions.length} verified questions`,
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

export { DEFAULT_FEEDS };
