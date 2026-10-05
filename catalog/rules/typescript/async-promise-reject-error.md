---
id: typescript-async-promise-reject-error
lang: typescript
prefix: async
title: Reject promises with Error objects, not strings
severity: must
enforce: tool
tool: "eslint:@typescript-eslint/prefer-promise-reject-errors"
baseline: latest
status: verified
triggers:
  keywords: [reject, Error, promise, reason]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Promise.reject, Error]
related: [typescript-err-throw-error-only, typescript-async-no-void-silence]
sources:
  - title: typescript-eslint - prefer-promise-reject-errors
    url: https://typescript-eslint.io/rules/prefer-promise-reject-errors/
  - title: MDN - Error
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
---
> Reject promises with `Error` objects; a rejection reason without a stack cannot be diagnosed.

## Why

A string rejection reason carries no stack, no type, and no fields, so handlers cannot discriminate it and logs cannot locate it. `Error` objects are the one rejection shape every runtime and logger understands, which is why the promise equivalent of throwing a non-Error is also a defect.

## Bad

```typescript
function fail(reason: string): Promise<never> {
  return Promise.reject(reason);
}
```

## Good

```typescript
function fail(reason: string): Promise<never> {
  return Promise.reject(new Error(reason));
}
```

## See Also

- [typescript-err-throw-error-only](err-throw-error-only.md) - the synchronous version of the same contract
- [typescript-async-no-void-silence](async-no-void-silence.md) - making sure the rejection reaches a handler
