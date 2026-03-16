export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RateLimiter {
  private delayMs: number;

  constructor(delayMs: number = 1200) {
    this.delayMs = delayMs;
  }

  async throttle(): Promise<void> {
    await delay(this.delayMs);
  }
}
