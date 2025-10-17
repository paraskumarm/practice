export interface LatencyMetrics {
  min: number;          // Minimum latency in milliseconds
  max: number;          // Maximum latency in milliseconds
  avg: number;          // Average latency in milliseconds
  p95: number;          // 95th percentile latency
  p99: number;          // 99th percentile latency
}

export interface RateLimitMetrics {
  limit: number;        // Current dynamic limit for the window
  used: number;         // Requests used in the current window
  remaining: number;    // Remaining requests allowed (limit - used)
  resetTime: number;    // Timestamp when the limit resets
  overageCount: number; // Number of blocked/exceeded requests in window
  exceeded: boolean;    // Whether limit has been exceeded in this window
  configuredHourly?: number; // Original configured hourly limit if provided
}

export interface ErrorMetrics {
  total: number;        // Total number of errors
  byType: {            // Breakdown by error type
    [errorCode: string]: number;
  };
  rate: number;        // Error rate (errors/total requests)
}

export interface ClientMetrics {
  clientId: string;
  timestamp: {
    start: number;     // Start of the reporting period
    end: number;       // End of the reporting period
  };
  requests: {
    total: number;     // Total number of requests
    success: number;   // Successful requests
    failed: number;    // Failed requests
    byEndpoint: {      // Breakdown by API endpoint
      [endpoint: string]: number;
    };
  };
  latency: LatencyMetrics;
  rateLimit: RateLimitMetrics;
  errors: ErrorMetrics;
  bandwidth: {
    incoming: number;  // Total incoming bandwidth in bytes
    outgoing: number;  // Total outgoing bandwidth in bytes
  };
  tags?: {            // Optional custom tags for client categorization
    [key: string]: string;
  };
}

export interface TopEndpointMetric { endpoint: string; count: number; }

export interface SourceMetrics {
  sourceId: string;
  activeClients: number;
  aggregateMetrics: {
    totalRequests: number;
    averageLatency: number;
    errorRate: number;
    bandwidth: {
      incoming: number;
      outgoing: number;
    };
  };
  clients: ClientMetrics[];
  topEndpoints: TopEndpointMetric[]; // Top endpoints by request count within this source
  lastUpdated: number;  // Timestamp of last update
}

export interface InsightsOutput {
  version: string;      // Format version for backward compatibility
  timestamp: number;    // When this insight was generated
  interval: {           // Time window for these insights
    start: number;
    end: number;
  };
  sources: SourceMetrics[];
  globalStats: {        // System-wide statistics
    totalSources: number;
    totalClients: number;
    totalRequests: number;
    averageLatency: number;
    globalErrorRate: number;
    systemHealth: {
      cpuUsage: number;
      memoryUsage: number;
      storageUsage: number;
    };
  };
}