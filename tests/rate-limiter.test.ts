import { AdaptiveRateLimiter } from '../src/core/rate-limiter.js';

describe('AdaptiveRateLimiter', () => {
  it('blocks after exceeding limit within window', () => {
    const rl = new AdaptiveRateLimiter({ baseLimit: 5, windowMs: 1000 });
    const client = 'c1';
    let blockedCount = 0;
    for (let i=0;i<10;i++) {
      const decision = rl.check(client, Date.now());
      if (decision.blocked) blockedCount++;
    }
    expect(blockedCount).toBeGreaterThan(0);
  });
});
