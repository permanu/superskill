---
id: typescript-test-skip-reason
lang: typescript
prefix: test
title: Skip a test with a reason so the suite records why
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [skip, reason, disabled, suite]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [skip]
related: [typescript-test-no-focus]
sources:
  - title: Node.js - Test runner (skipping tests)
    url: https://nodejs.org/api/test.html
---
> Skip a test with a reason so the suite records why the case is not running.

## Why

A bare `skip: true` leaves the next reader guessing whether the case is obsolete, blocked, or forgotten, and nothing in the output explains the missing coverage. The reason string is reported by the runner, so the cause travels with the suite output.

## Bad

```typescript
declare function test(name: string, fn: () => void, options?: { skip?: boolean | string }): void;

test("syncs orders", () => {}, { skip: true });
```

## Good

```typescript
declare function test(name: string, fn: () => void, options?: { skip?: boolean | string }): void;

test("syncs orders", () => {}, { skip: "blocked by issue 412" });
```

## See Also

- [typescript-test-no-focus](test-no-focus.md) - the accidental form of not running tests
