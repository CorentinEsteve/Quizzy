const RSS_FEEDS = [
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World", category: "World" },
  { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", source: "BBC Technology", category: "Technology" },
  { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", source: "BBC Science", category: "Science" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC Business", category: "Business" },
  { url: "https://feeds.bbci.co.uk/news/health/rss.xml", source: "BBC Health", category: "Health" },
  { url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", source: "BBC Culture", category: "Culture" },
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian", category: "World" },
  { url: "https://www.theguardian.com/science/rss", source: "The Guardian Science", category: "Science" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", category: "World" },
  { url: "https://feeds.bbci.co.uk/sport/rss.xml", source: "BBC Sport", category: "Sport" },
];

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"));
  return match ? match[1].trim() : null;
}

function cleanText(text) {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractItems(xml) {
  const items = [];
  const itemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
  for (const match of itemMatches) {
    const itemXml = match[1];
    const title = extractTag(itemXml, "title");
    const description = extractTag(itemXml, "description");
    const link = extractTag(itemXml, "link") || extractTag(itemXml, "guid");
    if (title && title.length > 10) {
      items.push({
        title: cleanText(title),
        description: cleanText(description || ""),
        link: link ? cleanText(link) : ""
      });
    }
  }
  return items;
}

async function fetchFeed({ url, source, category }) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Qwizzy/1.0 (quiz bot)", Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    const items = extractItems(xml).slice(0, 8);
    return items.map((item) => ({ ...item, source, category }));
  } catch (err) {
    console.warn(`[newsFeeds] Failed to fetch ${source}: ${err.message}`);
    return [];
  }
}

export async function fetchRecentNews() {
  const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
  const articles = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const seen = new Set();
  return articles.filter((a) => {
    const key = a.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
