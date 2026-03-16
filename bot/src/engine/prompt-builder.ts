import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";
import { ScanSummary } from "../scanner/types";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const WEEKLY_RHYTHM: Record<string, string> = {
  Monday: "Harness Wars / Ecosystem Signal — web scan of Claude Code, Codex, Gemini CLI, OpenClaw news",
  Tuesday: "Builder Spotlight — from #community Slack, community call recaps",
  Wednesday: "Technical Deep Dive — from #shipping Slack, XMTP docs",
  Thursday: "Partner Launch / Integration — from #int-ecosystem Slack, Notion partner pipeline",
  Friday: "Event Content or Meta Demo — Notion event calendar, behind-the-scenes",
  Saturday: "Catch-up or minimal/vibe post",
  Sunday: "Catch-up or minimal/vibe post",
};

interface ReferenceFiles {
  skill: string;
  businessContext: string;
  tweetExamples: string;
  postRules: string;
  metricsBaseline: string;
  xAnalyticsBaseline: string;
  designGuide: string;
}

export function loadReferenceFiles(referencesDir: string): ReferenceFiles {
  const readFile = (filename: string): string => {
    const filePath = path.join(referencesDir, filename);
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      logger.warn({ filename, err }, "Failed to read reference file");
      return `[${filename} not available]`;
    }
  };

  return {
    skill: readFile("SKILL.md"),
    businessContext: readFile("business-context.md"),
    tweetExamples: readFile("tweet-examples.md"),
    postRules: readFile("post-rules.md"),
    metricsBaseline: readFile("metrics-baseline.md"),
    xAnalyticsBaseline: readFile("x-analytics-baseline.md"),
    designGuide: readFile("design-guide.md"),
  };
}

export function buildSystemPrompt(
  refs: ReferenceFiles,
  dayOfWeek?: string
): string {
  const today = dayOfWeek || DAYS_OF_WEEK[new Date().getDay()];
  const rhythm = WEEKLY_RHYTHM[today] || "No specific focus today";

  return `${refs.skill}

---
## Reference: Business Context
${refs.businessContext}

---
## Reference: Tweet Examples (voice/tone guide)
${refs.tweetExamples}

---
## Reference: Post Structure & Rules
${refs.postRules}

---
## Reference: Messaging Volume Metrics
${refs.metricsBaseline}

---
## Reference: X Analytics Baseline & 10x Playbook
${refs.xAnalyticsBaseline}

---
## Reference: Design Guide
${refs.designGuide}

---
## Today's Context
- **Day:** ${today}
- **Date:** ${new Date().toISOString().split("T")[0]}
- **Weekly Rhythm Focus:** ${rhythm}
- **Override with higher-priority items when they exist.**

## Output Format
You MUST post recommendations to #content-inspo in this exact format. Present each recommendation as a separate draft block.

CRITICAL: You ONLY post to #content-inspo. Every other channel is listen-only.`;
}

export function buildUserPrompt(summary: ScanSummary): string {
  const sections: string[] = [];

  sections.push(
    `## Slack Channel Scan Results (${summary.scannedAt.toISOString()})\n`
  );
  sections.push(`Total signals found: ${summary.totalSignals}\n`);

  // Group by category
  const byCategory = new Map<string, typeof summary.channelResults>();
  for (const result of summary.channelResults) {
    const existing = byCategory.get(result.category) || [];
    existing.push(result);
    byCategory.set(result.category, existing);
  }

  for (const [category, results] of byCategory) {
    sections.push(`### ${category.toUpperCase()}`);
    for (const result of results) {
      if (result.error) {
        sections.push(
          `- **#${result.channelName}**: [scan error: ${result.error}]`
        );
        continue;
      }
      if (result.signals.length === 0) {
        sections.push(`- **#${result.channelName}**: No notable activity`);
        continue;
      }
      sections.push(
        `- **#${result.channelName}** (${result.messageCount} messages):`
      );
      for (const signal of result.signals) {
        const author = signal.author ? `[${signal.author}] ` : "";
        sections.push(`  - ${author}${signal.text}`);
      }
    }
    sections.push("");
  }

  if (summary.webResults.length > 0) {
    sections.push("### WEB / X SCAN RESULTS");
    for (const result of summary.webResults) {
      if (result.signals.length === 0) continue;
      sections.push(`- **${result.channelName}**:`);
      for (const signal of result.signals) {
        const url = signal.url ? ` (${signal.url})` : "";
        sections.push(`  - ${signal.text}${url}`);
      }
    }
    sections.push("");
  }

  sections.push(`---
Based on these signals, execute the daily workflow:
1. Summarize what's new across all sources
2. Check relevance against the business context
3. Recommend 2-3 post topics with type, volume lever, source, and pitch
4. Flag any X mentions worth engaging with
5. Flag any content gaps (convos content, thread count, visual posts)

Present your output in the #content-inspo format specified in the skill.`);

  return sections.join("\n");
}
