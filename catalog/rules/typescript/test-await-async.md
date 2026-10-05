---
id: typescript-test-await-async
lang: typescript
prefix: test
title: Await async work inside tests so failures fail the test
severity: must
enforce: tool
tool: "eslint:@typescript-eslint/no-floating-promises"
baseline: latest
status: verified
triggers:
  keywords: [async test, floating promise, await, assertion]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Promise]
related: [typescript-err-async-propagate, typescript-async-no-misused-promises]
sources:
  - title: typescript-eslint - no-floating-promises
    url: https://typescript-eslint.io/rules/no-floating-promises/
  - title: Node.js - Test runner (asynchronous tests)
    url: https://nodejs.org/api/test.html
---
> Await or return async work inside a test; a floating promise fails after the test has passed.

## Why

The test runner decides the result when the test function returns, so an unawaited promise settles after the verdict and its rejection is reported too late or not at all. Returning the promise or awaiting it keeps the assertion inside the test's lifecycle, where a failure flips the result.

## Bad

```typescript
declare function test(name: string, fn: () => void): void;
declare function save(input: string): Promise<void>;

test("saves the draft", () => {
  save("draft");
});
```

## Good

```typescript
declare function test(name: string, fn: () => Promise<void>): void;
declare function save(input: string): Promise<void>;

test("saves the draft", async () => {
  await save("draft");
});
```

## See Also

- [typescript-err-async-propagate](err-async-propagate.md) - why a floating rejection has no handler
- [typescript-async-no-misused-promises](async-no-misused-promises.md) - async callbacks that nothing awaits
