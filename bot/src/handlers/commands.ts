import { App } from "@slack/bolt";
import { AppConfig } from "../config";
import { SCAN_CHANNELS } from "../config/channels";
import { scanAllChannels, buildScanSummary } from "../scanner/channel-scanner";
import { scanWeb } from "../scanner/web-scanner";
import { runWorkflow } from "../engine/content-engine";
import {
  formatWorkflowResponse,
  formatStatus,
  formatError,
} from "../formatter/slack-blocks";
import { logger } from "../utils/logger";

let lastScanTime: Date | undefined;

export function getLastScanTime(): Date | undefined {
  return lastScanTime;
}

export function registerCommands(app: App, config: AppConfig): void {
  /**
   * /scan — Trigger full Growth Engine workflow
   */
  app.command("/scan", async ({ ack, respond, client }) => {
    await ack();
    await respond("Starting Growth Engine scan... This takes about a minute.");

    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Scan Slack channels
      logger.info("Starting channel scan via /scan command");
      const channelResults = await scanAllChannels(
        client,
        SCAN_CHANNELS,
        since
      );

      // Scan web (if configured)
      const webResults = config.tavily.apiKey
        ? await scanWeb(config.tavily.apiKey)
        : [];

      const summary = buildScanSummary(channelResults, webResults);

      // Run content engine
      const result = await runWorkflow(config, summary);
      lastScanTime = new Date();

      const rawResponse = (result as any).rawResponse || result.scanSummary;
      const blocks = formatWorkflowResponse(rawResponse, result.scanSummary);

      // Post to #content-inspo
      await client.chat.postMessage({
        channel: config.slack.outputChannelId,
        blocks: blocks as any,
        text: "XMTP Growth Engine — Daily Recommendations",
      });

      await respond("Scan complete! Recommendations posted to #content-inspo.");
      logger.info("Scan workflow completed successfully");
    } catch (err: any) {
      logger.error({ err }, "Scan workflow failed");
      await respond(`Scan failed: ${err.message}`);

      // Also post error to #content-inspo so it's visible
      try {
        await client.chat.postMessage({
          channel: config.slack.outputChannelId,
          blocks: formatError(err.message) as any,
          text: "Growth Engine scan failed",
        });
      } catch {
        // If we can't post the error, just log it
      }
    }
  });

  /**
   * /status — Show bot status
   */
  app.command("/status", async ({ ack, respond }) => {
    await ack();

    const blocks = formatStatus({
      lastScan: lastScanTime,
      nextScan: config.schedule.cronExpression,
      channelCount: SCAN_CHANNELS.length,
      webScannerEnabled: !!config.tavily.apiKey,
    });

    await respond({ blocks: blocks as any, text: "Growth Engine Status" });
  });
}
