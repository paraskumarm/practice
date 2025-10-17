export interface NormalizedLogEntry {
  sourceId: string;
  clientId: string;
  endpoint: string;
  latencyMs: number;
  statusCode: number;
  requestBytes: number;
  responseBytes: number;
  timestamp: number;
}

const clientKeys = ['clientId','client_id','cid','api_key'];
const endpointKeys = ['endpoint','path','url'];
const latencyKeys = ['latencyMs','latency','duration_ms','responseTime','response_time_ms','latency_ms'];
const statusKeys = ['status','statusCode','code','status_code'];

export function normalizeRaw(raw: any): NormalizedLogEntry {
  const pick = (keys: string[], fallback: any = '') => keys.map(k=>raw[k]).find(v=> v !== undefined && v !== null) ?? fallback;
  const clientId = pick(clientKeys, 'unknown');
  const endpoint = pick(endpointKeys, '');
  const latency = Number(pick(latencyKeys, 0));
  const status = Number(pick(statusKeys, 0));
  return {
    sourceId: raw.sourceId || raw.source || 'unknown-source',
    clientId,
    endpoint,
    latencyMs: isFinite(latency)? latency:0,
    statusCode: isFinite(status)? status:0,
    requestBytes: Number(raw.requestBytes || raw.reqBytes || raw.inBytes || 0),
    responseBytes: Number(raw.responseBytes || raw.resBytes || raw.outBytes || 0),
    timestamp: Number(raw.timestamp || Date.now())
  };
}
