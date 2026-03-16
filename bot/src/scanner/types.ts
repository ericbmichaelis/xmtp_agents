import { ChannelCategory } from "../config/channels";

export interface Signal {
  source: string;
  category: ChannelCategory | "web" | "twitter";
  timestamp: string;
  author?: string;
  text: string;
  url?: string;
}

export interface ScanResult {
  category: ChannelCategory | "web" | "twitter";
  channelName: string;
  signals: Signal[];
  messageCount: number;
  error?: string;
}

export interface ScanSummary {
  scannedAt: Date;
  channelResults: ScanResult[];
  webResults: ScanResult[];
  totalSignals: number;
}
