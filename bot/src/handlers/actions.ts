import { App } from "@slack/bolt";
import { AppConfig } from "../config";
import { logger } from "../utils/logger";

export function registerActions(app: App, _config: AppConfig): void {
  /**
   * Approve — mark draft as ready for publishing
   */
  app.action("approve_draft", async ({ ack, body, client }) => {
    await ack();

    const userId = body.user.id;
    const messageTs = (body as any).message?.ts;
    const channelId = (body as any).channel?.id;

    if (messageTs && channelId) {
      await client.reactions.add({
        channel: channelId,
        timestamp: messageTs,
        name: "white_check_mark",
      });

      await client.chat.postMessage({
        channel: channelId,
        thread_ts: messageTs,
        text: `Approved by <@${userId}>. Ready for publishing.`,
      });
    }

    logger.info({ userId }, "Draft approved");
  });

  /**
   * Edit — open a thread for revision notes
   */
  app.action("edit_draft", async ({ ack, body, client }) => {
    await ack();

    const userId = body.user.id;
    const messageTs = (body as any).message?.ts;
    const channelId = (body as any).channel?.id;

    if (messageTs && channelId) {
      await client.reactions.add({
        channel: channelId,
        timestamp: messageTs,
        name: "pencil2",
      });

      await client.chat.postMessage({
        channel: channelId,
        thread_ts: messageTs,
        text: `<@${userId}> wants edits. Reply in this thread with revision notes and I'll update the draft.`,
      });
    }

    logger.info({ userId }, "Draft marked for editing");
  });

  /**
   * Kill — archive the draft
   */
  app.action("kill_draft", async ({ ack, body, client }) => {
    await ack();

    const userId = body.user.id;
    const messageTs = (body as any).message?.ts;
    const channelId = (body as any).channel?.id;

    if (messageTs && channelId) {
      await client.reactions.add({
        channel: channelId,
        timestamp: messageTs,
        name: "x",
      });

      await client.chat.postMessage({
        channel: channelId,
        thread_ts: messageTs,
        text: `Killed by <@${userId}>. Draft archived.`,
      });
    }

    logger.info({ userId }, "Draft killed");
  });
}
