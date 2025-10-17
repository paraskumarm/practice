import fs from 'fs';
import path from 'path';
import { MetricsAggregator } from '../core/aggregator.js';
import { AdaptiveRateLimiter } from '../core/rate-limiter.js';

export class InsightsWriter {
  constructor(private outputDir: string, private aggregator: MetricsAggregator, private rateLimiter: AdaptiveRateLimiter) {}

  writeInsights() {
    const insights = this.aggregator.buildInsights();
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    const file = path.join(this.outputDir, `insights_${ts}.json`);
    fs.writeFileSync(file, JSON.stringify(insights, null, 2));
    // rotate window after writing
    this.aggregator.resetWindow();
  }
}
