---
id: typescript-mem-finalization-fallback
lang: typescript
prefix: mem
title: Release resources explicitly, not in a finalizer
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [FinalizationRegistry, cleanup, garbage collection]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [FinalizationRegistry]
related: [typescript-mem-object-url-revoke, typescript-err-finally-cleanup]
sources:
  - title: MDN - FinalizationRegistry
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
---
> Close external resources on the normal path; keep FinalizationRegistry as a fallback, never the plan.

## Why

A cleanup callback runs only after the engine decides to collect the target, and MDN warns that finalizers should not be used for essential program logic. Explicit release in `finally` runs when the work ends, with the registry as a safety net for the paths that miss.

## Bad

```typescript
declare function closeHandle(handle: string): void;

const registry = new FinalizationRegistry((handle: string) => {
  closeHandle(handle);
});

export function track(target: object, handle: string): void {
  registry.register(target, handle);
}
```

## Good

```typescript
declare function closeHandle(handle: string): void;

export function withHandle(handle: string, work: () => void): void {
  try {
    work();
  } finally {
    closeHandle(handle);
  }
}
```

## See Also

- [typescript-mem-object-url-revoke](mem-object-url-revoke.md) - an explicit release with a guaranteed hook
- [typescript-err-finally-cleanup](err-finally-cleanup.md) - the cleanup path this rule relies on
