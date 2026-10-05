---
id: typescript-test-no-focus
lang: typescript
prefix: test
title: Do not commit focused tests that skip the rest of the suite
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [only, focus, skip, suite]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [only]
related: [typescript-test-skip-reason]
sources:
  - title: Node.js - Test runner (only tests)
    url: https://nodejs.org/api/test.html
---
> Remove focused tests before committing; a stray `.only` skips the rest of the suite.

## Why

A focused test runs alone and reports success while every other test in the file is silently omitted, so the suite stops protecting the code it used to cover. Focus markers are useful while iterating and must be removed before the change lands.

## Bad

```typescript
declare const test: {
  (name: string, fn: () => void): void;
  only(name: string, fn: () => void): void;
};

test.only("creates a user", () => {});
```

## Good

```typescript
declare const test: {
  (name: string, fn: () => void): void;
  only(name: string, fn: () => void): void;
};

test("creates a user", () => {});
```

## See Also

- [typescript-test-skip-reason](test-skip-reason.md) - the deliberate, documented form of not running a test
