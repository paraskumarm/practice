import { JsonParser } from './json-parser.js';
import { CsvParser } from './csv-parser.js';

export interface LogParser { parseStream(stream: NodeJS.ReadableStream): Promise<any[]>; }

export class ParserFactory {
  static getParser(ext: string): LogParser | null {
    switch (ext) {
      case '.json': return new JsonParser();
      case '.jsonl': return new JsonParser(true);
      case '.csv': return new CsvParser();
      default: return null;
    }
  }
}
