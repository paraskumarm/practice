import { startWatching } from './core/watcher.js';
import { MetricsAggregator } from './core/aggregator.js';
import { InsightsWriter } from './storage/output-writer.js';
import { AdaptiveRateLimiter } from './core/rate-limiter.js';
import fs from 'fs';

const INPUT_DIR = './input';
const OUTPUT_DIR = './output';

async function main() {
  const aggregator = new MetricsAggregator();
  const limitsPath = './limits.json';
  let clientHourlyLimits: Record<string, number> | undefined;
  if (fs.existsSync(limitsPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(limitsPath,'utf-8'));
      clientHourlyLimits = Object.fromEntries(Object.entries(parsed.clients||{}).map(([k,v]: [string, any]) => [k, v.requests_per_hour]));
    } catch (e) { console.warn('Failed to parse limits.json:', e); }
  }
  const rateLimiter = new AdaptiveRateLimiter({ baseLimit: 1000, windowMs: 60_000, clientHourlyLimits });
  const writer = new InsightsWriter(OUTPUT_DIR, aggregator, rateLimiter);

  // Periodic insights output
  setInterval(() => {
    writer.writeInsights();
  }, 10_000);

  await startWatching(INPUT_DIR, aggregator, rateLimiter);
}

main().catch(err => {
  console.error('Fatal error in main:', err);
  process.exit(1);
});
