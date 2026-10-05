---
id: typescript-api-options-object
lang: typescript
prefix: api
title: Take related options as one typed object
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [options, parameters, positional, defaults]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Partial]
related: [typescript-api-explicit-return-types, typescript-api-parameter-properties]
sources:
  - title: Google TypeScript Style Guide (parameter initializers and destructuring)
    url: https://google.github.io/styleguide/tsguide.html
  - title: TypeScript Handbook - Object Types (optional properties)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> Take related options as one typed object instead of a growing positional parameter list.

## Why

Positional booleans and counts are unreadable at the call site and every new option appends another parameter that existing callers must pass. A destructured options object names each choice, lets callers supply only what they change, and keeps the call sites stable when the set grows.

## Bad

```typescript
export function createServer(port: number, tls: boolean, retries: number): void {
  console.log(port, tls, retries);
}
```

## Good

```typescript
interface ServerOptions {
  port: number;
  tls?: boolean;
  retries?: number;
}

export function createServer({ port, tls = false, retries = 3 }: ServerOptions): void {
  console.log(port, tls, retries);
}
```

## See Also

- [typescript-api-explicit-return-types](api-explicit-return-types.md) - the other half of a deliberate signature
- [typescript-api-parameter-properties](api-parameter-properties.md) - carrying options into a class
