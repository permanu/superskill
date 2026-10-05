---
id: typescript-test-mock-restore
lang: typescript
prefix: test
title: Reset mocks and timers after each test
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mock, reset, afterEach, timers]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [afterEach]
related: [typescript-test-injected-clock, typescript-test-isolated-state]
sources:
  - title: Node.js - Test runner (mock.timers.reset, mock.reset)
    url: https://nodejs.org/api/test.html
---
> Reset fake timers and mocks in an after-each hook so state does not leak between tests.

## Why

A mock or fake timer installed by one test stays active for every test that follows, so a later test observes the previous test's configuration and fails only when the suite runs in that order. Resetting in `afterEach` restores the real implementations before the next test starts.

## Bad

```typescript
declare function beforeEach(fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare const clock: { freeze(at: number): void };

beforeEach(() => {
  clock.freeze(0);
});

test("expires tokens", () => {});
```

## Good

```typescript
declare function beforeEach(fn: () => void): void;
declare function afterEach(fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare const clock: { freeze(at: number): void; reset(): void };

beforeEach(() => {
  clock.freeze(0);
});

afterEach(() => {
  clock.reset();
});

test("expires tokens", () => {});
```

## See Also

- [typescript-test-injected-clock](test-injected-clock.md) - the clock this rule restores
- [typescript-test-isolated-state](test-isolated-state.md) - the broader isolation contract
