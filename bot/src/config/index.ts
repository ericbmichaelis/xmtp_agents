import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export interface AppConfig {
  slack: {
    botToken: string;
    appToken: string;
    signingSecret: string;
    outputChannelId: string;
  };
  anthropic: {
    apiKey: string;
    model: string;
  };
  schedule: {
    cronExpression: string;
    timezone: string;
  };
  tavily: {
    apiKey?: string;
  };
  referencesDir: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    slack: {
      botToken: requireEnv("SLACK_BOT_TOKEN"),
      appToken: requireEnv("SLACK_APP_TOKEN"),
      signingSecret: requireEnv("SLACK_SIGNING_SECRET"),
      outputChannelId: requireEnv("OUTPUT_CHANNEL_ID"),
    },
    anthropic: {
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    },
    schedule: {
      cronExpression: process.env.SCAN_SCHEDULE || "0 9 * * 1-5",
      timezone: process.env.TZ || "America/New_York",
    },
    tavily: {
      apiKey: process.env.TAVILY_API_KEY,
    },
    referencesDir: path.resolve(__dirname, "../../references"),
  };
}
