type WebClient = any;
import { ChannelConfig } from "../config/channels";
import { Signal, ScanResult, ScanSummary } from "./types";
import { RateLimiter } from "../utils/rate-limiter";
import { logger } from "../utils/logger";

const rateLimiter = new RateLimiter(1200); // 1.2s between calls

/**
 * Resolve channel name to channel ID.
 * Caches results for the lifetime of the process.
 */
const channelIdCache = new Map<string, string>();

async function resolveChannelId(
  client: WebClient,
  channelName: string
): Promise<string | null> {
  if (channelIdCache.has(channelName)) {
    return channelIdCache.get(channelName)!;
  }

  try {
    let cursor: string | undefined;
    do {
      const result = await client.conversations.list({
        types: "public_channel",
        limit: 200,
        cursor,
      });

      for (const channel of result.channels || []) {
        if (channel.name && channel.id) {
          channelIdCache.set(channel.name, channel.id);
        }
      }

      cursor = result.response_metadata?.next_cursor || undefined;
    } while (cursor);

    return channelIdCache.get(channelName) || null;
  } catch (err) {
    logger.error({ channelName, err }, "Failed to resolve channel ID");
    return null;
  }
}

/**
 * Scan a single channel for messages since a given timestamp.
 */
async function scanChannel(
  client: WebClient,
  channelId: string,
  channelName: string,
  category: string,
  since: Date
): Promise<ScanResult> {
  try {
    const oldest = String(since.getTime() / 1000);
    const result = await client.conversations.history({
      channel: channelId,
      oldest,
      limit: 100,
    });

    const messages = result.messages || [];
    const signals: Signal[] = messages
      .filter((msg: any) => msg.text && !msg.bot_id && msg.subtype !== "channel_join")
      .map((msg: any) => ({
        source: `#${channelName}`,
        category: category as Signal["category"],
        timestamp: msg.ts || "",
        author: msg.user,
        text: (msg.text || "").slice(0, 500), // Truncate long messages
      }));

    return {
      category: category as ScanResult["category"],
      channelName,
      signals,
      messageCount: messages.length,
    };
  } catch (err: any) {
    const errorMsg =
      err?.data?.error || err?.message || "Unknown error";
    logger.warn({ channelName, error: errorMsg }, "Failed to scan channel");
    return {
      category: category as ScanResult["category"],
      channelName,
      signals: [],
      messageCount: 0,
      error: errorMsg,
    };
  }
}

/**
 * Populate the channel ID cache by listing all channels once.
 */
async function warmChannelCache(client: WebClient): Promise<void> {
  if (channelIdCache.size > 0) return;

  logger.info("Warming channel ID cache...");
  let cursor: string | undefined;
  do {
    const result = await client.conversations.list({
      types: "public_channel",
      limit: 1000,
      cursor,
    });

    for (const channel of result.channels || []) {
      if (channel.name && channel.id) {
        channelIdCache.set(channel.name, channel.id);
      }
    }

    cursor = result.response_metadata?.next_cursor || undefined;
    if (cursor) await rateLimiter.throttle();
  } while (cursor);

  logger.info({ channelCount: channelIdCache.size }, "Channel cache warmed");
}

/**
 * Scan all configured channels sequentially with rate limiting.
 */
export async function scanAllChannels(
  client: WebClient,
  channels: ChannelConfig[],
  since: Date
): Promise<ScanResult[]> {
  // Warm the cache once so we don't hit the API per channel
  await warmChannelCache(client);

  const results: ScanResult[] = [];

  for (const channel of channels) {
    const channelId = channelIdCache.get(channel.name);

    if (!channelId) {
      logger.warn(
        { channelName: channel.name },
        "Channel not found — skipping"
      );
      results.push({
        category: channel.category,
        channelName: channel.name,
        signals: [],
        messageCount: 0,
        error: "channel_not_found",
      });
      continue;
    }

    const result = await scanChannel(
      client,
      channelId,
      channel.name,
      channel.category,
      since
    );
    results.push(result);

    await rateLimiter.throttle();
  }

  return results;
}

/**
 * Build a full scan summary from channel results and optional web results.
 */
export function buildScanSummary(
  channelResults: ScanResult[],
  webResults: ScanResult[] = []
): ScanSummary {
  const totalSignals =
    channelResults.reduce((sum, r) => sum + r.signals.length, 0) +
    webResults.reduce((sum, r) => sum + r.signals.length, 0);

  return {
    scannedAt: new Date(),
    channelResults,
    webResults,
    totalSignals,
  };
}
