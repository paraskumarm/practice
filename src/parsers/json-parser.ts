import fs from 'fs';
import { NormalizedLogEntry, normalizeRaw } from '../models/log-entry.js';

export class JsonParser {
  constructor(private lineDelimited: boolean = false) {}
  async parseStream(stream: fs.ReadStream): Promise<NormalizedLogEntry[]> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString('utf-8');
    let entries: any[];
    if (this.lineDelimited) {
      entries = raw.split(/\n+/).filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(e=>e);
    } else {
      // Try parse whole JSON; if it contains a 'requests' array, expand
      try {
        const obj = JSON.parse(raw);
        if (obj && Array.isArray(obj.requests)) {
          entries = obj.requests.map((r: any) => ({ ...r, timestamp: obj.timestamp, sourceId: obj.sourceId || 'unknown-source' }));
        } else if (Array.isArray(obj)) {
          entries = obj;
        } else {
          entries = [obj];
        }
      } catch {
        // fallback naive chunking
        entries = (JSON.parse(`[${raw.replace(/}\s*{/, '},{')}]`) as any[]);
      }
    }
    return entries.map(normalizeRaw).filter((e: any)=>e.clientId);
  }
}
