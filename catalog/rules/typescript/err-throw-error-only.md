---
id: typescript-err-throw-error-only
lang: typescript
prefix: err
title: Throw only Error instances so failures carry a stack and a name
severity: must
enforce: tool
tool: "eslint:@typescript-eslint/only-throw-error"
baseline: latest
status: verified
triggers:
  keywords: [throw, error, exception, stack]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Error, throw]
related: [typescript-err-domain-error-class, typescript-err-wrap-with-cause]
sources:
  - title: typescript-eslint - only-throw-error
    url: https://typescript-eslint.io/rules/only-throw-error/
  - title: MDN - Error
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
---
> Throw only `Error` instances; strings and plain objects carry no stack and break `instanceof` handling.

## Why

A thrown string or object has no stack and no `name`, so logs cannot locate it and handlers cannot discriminate by type. Only `Error` instances carry the stack trace the runtime captures at construction, and the ecosystem assumes `instanceof Error` when classifying failures.

## Bad

```typescript
function findUser(id: string): { id: string } {
  if (id === "") {
    throw "user id must not be empty";
  }
  return { id };
}
```

## Good

```typescript
function findUser(id: string): { id: string } {
  if (id === "") {
    throw new Error("user id must not be empty");
  }
  return { id };
}
```

## See Also

- [typescript-err-domain-error-class](err-domain-error-class.md) - the subclass form for failures that callers discriminate
- [typescript-err-wrap-with-cause](err-wrap-with-cause.md) - how to attach the original failure when adding context
