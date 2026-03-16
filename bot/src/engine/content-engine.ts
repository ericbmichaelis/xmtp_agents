import Anthropic from "@anthropic-ai/sdk";
import { AppConfig } from "../config";
import { ScanSummary } from "../scanner/types";
import {
  buildSystemPrompt,
  buildUserPrompt,
  loadReferenceFiles,
} from "./prompt-builder";
import { WorkflowResult } from "./types";
import { logger } from "../utils/logger";

let anthropicClient: Anthropic | null = null;

function getClient(apiKey: string): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Run the full Growth Engine workflow:
 * 1. Build system prompt from SKILL.md + all reference files
 * 2. Build user prompt from scan results
 * 3. Call Claude to process signals and generate recommendations
 * 4. Return the raw response (formatted for Slack posting)
 */
export async function runWorkflow(
  config: AppConfig,
  scanSummary: ScanSummary,
  dayOfWeek?: string
): Promise<WorkflowResult> {
  const client = getClient(config.anthropic.apiKey);
  const refs = loadReferenceFiles(config.referencesDir);
  const systemPrompt = buildSystemPrompt(refs, dayOfWeek);
  const userPrompt = buildUserPrompt(scanSummary);

  logger.info(
    {
      model: config.anthropic.model,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      totalSignals: scanSummary.totalSignals,
    },
    "Calling Claude for content generation"
  );

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: config.anthropic.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const content = response.content
        .filter((block) => block.type === "text")
        .map((block) => {
          if (block.type === "text") return block.text;
          return "";
        })
        .join("\n");

      logger.info(
        {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          stopReason: response.stop_reason,
        },
        "Claude response received"
      );

      return {
        recommendations: [], // Raw text is used directly — parsing is optional
        scanSummary: `Scanned ${scanSummary.channelResults.length} channels, found ${scanSummary.totalSignals} signals`,
        xMentions: "", // Populated by web scanner when available
        gapFlags: [],
        dayOfWeek: dayOfWeek || new Date().toLocaleDateString("en-US", { weekday: "long" }),
        rawResponse: content,
      } as WorkflowResult & { rawResponse: string };
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err?.status === 429 ||
        err?.status === 500 ||
        err?.status === 529;

      if (isRetryable && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.warn(
          { attempt, backoffMs, error: err.message },
          "Retrying Claude API call"
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error("Failed to get response from Claude");
}

/**
 * Generate a draft for a specific topic (triggered by @bot draft [topic]).
 */
export async function draftTopic(
  config: AppConfig,
  topic: string
): Promise<string> {
  const client = getClient(config.anthropic.apiKey);
  const refs = loadReferenceFiles(config.referencesDir);
  const systemPrompt = buildSystemPrompt(refs);

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Draft a post about: ${topic}

Follow the post structure rules and voice guidelines. Present the draft in the standard format:
- POST TYPE
- VOLUME LEVER
- DRAFT text
- VISUAL NEEDED
- TAGS
- COORDINATION`,
      },
    ],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => {
      if (block.type === "text") return block.text;
      return "";
    })
    .join("\n");
}
