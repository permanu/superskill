---
id: typescript-ffi-wasm-imports-object
lang: typescript
prefix: ffi
title: Provide every declared import when instantiating
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [WebAssembly, imports, LinkError]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-ffi-wasm-instantiate-error, typescript-ffi-wasm-trap]
sources:
  - title: MDN - WebAssembly.instantiate
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/instantiate
---
> Pass an import object that covers the module's declared imports, or instantiation fails with LinkError.

## Why

A compiled module declares its imports, and the loader requires one matching property for each; an import object with the module namespace but not the function throws a `WebAssembly.LinkError` before any code runs. Building the object from the declared imports makes the dependency list explicit.

## Bad

```typescript
export function load(bytes: Uint8Array): Promise<unknown> {
  return WebAssembly.instantiate(bytes, { env: {} });
}
```

## Good

```typescript
export function load(bytes: Uint8Array): Promise<unknown> {
  return WebAssembly.instantiate(bytes, {
    env: { log: (value: number): void => console.log(value) },
  });
}
```

## See Also

- [typescript-ffi-wasm-instantiate-error](ffi-wasm-instantiate-error.md) - reporting the LinkError with its phase
- [typescript-ffi-wasm-trap](ffi-wasm-trap.md) - what the imported functions must handle at runtime
