---
id: typescript-test-assert-helper-throws
lang: typescript
prefix: test
title: Make custom assertion helpers throw on failure
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assertion helper, throws, boolean, matcher]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Error]
related: [typescript-test-assert-rejects, typescript-err-throw-error-only]
sources:
  - title: Node.js - Assert (AssertionError)
    url: https://nodejs.org/api/assert.html
  - title: Node.js - Errors (Error propagation and interception)
    url: https://nodejs.org/api/errors.html
---
> Make a custom assertion helper throw on failure so an unasserted call still fails the test.

## Why

A helper that returns a boolean depends on every caller remembering to check it, and a forgotten check turns a failing expectation into a passing test. Throwing an `Error` on failure makes the helper itself the assertion, so calling it is enough to fail the test and the message names the violated condition.

## Bad

```typescript
function isSorted(values: number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1] <= value);
}
```

## Good

```typescript
function assertSorted(values: number[]): void {
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] > values[i]) {
      throw new Error(`values are not sorted at index ${i}`);
    }
  }
}
```

## See Also

- [typescript-test-assert-rejects](test-assert-rejects.md) - the async form of a throwing expectation
- [typescript-err-throw-error-only](err-throw-error-only.md) - the Error contract the helper follows
