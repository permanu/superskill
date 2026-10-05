---
id: typescript-test-wait-for
lang: typescript
prefix: test
title: Wait for the condition instead of sleeping a fixed time
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [waitFor, sleep, flaky, condition]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [waitFor]
related: [typescript-test-await-async, typescript-test-injected-clock]
sources:
  - title: Node.js - Test runner (context.waitFor)
    url: https://nodejs.org/api/test.html
  - title: MDN - Using promises (timing)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
---
> Wait for the condition with `waitFor`; a fixed sleep is slow and still flaky.

## Why

A fixed delay both wastes time when the condition is already true and fails when the machine is slower than the chosen number. `waitFor` invokes an assertion callback until it stops throwing, so the wait ends as soon as readiness holds and fails when the polling timeout elapses.

## Bad

```typescript
declare function delay(ms: number): Promise<void>;
declare function assertReady(): void;

async function check(): Promise<void> {
  await delay(100);
  assertReady();
}
```

## Good

```typescript
declare function waitFor(condition: () => void): Promise<void>;
declare function assertReady(): void;

async function check(): Promise<void> {
  await waitFor(() => {
    assertReady();
  });
}
```

## See Also

- [typescript-test-await-async](test-await-async.md) - keeping the wait inside the test lifecycle
- [typescript-test-injected-clock](test-injected-clock.md) - removing time dependence entirely
