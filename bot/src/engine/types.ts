export type PostType =
  | "announcement"
  | "thread"
  | "builder-spotlight"
  | "signal-boost"
  | "minimal";

export type VolumeLever =
  | "coinbase-wallet"
  | "claws-agent-sdk"
  | "convos"
  | "ecosystem-breadth"
  | "world"
  | "zora"
  | "bankr"
  | "switchboard"
  | string;

export interface ContentDraft {
  postType: PostType;
  volumeLever: VolumeLever;
  title: string;
  basedOn: string;
  draft: string;
  visualNeeded: boolean;
  visualDescription?: string;
  tags: string[];
  coordination: string;
}

export interface WorkflowResult {
  recommendations: ContentDraft[];
  scanSummary: string;
  xMentions: string;
  gapFlags: string[];
  dayOfWeek: string;
}
