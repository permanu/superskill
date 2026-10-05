---
id: typescript-ffi-wasm-memory-bounds
lang: typescript
prefix: ffi
title: Check offsets against the WASM memory length
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [WebAssembly, memory, bounds]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-ffi-wasm-buffer-grow, typescript-ffi-wasm-trap]
sources:
  - title: MDN - WebAssembly.Memory
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Memory
  - title: MDN - WebAssembly.Memory.prototype.buffer
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Memory/buffer
---
> Validate an offset against `memory.buffer.byteLength` before creating a view or reading a word.

## Why

WASM memory is a byte buffer that only changes through explicit `grow` calls, so an offset outside it produces out-of-bounds reads at the JavaScript edge. Checking the byte range turns a silent wrong value into a failure at the call site.

## Bad

```typescript
export function readWord(memory: WebAssembly.Memory, offset: number): number {
  return new Int32Array(memory.buffer)[offset];
}
```

## Good

```typescript
export function readWord(memory: WebAssembly.Memory, offset: number): number {
  if (offset < 0 || offset * 4 + 4 > memory.buffer.byteLength) {
    throw new Error("offset out of bounds");
  }
  return new Int32Array(memory.buffer)[offset];
}
```

## See Also

- [typescript-ffi-wasm-buffer-grow](ffi-wasm-buffer-grow.md) - the buffer change that invalidates a checked offset
- [typescript-ffi-wasm-trap](ffi-wasm-trap.md) - reporting the failures that do cross the boundary
