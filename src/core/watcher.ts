import chokidar from 'chokidar';
import { ParserFactory } from '../parsers/parser-factory.js';
import { MetricsAggregator } from './aggregator.js';
import { AdaptiveRateLimiter } from './rate-limiter.js';
import fs from 'fs';
import path from 'path';

interface FileState { offset: number; }
const fileState: Record<string, FileState> = {};

export async function startWatching(inputDir: string, aggregator: MetricsAggregator, rateLimiter: AdaptiveRateLimiter) {
  const watcher = chokidar.watch(inputDir, { ignoreInitial: false, persistent: true, depth: 3 });

  watcher.on('add', file => processFile(file, aggregator, rateLimiter));
  watcher.on('change', file => processFile(file, aggregator, rateLimiter));
}

async function processFile(filePath: string, aggregator: MetricsAggregator, rateLimiter: AdaptiveRateLimiter) {
  if (fs.statSync(filePath).isDirectory()) return;
  const ext = path.extname(filePath).toLowerCase();
  const parser = ParserFactory.getParser(ext);
  if (!parser) return;
  const previous = fileState[filePath]?.offset || 0;
  const size = fs.statSync(filePath).size;
  if (size <= previous) return; // nothing new
  const stream = fs.createReadStream(filePath, { start: previous, end: size });
  const entries = await parser.parseStream(stream);
  for (const entry of entries) {
    const decision = rateLimiter.check(entry.clientId, Date.now());
    aggregator.ingest(entry, decision);
  }
  fileState[filePath] = { offset: size };
}
