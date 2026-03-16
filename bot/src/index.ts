import { loadConfig } from "./config";
import { createApp } from "./app";
import { startScheduler } from "./scheduler/daily-scan";
import { logger } from "./utils/logger";

async function main() {
  const config = loadConfig();
  const app = createApp(config);

  await app.start();
  logger.info("Growth Engine bot is running");

  startScheduler(app, config);
  logger.info(
    `Daily scan scheduled: ${config.schedule.cronExpression} (${config.schedule.timezone})`
  );

  const shutdown = async () => {
    logger.info("Shutting down...");
    await app.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  logger.fatal(err, "Failed to start Growth Engine bot");
  process.exit(1);
});
