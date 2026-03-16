import { App, LogLevel } from "@slack/bolt";
import { AppConfig } from "./config";
import { logger } from "./utils/logger";
import { registerCommands } from "./handlers/commands";
import { registerMentions } from "./handlers/mentions";
import { registerActions } from "./handlers/actions";

export function createApp(config: AppConfig): App {
  const app = new App({
    token: config.slack.botToken,
    appToken: config.slack.appToken,
    signingSecret: config.slack.signingSecret,
    socketMode: true,
    logLevel: LogLevel.INFO,
  });

  registerCommands(app, config);
  registerMentions(app, config);
  registerActions(app, config);

  logger.info("Slack Bolt app initialized (Socket Mode)");
  return app;
}
