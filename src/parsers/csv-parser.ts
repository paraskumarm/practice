import { parse } from 'csv-parse';
import { NormalizedLogEntry, normalizeRaw } from '../models/log-entry.js';

export class CsvParser {
  async parseStream(stream: NodeJS.ReadableStream): Promise<NormalizedLogEntry[]> {
    const records: any[] = await new Promise((resolve, reject) => {
      const recs: any[] = [];
      stream.pipe(parse({ columns: true, relax_column_count: true }))
        .on('data', (r) => recs.push(r))
        .on('error', reject)
        .on('end', () => resolve(recs));
    });
    // Map common alt column names to expected normalization keys
    const mapped = records.map(r => ({
      sourceId: r.sourceId || r.source || 'Microservice',
      client_id: r.client_id || r.clientId || r.api_key,
      endpoint: r.endpoint || r.path,
      latency_ms: r.response_time_ms || r.latency_ms || r.latencyMs,
      status_code: r.status_code || r.status || r.statusCode,
      timestamp: r.timestamp
    }));
  return mapped.map(normalizeRaw).filter((r: NormalizedLogEntry) => !!r.clientId);
  }
}
