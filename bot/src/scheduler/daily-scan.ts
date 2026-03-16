import cron from "node-cron";
import { App } from "@slack/bolt";
import { AppConfig } from "../config";
import { SCAN_CHANNELS } from "../config/channels";
import { scanAllChannels, buildScanSummary } from "../scanner/channel-scanner";
import { scanWeb } from "../scanner/web-scanner";
import { runWorkflow } from "../engine/content-engine";
import {
  formatWorkflowResponse,
  formatError,
} from "../formatter/slack-blocks";
import { logger } from "../utils/logger";

export function startScheduler(app: App, config: AppConfig): void {
  const schedule = config.schedule.cronExpression;
  const timezone = config.schedule.timezone;

  if (!cron.validate(schedule)) {
    logger.error({ schedule }, "Invalid cron expression — scheduler not started");
    return;
  }

  cron.schedule(
    schedule,
    async () => {
      logger.info("Daily scheduled scan starting");

      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const channelResults = await scanAllChannels(
          app.client,
          SCAN_CHANNELS,
          since
        );

        const webResults = config.tavily.apiKey
          ? await scanWeb(config.tavily.apiKey)
          : [];

        const summary = buildScanSummary(channelResults, webResults);
        const result = await runWorkflow(config, summary);

        const rawResponse = (result as any).rawResponse || result.scanSummary;
        const blocks = formatWorkflowResponse(rawResponse, result.scanSummary);

        await app.client.chat.postMessage({
          channel: config.slack.outputChannelId,
          blocks: blocks as any,
          text: "XMTP Growth Engine — Daily Recommendations",
        });

        logger.info("Daily scheduled scan completed successfully");
      } catch (err: any) {
        logger.error({ err }, "Daily scheduled scan failed");

        try {
          await app.client.chat.postMessage({
            channel: config.slack.outputChannelId,
            blocks: formatError(err.message) as any,
            text: "Growth Engine daily scan failed",
          });
        } catch {
          logger.error("Failed to post error message to Slack");
        }
      }
    },
    {
      timezone,
      scheduled: true,
    }
  );

  logger.info({ schedule, timezone }, "Daily scan scheduler started");
}
