---
id: typescript-test-assert-rejects
lang: typescript
prefix: test
title: Assert rejections with a rejection assertion, not a try/catch flag
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [rejects, assertion, catch, failure path]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Promise]
related: [typescript-err-no-swallow, typescript-test-assert-helper-throws]
sources:
  - title: Node.js - Assert (assert.rejects)
    url: https://nodejs.org/api/assert.html
  - title: MDN - Using promises (error handling)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
---
> Assert rejected promises with a rejection assertion; a try/catch flag hides the original failure.

## Why

A boolean flag records only that something threw, discarding the error object the assertion could compare against. A rejection assertion fails the test when the promise fulfills, and it can match the expected error type, code, or message so a wrong failure is caught too.

## Bad

```typescript
declare function save(input: string): Promise<void>;

async function check(): Promise<void> {
  let failed = false;
  try {
    await save("");
  } catch {
    failed = true;
  }
  if (!failed) {
    throw new Error("expected save to reject");
  }
}
```

## Good

```typescript
declare function save(input: string): Promise<void>;
declare function expectRejects(promise: Promise<unknown>): Promise<void>;

async function check(): Promise<void> {
  await expectRejects(save(""));
}
```

## See Also

- [typescript-err-no-swallow](err-no-swallow.md) - why the failure path needs an explicit outcome
- [typescript-test-assert-helper-throws](test-assert-helper-throws.md) - helpers that throw when an expectation fails
