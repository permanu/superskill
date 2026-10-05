---
id: typescript-conc-shared-buffer-isolation
lang: typescript
prefix: conc
title: Check cross-origin isolation before SharedArrayBuffer
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [SharedArrayBuffer, cross-origin isolation, fallback]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [SharedArrayBuffer]
related: [typescript-conc-shared-memory-atomics]
sources:
  - title: MDN - SharedArrayBuffer
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
---
> Gate `SharedArrayBuffer` creation on `crossOriginIsolated` so shared memory is only used where the browser allows it.

## Why

Browsers expose `SharedArrayBuffer` only in a secure, cross-origin-isolated context, and constructing it anywhere else throws. Checking `crossOriginIsolated` first turns an exception into a branch that can pick a fallback.

## Bad

```typescript
export function makeBuffer(): SharedArrayBuffer {
  return new SharedArrayBuffer(16);
}
```

## Good

```typescript
export function makeBuffer(): SharedArrayBuffer | undefined {
  if (!crossOriginIsolated) {
    return undefined;
  }
  return new SharedArrayBuffer(16);
}
```

## See Also

- [typescript-conc-shared-memory-atomics](conc-shared-memory-atomics.md) - coordinating the memory once it exists
