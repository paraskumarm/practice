import { ClientMetrics, LatencyMetrics, InsightsOutput, TopEndpointMetric } from '../types/metrics.js';
import { NormalizedLogEntry } from '../models/log-entry.js';
import { RateDecision } from './rate-limiter.js';

interface ClientState {
  requests: number;
  success: number;
  failed: number;
  byEndpoint: Record<string, number>;
  latencies: number[];
  errors: Record<string, number>;
  incomingBytes: number;
  outgoingBytes: number;
  overages: number;
  limit: number;
}

export class MetricsAggregator {
  private clientMap: Map<string, ClientState> = new Map();
  private sourceMap: Map<string, Set<string>> = new Map();
  private startWindow = Date.now();

  ingest(entry: NormalizedLogEntry, rateDecision: RateDecision) {
    const clientId = entry.clientId;
    let state = this.clientMap.get(clientId);
    if (!state) {
      state = { requests: 0, success: 0, failed: 0, byEndpoint: {}, latencies: [], errors: {}, incomingBytes: 0, outgoingBytes: 0, overages: 0, limit: rateDecision.limit };
      this.clientMap.set(clientId, state);
    }
    state.requests++;
    state.byEndpoint[entry.endpoint] = (state.byEndpoint[entry.endpoint] || 0) + 1;
    if (entry.statusCode >= 200 && entry.statusCode < 400) state.success++; else state.failed++;
    if (entry.statusCode >= 400) state.errors[String(entry.statusCode)] = (state.errors[String(entry.statusCode)] || 0) + 1;
    state.latencies.push(entry.latencyMs);
    state.incomingBytes += entry.requestBytes;
    state.outgoingBytes += entry.responseBytes;
    if (!this.sourceMap.has(entry.sourceId)) this.sourceMap.set(entry.sourceId, new Set());
    this.sourceMap.get(entry.sourceId)!.add(clientId);
    if (rateDecision.blocked) state.overages++;
    state.limit = rateDecision.limit;
  }

  buildInsights(): InsightsOutput {
    const endWindow = Date.now();
    const clients: ClientMetrics[] = [];
    let totalRequests = 0; let totalLatency = 0; let errorCount = 0; let totalIncoming = 0; let totalOutgoing = 0;
    for (const [clientId, s] of this.clientMap.entries()) {
      totalRequests += s.requests;
      totalLatency += s.latencies.reduce((a,b)=>a+b,0);
      errorCount += Object.values(s.errors).reduce((a,b)=>a+b,0);
      totalIncoming += s.incomingBytes; totalOutgoing += s.outgoingBytes;
      const latencyMetrics: LatencyMetrics = this.computeLatency(s.latencies);
      const rateLimitObj = { limit: s.limit, used: s.requests, remaining: Math.max(0, s.limit - s.requests), resetTime: endWindow + 60_000, overageCount: s.overages, exceeded: s.requests > s.limit, configuredHourly: undefined };
      clients.push({
        clientId,
        timestamp: { start: this.startWindow, end: endWindow },
        requests: { total: s.requests, success: s.success, failed: s.failed, byEndpoint: s.byEndpoint },
        latency: latencyMetrics,
        rateLimit: rateLimitObj,
        errors: { total: Object.values(s.errors).reduce((a,b)=>a+b,0), byType: s.errors, rate: s.requests ? Object.values(s.errors).reduce((a,b)=>a+b,0)/s.requests : 0 },
        bandwidth: { incoming: s.incomingBytes, outgoing: s.outgoingBytes }
      });
    }

    const sourcesMetrics = Array.from(this.sourceMap.entries()).map(([sourceId, set]) => {
      // top endpoints for this source
      const endpointCounts: Record<string, number> = {};
      for (const c of set) {
        const cm = this.clientMap.get(c);
        if (!cm) continue;
        for (const [ep,count] of Object.entries(cm.byEndpoint)) {
          endpointCounts[ep] = (endpointCounts[ep]||0)+count;
        }
      }
      const topEndpoints: TopEndpointMetric[] = Object.entries(endpointCounts)
        .sort((a,b)=>b[1]-a[1])
        .slice(0,10)
        .map(([endpoint,count])=>({endpoint,count}));
      return {
        sourceId,
        activeClients: set.size,
        aggregateMetrics: {
          totalRequests: Array.from(set).reduce((acc,c)=> acc + (this.clientMap.get(c)?.requests||0),0),
          averageLatency: totalRequests ? totalLatency/totalRequests : 0,
          errorRate: totalRequests ? errorCount/totalRequests : 0,
          bandwidth: { incoming: totalIncoming, outgoing: totalOutgoing }
        },
        clients: clients.filter(c => set.has(c.clientId)),
        topEndpoints,
        lastUpdated: endWindow
      };
    });

    return {
      version: '1.0',
      timestamp: endWindow,
      interval: { start: this.startWindow, end: endWindow },
      sources: sourcesMetrics,
      globalStats: {
        totalSources: this.sourceMap.size,
        totalClients: this.clientMap.size,
        totalRequests,
        averageLatency: totalRequests ? totalLatency/totalRequests : 0,
        globalErrorRate: totalRequests ? errorCount/totalRequests : 0,
        systemHealth: { cpuUsage: 0, memoryUsage: 0, storageUsage: 0 }
      }
    };
  }

  resetWindow() { this.startWindow = Date.now(); this.clientMap.clear(); this.sourceMap.clear(); }

  private computeLatency(latencies: number[]): LatencyMetrics {
    if (!latencies.length) return { min:0,max:0,avg:0,p95:0,p99:0 };
    const sorted = [...latencies].sort((a,b)=>a-b);
    const sum = sorted.reduce((a,b)=>a+b,0);
    const pct = (p: number) => sorted[Math.min(sorted.length-1, Math.floor(p*sorted.length))];
    return { min: sorted[0], max: sorted[sorted.length-1], avg: sum/sorted.length, p95: pct(0.95), p99: pct(0.99) };
  }
}
