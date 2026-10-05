---
id: typescript-ffi-wasm-trap
lang: typescript
prefix: ffi
title: Treat a WASM trap as a failure at the call site
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [WebAssembly, RuntimeError, trap]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-ffi-wasm-memory-bounds, typescript-err-wrap-with-cause]
sources:
  - title: MDN - WebAssembly.RuntimeError
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/RuntimeError
---
> Wrap exported WASM calls so a trap is reported with the operation that failed.

## Why

WebAssembly specifies a trap as a thrown `RuntimeError`, which crosses the JavaScript boundary like any exception. Wrapping the call adds the operation to the message and keeps the original error as the cause, so the failure is diagnosable at the edge.

## Bad

```typescript
declare function callExported(): number;

export function run(): number {
  return callExported();
}
```

## Good

```typescript
declare function callExported(): number;

export function run(): number {
  try {
    return callExported();
  } catch (error) {
    throw new Error("wasm call failed", { cause: error });
  }
}
```

## See Also

- [typescript-ffi-wasm-memory-bounds](ffi-wasm-memory-bounds.md) - the bounds mistake that produces traps
- [typescript-err-wrap-with-cause](err-wrap-with-cause.md) - preserving the original error while adding context
