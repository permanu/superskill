---
id: typescript-test-injected-clock
lang: typescript
prefix: test
title: Read the current time through an injected clock so tests control it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [clock, Date.now, time, expiry]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Date.now]
related: [typescript-test-mock-restore, typescript-err-retry-idempotent]
sources:
  - title: Node.js - Test runner (mocking timers and dates)
    url: https://nodejs.org/api/test.html
  - title: MDN - Performance.now (monotonic clock)
    url: https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
---
> Read the current time through an injected clock so tests decide expiry without waiting.

## Why

A function that calls `Date.now()` directly can only be tested by waiting for real time to pass or by patching a global that other tests share. An injected clock keeps the time source explicit, lets a test freeze or advance it, and leaves the function deterministic in production.

## Bad

```typescript
function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}
```

## Good

```typescript
interface Clock {
  now(): number;
}

function isExpired(expiresAt: number, clock: Clock): boolean {
  return clock.now() > expiresAt;
}
```

## See Also

- [typescript-test-mock-restore](test-mock-restore.md) - resetting a fake clock between tests
- [typescript-err-retry-idempotent](err-retry-idempotent.md) - delays that a fake clock can advance instantly
