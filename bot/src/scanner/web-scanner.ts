import { Signal, ScanResult } from "./types";
import { logger } from "../utils/logger";

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
}

const SEARCH_QUERIES = [
  '"XMTP" OR "@xmtp_"',
  "agent-to-agent communication protocol",
  "Claude Code Codex Gemini CLI agent harness",
  "OpenClaw agent messaging",
  "agent interoperability protocol",
];

/**
 * Search the web for XMTP-relevant signals using Tavily API.
 * Returns empty results gracefully if API key is missing or API fails.
 */
export async function scanWeb(apiKey?: string): Promise<ScanResult[]> {
  if (!apiKey) {
    logger.info("Web scanner skipped — no TAVILY_API_KEY configured");
    return [];
  }

  const results: ScanResult[] = [];

  for (const query of SEARCH_QUERIES) {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "basic",
          max_results: 5,
          include_domains: [],
          exclude_domains: [],
        }),
      });

      if (!response.ok) {
        logger.warn(
          { query, status: response.status },
          "Tavily search failed"
        );
        continue;
      }

      const data = (await response.json()) as TavilyResponse;
      const signals: Signal[] = (data.results || []).map((r) => ({
        source: "web",
        category: "web" as const,
        timestamp: new Date().toISOString(),
        text: `${r.title}: ${r.content.slice(0, 300)}`,
        url: r.url,
      }));

      results.push({
        category: "web",
        channelName: `Web: ${query.slice(0, 50)}`,
        signals,
        messageCount: signals.length,
      });
    } catch (err) {
      logger.warn({ query, err }, "Web search query failed");
    }
  }

  // X / Twitter search (also via Tavily — searches Twitter results)
  try {
    const xResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: "XMTP OR @xmtp_ site:x.com",
        search_depth: "basic",
        max_results: 10,
        include_domains: ["x.com", "twitter.com"],
      }),
    });

    if (xResponse.ok) {
      const xData = (await xResponse.json()) as TavilyResponse;
      const xSignals: Signal[] = (xData.results || []).map((r) => ({
        source: "twitter",
        category: "twitter" as const,
        timestamp: new Date().toISOString(),
        text: `${r.title}: ${r.content.slice(0, 300)}`,
        url: r.url,
      }));

      results.push({
        category: "twitter",
        channelName: "X / Twitter Mentions",
        signals: xSignals,
        messageCount: xSignals.length,
      });
    }
  } catch (err) {
    logger.warn({ err }, "X/Twitter search failed");
  }

  logger.info(
    { resultCount: results.reduce((s, r) => s + r.signals.length, 0) },
    "Web scan completed"
  );

  return results;
}
