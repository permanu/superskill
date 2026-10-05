---
id: typescript-conc-shared-memory-atomics
lang: typescript
prefix: conc
title: Update shared memory with Atomics
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Atomics, shared memory, race]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Atomics]
related: [typescript-conc-shared-buffer-isolation, typescript-conc-transfer-buffers]
sources:
  - title: MDN - Atomics
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics
---
> Use `Atomics` operations for counters and flags in shared memory; plain read-modify-write races.

## Why

Two workers that read, add, and write the same slot can interleave and lose one update, because each plain operation is not atomic. `Atomics.add` and the other `Atomics` methods perform the read-modify-write as one atomic operation, which is the supported way to coordinate shared memory.

## Bad

```typescript
export function increment(counts: Int32Array): void {
  counts[0] += 1;
}
```

## Good

```typescript
export function increment(counts: Int32Array): void {
  Atomics.add(counts, 0, 1);
}
```

## See Also

- [typescript-conc-shared-buffer-isolation](conc-shared-buffer-isolation.md) - when shared memory is available at all
- [typescript-conc-transfer-buffers](conc-transfer-buffers.md) - moving buffers between contexts
