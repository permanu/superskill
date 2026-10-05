---
id: typescript-mem-typed-array-view
lang: typescript
prefix: mem
title: Window buffers with subarray, not slice
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [subarray, slice, ArrayBuffer]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [subarray]
related: [typescript-perf-typed-arrays, typescript-ffi-wasm-memory-bounds]
sources:
  - title: MDN - TypedArray.prototype.subarray
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/subarray
---
> Create a view over the same buffer with `subarray` instead of copying bytes with `slice`.

## Why

`slice` allocates and copies the selected bytes, which doubles memory for a temporary window; `subarray` returns a new typed array over the same `ArrayBuffer` store, so the data is shared rather than duplicated.

## Bad

```typescript
export function firstHalf(data: Uint8Array): Uint8Array {
  return data.slice(0, data.length / 2);
}
```

## Good

```typescript
export function firstHalf(data: Uint8Array): Uint8Array {
  return data.subarray(0, data.length / 2);
}
```

## See Also

- [typescript-perf-typed-arrays](perf-typed-arrays.md) - choosing typed arrays for bulk numeric data
- [typescript-ffi-wasm-memory-bounds](ffi-wasm-memory-bounds.md) - the buffer a view shares
