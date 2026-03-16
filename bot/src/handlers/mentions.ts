import { App } from "@slack/bolt";
import { AppConfig } from "../config";
import { SCAN_CHANNELS } from "../config/channels";
import { scanAllChannels, buildScanSummary } from "../scanner/channel-scanner";
import { scanWeb } from "../scanner/web-scanner";
import { runWorkflow, draftTopic } from "../engine/content-engine";
import {
  formatWorkflowResponse,
  formatDraftResponse,
  formatError,
} from "../formatter/slack-blocks";
import { logger } from "../utils/logger";

export function registerMentions(app: App, config: AppConfig): void {
  app.event("app_mention", async ({ event, client, say }) => {
    const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim().toLowerCase();

    if (text.startsWith("scan") || text.includes("check slack") || text.includes("what should we post")) {
      await handleScan(client, say, config);
    } else if (text.startsWith("draft ")) {
      const topic = event.text
        .replace(/<@[A-Z0-9]+>/g, "")
        .trim()
        .replace(/^draft\s+/i, "");
      await handleDraft(client, say, config, topic);
    } else if (text.startsWith("help") || text === "?") {
      await say({
        text: [
          "*XMTP Growth Engine — Commands*",
          "",
          "`@bot scan` — Run the full daily scan + content recommendations",
          "`@bot draft [topic]` — Generate a draft for a specific topic",
          "`@bot help` — Show this message",
          "",
          "Or use slash commands:",
          "`/scan` — Full scan workflow",
          "`/status` — Bot status and config",
        ].join("\n"),
      });
    } else {
      // Treat any other mention as a topic to draft about
      const topic = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
      if (topic.length > 5) {
        await handleDraft(client, say, config, topic);
      } else {
        await say(
          "Hey! Try `scan` to run the daily workflow, `draft [topic]` to create a post, or `help` for all commands."
        );
      }
    }
  });
}

async function handleScan(
  client: any,
  say: any,
  config: AppConfig
): Promise<void> {
  await say("Starting Growth Engine scan... hang tight.");

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const channelResults = await scanAllChannels(client, SCAN_CHANNELS, since);
    const webResults = config.tavily.apiKey
      ? await scanWeb(config.tavily.apiKey)
      : [];
    const summary = buildScanSummary(channelResults, webResults);

    const result = await runWorkflow(config, summary);
    const rawResponse = (result as any).rawResponse || result.scanSummary;
    const blocks = formatWorkflowResponse(rawResponse, result.scanSummary);

    await client.chat.postMessage({
      channel: config.slack.outputChannelId,
      blocks: blocks as any,
      text: "XMTP Growth Engine — Daily Recommendations",
    });

    logger.info("Mention-triggered scan completed");
  } catch (err: any) {
    logger.error({ err }, "Mention-triggered scan failed");
    await say(`Scan failed: ${err.message}`);
  }
}

async function handleDraft(
  client: any,
  say: any,
  config: AppConfig,
  topic: string
): Promise<void> {
  await say(`Drafting a post about: _${topic}_...`);

  try {
    const draft = await draftTopic(config, topic);
    const blocks = formatDraftResponse(draft, topic);

    await client.chat.postMessage({
      channel: config.slack.outputChannelId,
      blocks: blocks as any,
      text: `Growth Engine Draft: ${topic}`,
    });

    logger.info({ topic }, "Draft generated via mention");
  } catch (err: any) {
    logger.error({ err, topic }, "Draft generation failed");
    await say(`Failed to generate draft: ${err.message}`);
  }
}
