export interface RateLimiterConfig { baseLimit: number; windowMs: number; clientHourlyLimits?: Record<string, number>; }

export interface RateDecision { blocked: boolean; limit: number; }

interface ClientWindow { timestamps: number[]; currentLimit: number; baseConfigured?: number; }

export class AdaptiveRateLimiter {
  private clients: Map<string, ClientWindow> = new Map();
  constructor(private cfg: RateLimiterConfig) {}

  check(clientId: string, now: number): RateDecision {
    let cw = this.clients.get(clientId);
    if (!cw) { 
      const hourly = this.cfg.clientHourlyLimits?.[clientId];
      const mappedBase = hourly ? Math.ceil(hourly * (this.cfg.windowMs / 3600_000)) : this.cfg.baseLimit;
      cw = { timestamps: [], currentLimit: mappedBase, baseConfigured: hourly };
      this.clients.set(clientId, cw); 
    }
    // remove old timestamps
    cw.timestamps = cw.timestamps.filter(t => now - t <= this.cfg.windowMs);
    const blocked = cw.timestamps.length >= cw.currentLimit;
    if (!blocked) cw.timestamps.push(now);
    // adaptive logic: if near limit and no blocking, maybe raise slightly; if high density errors (placeholder) lower.
    if (cw.timestamps.length > cw.currentLimit * 0.9 && !blocked) cw.currentLimit = Math.min(cw.currentLimit + 50, (cw.baseConfigured ? Math.ceil(cw.baseConfigured * (this.cfg.windowMs / 3600_000))*5 : this.cfg.baseLimit * 5));
    if (blocked) cw.currentLimit = Math.max(cw.baseConfigured ? Math.ceil(cw.baseConfigured * (this.cfg.windowMs / 3600_000)) : this.cfg.baseLimit, Math.floor(cw.currentLimit * 0.9));
    return { blocked, limit: cw.currentLimit };
  }
}
