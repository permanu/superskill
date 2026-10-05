---
id: typescript-ffi-wasm-instantiate-error
lang: typescript
prefix: ffi
title: Report which phase of WASM loading failed
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [WebAssembly, instantiate, loading]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-ffi-wasm-imports-object, typescript-ffi-wasm-trap]
sources:
  - title: MDN - WebAssembly.instantiate
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/instantiate
---
> Wrap `WebAssembly.instantiate` so a compile or link failure carries the load phase with it.

## Why

The rejection type already distinguishes the phases — `CompileError` for bytes that do not compile, `LinkError` for imports that do not match — but the raw text does not say which step of loading failed in the caller's terms. Branching on the type turns the rejection into a message that names the phase.

## Bad

```typescript
export function load(bytes: Uint8Array): Promise<unknown> {
  return WebAssembly.instantiate(bytes);
}
```

## Good

```typescript
export async function load(bytes: Uint8Array): Promise<unknown> {
  try {
    return await WebAssembly.instantiate(bytes);
  } catch (error) {
    if (error instanceof WebAssembly.CompileError) {
      throw new Error("failed to compile module bytes", { cause: error });
    }
    if (error instanceof WebAssembly.LinkError) {
      throw new Error("failed to link module imports", { cause: error });
    }
    throw error;
  }
}
```

## See Also

- [typescript-ffi-wasm-imports-object](ffi-wasm-imports-object.md) - the link failure this message covers
- [typescript-ffi-wasm-trap](ffi-wasm-trap.md) - the failures that happen after loading succeeds
