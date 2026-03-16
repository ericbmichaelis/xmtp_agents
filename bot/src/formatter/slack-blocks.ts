type SlackBlock = Record<string, any>;

/**
 * Format the Growth Engine's raw response as Slack Block Kit blocks
 * with interactive action buttons.
 */
export function formatWorkflowResponse(
  rawResponse: string,
  scanSummary: string
): SlackBlock[] {
  const blocks: SlackBlock[] = [];

  // Header
  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: "XMTP Growth Engine — Daily Recommendations",
    },
  });

  // Scan summary context
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `${scanSummary} | ${new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`,
      },
    ],
  });

  blocks.push({ type: "divider" });

  // Main content — split into chunks if needed (Slack has 3000 char limit per text block)
  const chunks = splitText(rawResponse, 2900);
  for (const chunk of chunks) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: chunk,
      },
    });
  }

  blocks.push({ type: "divider" });

  // Action buttons
  blocks.push({
    type: "actions",
    block_id: "growth_engine_actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "Approve" },
        style: "primary",
        action_id: "approve_draft",
        value: "approved",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Edit" },
        action_id: "edit_draft",
        value: "edit",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Kill" },
        style: "danger",
        action_id: "kill_draft",
        value: "killed",
      },
    ],
  });

  return blocks;
}

/**
 * Format a single topic draft as Slack blocks.
 */
export function formatDraftResponse(
  draft: string,
  topic: string
): SlackBlock[] {
  const blocks: SlackBlock[] = [];

  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: `Draft: ${topic.slice(0, 100)}`,
    },
  });

  blocks.push({ type: "divider" });

  const chunks = splitText(draft, 2900);
  for (const chunk of chunks) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: chunk,
      },
    });
  }

  blocks.push({ type: "divider" });

  blocks.push({
    type: "actions",
    block_id: "draft_actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "Ship It" },
        style: "primary",
        action_id: "approve_draft",
        value: "approved",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Revise" },
        action_id: "edit_draft",
        value: "edit",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Kill It" },
        style: "danger",
        action_id: "kill_draft",
        value: "killed",
      },
    ],
  });

  return blocks;
}

/**
 * Format an error message for posting to Slack.
 */
export function formatError(error: string): SlackBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Growth Engine Error*\n\n${error}\n\nThe daily scan encountered an issue. Check the logs for details.`,
      },
    },
  ];
}

/**
 * Format a status message.
 */
export function formatStatus(status: {
  lastScan?: Date;
  nextScan?: string;
  channelCount: number;
  webScannerEnabled: boolean;
}): SlackBlock[] {
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "Growth Engine Status" },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Last Scan:*\n${status.lastScan ? status.lastScan.toLocaleString("en-US", { timeZone: "America/New_York" }) : "Never"}`,
        },
        {
          type: "mrkdwn",
          text: `*Next Scan:*\n${status.nextScan || "Not scheduled"}`,
        },
        {
          type: "mrkdwn",
          text: `*Channels Monitored:*\n${status.channelCount}`,
        },
        {
          type: "mrkdwn",
          text: `*Web Scanner:*\n${status.webScannerEnabled ? "Enabled" : "Disabled (no TAVILY_API_KEY)"}`,
        },
      ],
    },
  ];
}

function splitText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find a good break point (newline or space)
    let breakPoint = remaining.lastIndexOf("\n", maxLength);
    if (breakPoint < maxLength / 2) {
      breakPoint = remaining.lastIndexOf(" ", maxLength);
    }
    if (breakPoint < maxLength / 2) {
      breakPoint = maxLength;
    }

    chunks.push(remaining.slice(0, breakPoint));
    remaining = remaining.slice(breakPoint).trimStart();
  }

  return chunks;
}
