---
id: typescript-ffi-napi-status
lang: typescript
prefix: ffi
title: Check the status of every Node-API call
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Node-API, napi_status, addon]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-ffi-wasm-trap, typescript-err-boundary-parse]
sources:
  - title: Node.js - Node-API (napi_status)
    url: https://nodejs.org/api/n-api.html
---
> Branch on the returned `napi_status` before using a Node-API result.

## Why

Node-API functions report failure through a `napi_status` return value rather than by throwing, so a call whose status is not `napi_ok` leaves its out-parameter unwritten. Checking the status keeps the failure inside the addon instead of passing garbage to JavaScript.

## Bad

```typescript
declare function napiGetValue(handle: unknown): { status: number; value: number };

export function value(handle: unknown): number {
  return napiGetValue(handle).value;
}
```

## Good

```typescript
declare function napiGetValue(handle: unknown): { status: number; value: number };

export function value(handle: unknown): number {
  const result = napiGetValue(handle);
  if (result.status !== 0) {
    throw new Error(`napi call failed with status ${result.status}`);
  }
  return result.value;
}
```

## See Also

- [typescript-ffi-wasm-trap](ffi-wasm-trap.md) - the WASM counterpart, where failures throw
- [typescript-err-boundary-parse](err-boundary-parse.md) - failing where the bad value enters
