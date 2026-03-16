export type ChannelCategory =
  | "partner"
  | "product_eng"
  | "convos"
  | "ecosystem";

export interface ChannelConfig {
  name: string;
  category: ChannelCategory;
}

/**
 * Configurable channel list for scanning.
 * Keys are Slack channel names (without #).
 * The bot resolves these to channel IDs at runtime using conversations.list.
 *
 * Edit this list to add/remove channels from the daily scan.
 */
export const SCAN_CHANNELS: ChannelConfig[] = [
  // Partner channels — #int-* (internal strategy) and #ext-* (direct partner comms)
  { name: "int-ecosystem", category: "partner" },
  { name: "int-coinbase", category: "partner" },
  { name: "ext-coinbase-wallet", category: "partner" },
  { name: "ext-coinbase-wallet-eng", category: "partner" },
  { name: "int-openclaw", category: "partner" },
  { name: "int-worldcoin", category: "partner" },
  { name: "ext-xmtp-world", category: "partner" },
  { name: "int-zora", category: "partner" },
  { name: "ext-xmtp-zora", category: "partner" },
  { name: "int-agents-and-miniapps", category: "partner" },
  { name: "int-bluesky", category: "partner" },
  { name: "int-ens", category: "partner" },
  { name: "ext-xmtp-ens", category: "partner" },
  { name: "int-farcaster", category: "partner" },
  { name: "int-sdk-support", category: "partner" },
  { name: "ext-xmtp-bnkr", category: "partner" },
  { name: "ext-xmtp-stripe", category: "partner" },
  { name: "ext-xmtp-agentmail", category: "partner" },
  { name: "ext-xmtp-agentcard", category: "partner" },
  { name: "ext-abstract-xmtp", category: "partner" },
  { name: "ext-xmtp-kalshi", category: "partner" },
  { name: "ext-xmtp-livepeer", category: "partner" },

  // Product & Engineering
  { name: "team-eng", category: "product_eng" },
  { name: "team-product", category: "product_eng" },
  { name: "team-sdk-protocol", category: "product_eng" },
  { name: "team-d14n", category: "product_eng" },

  // Convos (demand-side — biggest content gap)
  { name: "team-convos-app", category: "convos" },
  { name: "team-convos-product", category: "convos" },
  { name: "team-convos-inspo", category: "convos" },
  { name: "team-convos-storytelling", category: "convos" },
  { name: "team-convos-feedback-and-love", category: "convos" },

  // Ecosystem & Events
  { name: "ecosystem-team", category: "ecosystem" },
  { name: "int-convos-nyc-openclawhack", category: "ecosystem" },
  { name: "notify-switchboard-intake", category: "ecosystem" },
  { name: "team-marketing", category: "ecosystem" },
  { name: "announcements", category: "ecosystem" },
  { name: "team-design", category: "ecosystem" },
  { name: "content-inspo", category: "ecosystem" },
];
