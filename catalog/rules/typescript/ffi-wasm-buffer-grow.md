---
id: typescript-ffi-wasm-buffer-grow
lang: typescript
prefix: ffi
title: Re-read the WASM buffer after growing memory
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [WebAssembly, grow, detached buffer]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-ffi-wasm-memory-bounds]
sources:
  - title: MDN - WebAssembly.Memory.prototype.grow
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Memory/grow
---
> Create typed-array views after the last `grow`; growing detaches every reference to the old buffer.

## Why

Every call to `grow` detaches the old `ArrayBuffer`, even `grow(0)`, so a view created earlier points at a buffer whose length is zero. Reading the `buffer` property after the grow yields an `ArrayBuffer` with the correct length.

## Bad

```typescript
export function grow(memory: WebAssembly.Memory, delta: number): number {
  const view = new Int32Array(memory.buffer);
  memory.grow(delta);
  return view[0];
}
```

## Good

```typescript
export function grow(memory: WebAssembly.Memory, delta: number): number {
  memory.grow(delta);
  return new Int32Array(memory.buffer)[0];
}
```

## See Also

- [typescript-ffi-wasm-memory-bounds](ffi-wasm-memory-bounds.md) - validating the offset the new view reads
