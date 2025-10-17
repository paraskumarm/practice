import { normalizeRaw } from '../src/models/log-entry.js';

describe('normalizeRaw', () => {
  it('maps various key aliases correctly', () => {
    const raw = { source: 's1', client_id: 'abc', path: '/x', latency: 123, status: 200, reqBytes: 50, resBytes: 75, timestamp: 111 };
    const n = normalizeRaw(raw);
    expect(n.sourceId).toBe('s1');
    expect(n.clientId).toBe('abc');
    expect(n.endpoint).toBe('/x');
    expect(n.latencyMs).toBe(123);
    expect(n.statusCode).toBe(200);
    expect(n.requestBytes).toBe(50);
    expect(n.responseBytes).toBe(75);
    expect(n.timestamp).toBe(111);
  });
});
