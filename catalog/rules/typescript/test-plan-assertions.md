---
id: typescript-test-plan-assertions
lang: typescript
prefix: test
title: Declare the expected assertion count so a silent test fails
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [plan, assertions, silent pass, test context]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [plan]
related: [typescript-test-await-async, typescript-test-assert-helper-throws]
sources:
  - title: Node.js - Test runner (context.plan)
    url: https://nodejs.org/api/test.html
---
> Declare the expected assertion count with `plan` so a test that runs none fails.

## Why

A test whose assertion sits behind a branch or callback can finish without checking anything, and the runner counts it as a pass. Planning the expected number of assertions makes a missing assertion a failure, but the plan only counts assertions made through the context's own `assert`, so an assertion called on an imported module stays invisible to it.

## Bad

```typescript
declare function test(name: string, fn: (t: { plan(count: number): void }) => void): void;
declare function expectRejection(value: string): void;

test("rejects empty input", (t) => {
  t.plan(1);
  expectRejection("");
});
```

## Good

```typescript
declare function test(name: string, fn: (t: TestContext) => Promise<void>): void;
declare function save(input: string): Promise<void>;

interface TestContext {
  plan(count: number): void;
  assert: {
    rejects(promise: Promise<unknown>): Promise<void>;
  };
}

test("rejects empty input", async (t) => {
  t.plan(1);
  await t.assert.rejects(save(""));
});
```

## See Also

- [typescript-test-await-async](test-await-async.md) - assertions that run after the test has ended
- [typescript-test-assert-helper-throws](test-assert-helper-throws.md) - helpers that make each planned assertion count
