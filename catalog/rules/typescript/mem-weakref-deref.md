---
id: typescript-mem-weakref-deref
lang: typescript
prefix: mem
title: Handle the undefined from WeakRef.deref
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [WeakRef, deref, collection]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [WeakRef]
related: [typescript-mem-weak-cache, typescript-type-no-non-null-assertion]
sources:
  - title: MDN - WeakRef
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef
---
> Treat `deref()` as returning `T | undefined`; the target can be collected at any time.

## Why

A WeakRef does not keep its target alive, so `deref` returns `undefined` once the target has been reclaimed. Asserting the result away reintroduces the use-after-collection the reference exists to avoid.

## Bad

```typescript
export function current(ref: WeakRef<object>): object {
  return ref.deref() as object;
}
```

## Good

```typescript
export function current(ref: WeakRef<object>): object | undefined {
  return ref.deref();
}
```

## See Also

- [typescript-mem-weak-cache](mem-weak-cache.md) - collections that express the same weak ownership
- [typescript-type-no-non-null-assertion](type-no-non-null-assertion.md) - the assertion habit this rule avoids
