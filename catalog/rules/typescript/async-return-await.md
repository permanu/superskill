---
id: typescript-async-return-await
lang: typescript
prefix: async
title: Return promises directly, but return await inside try/catch
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/return-await"
baseline: latest
status: verified
triggers:
  keywords: [return await, try, catch, rejection]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [await, Promise]
related: [typescript-async-await-thenable, typescript-err-no-swallow]
sources:
  - title: typescript-eslint - return-await
    url: https://typescript-eslint.io/rules/return-await/
  - title: MDN - Using promises (nesting and error handling)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
---
> Return promises directly outside `try`/`catch` and `return await` inside it so the catch block sees rejections.

## Why

Inside `try`, `return promise` hands the pending promise to the caller before the rejection is attached, so the `catch` block never runs for a failure that happens after the return. `return await` keeps the function attached to the rejection so `catch` and `finally` run as written, and the awaited form also improves stack traces. Outside error-handling contexts either form settles the same value, and the policy keeps the shorter direct return for consistency.

## Bad

```typescript
declare function load(id: string): Promise<string>;

async function get(id: string): Promise<string> {
  return await load(id);
}
```

## Good

```typescript
declare function load(id: string): Promise<string>;

async function get(id: string): Promise<string> {
  return load(id);
}

async function getOrFallback(id: string): Promise<string> {
  try {
    return await load(id);
  } catch {
    return "";
  }
}
```

## See Also

- [typescript-async-await-thenable](async-await-thenable.md) - awaits that attach to nothing
- [typescript-err-no-swallow](err-no-swallow.md) - catch blocks that must actually see the failure
