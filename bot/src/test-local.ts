/**
 * Local test script — runs the Growth Engine content pipeline
 * with mock Slack channel data. No Slack connection required.
 *
 * Usage: npx ts-node src/test-local.ts
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { ScanSummary, ScanResult } from "./scanner/types";
import { loadReferenceFiles, buildSystemPrompt, buildUserPrompt } from "./engine/prompt-builder";
import Anthropic from "@anthropic-ai/sdk";

// Mock scan data simulating what the channel scanner would find
const mockChannelResults: ScanResult[] = [
  {
    category: "partner",
    channelName: "int-ecosystem",
    messageCount: 12,
    signals: [
      {
        source: "#int-ecosystem",
        category: "partner",
        timestamp: new Date().toISOString(),
        author: "shane",
        text: "AgentMail just raised $6M (TechCrunch). They're building agent-to-agent email infrastructure on XMTP. Co-marketing discussion happening in #ext-xmtp-agentmail.",
      },
      {
        source: "#int-ecosystem",
        category: "partner",
        timestamp: new Date().toISOString(),
        author: "eric",
        text: "AgentCard is a brand new partner — channel just created. Shane has the founder in DMs exploring waitlist lift for XMTP users.",
      },
    ],
  },
  {
    category: "partner",
    channelName: "ext-xmtp-stripe",
    messageCount: 8,
    signals: [
      {
        source: "#ext-xmtp-stripe",
        category: "partner",
        timestamp: new Date().toISOString(),
        author: "peter",
        text: "Stripe integration is live in Convos. Agents can now get virtual credit cards via Stripe Issuing + Link wallets. This is agents-that-transact made real.",
      },
    ],
  },
  {
    category: "product_eng",
    channelName: "team-sdk-protocol",
    messageCount: 15,
    signals: [
      {
        source: "#team-sdk-protocol",
        category: "product_eng",
        timestamp: new Date().toISOString(),
        author: "benny",
        text: "SDK 1.10.0 shipped with node bindings. Flagging a GLIBC_2.38 compatibility issue — active engineering thread.",
      },
    ],
  },
  {
    category: "convos",
    channelName: "team-convos-feedback-and-love",
    messageCount: 5,
    signals: [
      {
        source: "#team-convos-feedback-and-love",
        category: "convos",
        timestamp: new Date().toISOString(),
        author: "community",
        text: "Zooko (Zcash founder) and William Mougayar publicly praising Convos.",
      },
    ],
  },
  {
    category: "ecosystem",
    channelName: "ecosystem-team",
    messageCount: 3,
    signals: [
      {
        source: "#ecosystem-team",
        category: "ecosystem",
        timestamp: new Date().toISOString(),
        text: "OpenClaw at 302K+ GitHub stars. China adoption accelerating — Tencent WeChat integration reported. CrowdStrike flagged security concerns around rapid growth.",
      },
    ],
  },
];

const mockWebResults: ScanResult[] = [
  {
    category: "web",
    channelName: "Web: XMTP mentions",
    messageCount: 2,
    signals: [
      {
        source: "web",
        category: "web",
        timestamp: new Date().toISOString(),
        text: "NVIDIA launches NemoClaw — policy-based privacy & local open model deployment for AI agents",
        url: "https://nvidia.com/en-us/ai/nemoclaw/",
      },
    ],
  },
  {
    category: "twitter",
    channelName: "X / Twitter Mentions",
    messageCount: 3,
    signals: [
      {
        source: "twitter",
        category: "twitter",
        timestamp: new Date().toISOString(),
        text: "Developer demo: built an XMTP agent in 5 minutes using Claude Code + MCP docs server",
        url: "https://x.com/example/status/123",
      },
    ],
  },
];

async function main() {
  console.log("=== XMTP Growth Engine — Local Test ===\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY not set in .env");
    process.exit(1);
  }

  const referencesDir = path.resolve(__dirname, "../references");

  console.log("Loading reference files...");
  const refs = loadReferenceFiles(referencesDir);
  console.log("  SKILL.md:", refs.skill.length, "chars");
  console.log("  business-context.md:", refs.businessContext.length, "chars");
  console.log("  tweet-examples.md:", refs.tweetExamples.length, "chars");
  console.log("  post-rules.md:", refs.postRules.length, "chars");
  console.log("  metrics-baseline.md:", refs.metricsBaseline.length, "chars");
  console.log("  x-analytics-baseline.md:", refs.xAnalyticsBaseline.length, "chars");
  console.log("  design-guide.md:", refs.designGuide.length, "chars");

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  console.log(`\nBuilding prompts for ${today}...`);

  const systemPrompt = buildSystemPrompt(refs, today);
  console.log("System prompt:", systemPrompt.length, "chars");

  const summary: ScanSummary = {
    scannedAt: new Date(),
    channelResults: mockChannelResults,
    webResults: mockWebResults,
    totalSignals: mockChannelResults.reduce((s, r) => s + r.signals.length, 0) +
      mockWebResults.reduce((s, r) => s + r.signals.length, 0),
  };

  const userPrompt = buildUserPrompt(summary);
  console.log("User prompt:", userPrompt.length, "chars");

  console.log("\nCalling Claude (this may take 15-30 seconds)...\n");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  console.log("=".repeat(60));
  console.log("GROWTH ENGINE OUTPUT");
  console.log("=".repeat(60));
  console.log(content);
  console.log("=".repeat(60));
  console.log(`\nTokens used — input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}`);
  console.log(`Stop reason: ${response.stop_reason}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
