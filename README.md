# API Traffic Processor (Local Demo)

This project simulates a cloud provider edge/microservice log ingestion pipeline. It watches an `input` directory for JSONL / JSON / CSV log files written per source, normalizes entries, aggregates metrics, applies an adaptive rate limiter, and periodically emits insight JSON snapshots into `output` using the generic format defined in `src/types/metrics.ts`.

## Features
- Incremental file tail parsing (JSONL, JSON, CSV ready for extension)
- Source + client level aggregation (requests, latency percentiles, errors, bandwidth)
- Adaptive per-client rate limiter with dynamic limit adjustments
- Periodic insight emission (default every 10s) using a versioned schema
- Simulation script generating synthetic multi-source traffic

## Directory Layout
```
input/            # Log files appear here under subfolders per source (created by simulator)
output/           # Insight JSON snapshots written here
scripts/simulate.ts  # Traffic generator (JSONL format)
src/main.ts       # Starts watcher + periodic insight writer
src/core/*        # Aggregator, rate limiter, watcher logic
src/parsers/*     # Parsers & factory
src/models/*      # Normalization logic
src/storage/*     # Output writer
src/types/metrics.ts # Insight output schema
```

## Prerequisites
- Node.js 18+ (recommended)

## Install
```bash
npm install
```

## Run Simulation + Processor
Open two terminals:

Terminal 1: start log simulation
```bash
npm run simulate
```

Terminal 2: start processor
```bash
npm start
```

After ~10 seconds you should see files like:
```
output/insights_2025-10-17T12-00-10-123Z.json
```

Each file conforms to `InsightsOutput` schema. Example fields:
- `sources[].clients[].requests.total`
- `sources[].clients[].latency.p95`
- `sources[].clients[].rateLimit.remaining`

## Extending
- Add new parser: implement `LogParser` and register by extension in `parser-factory.ts`.
- Add new metric: extend `ClientMetrics` / `InsightsOutput` in `metrics.ts` and update `MetricsAggregator.buildInsights()`.

## Adjusting Rate Limits
Modify `baseLimit` & `windowMs` in `src/main.ts` when constructing `AdaptiveRateLimiter`.

## Notes
- Current simulation writes JSONL only; add other formats manually for testing.
- Latency percentiles are approximate via simple sorted array; for very high throughput replace with streaming quantile algorithm.

## License
Internal demo.
