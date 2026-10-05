---
id: typescript-api-readonly-fields
lang: typescript
prefix: api
title: Mark a field readonly when only the constructor assigns it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [readonly, field, immutability, class]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [readonly]
related: [typescript-api-parameter-properties, typescript-api-readonly-returns]
sources:
  - title: TypeScript Handbook - Classes (readonly)
    url: https://www.typescriptlang.org/docs/handbook/2/classes.html
  - title: TypeScript Handbook - Object Types (readonly properties)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> Mark a field `readonly` when only the constructor assigns it.

## Why

Without `readonly`, every method in the class is allowed to reassign the field, so readers cannot tell which writes are intended and the compiler cannot flag an accidental one. The modifier states the invariant once and enforces it on every write outside the constructor.

## Bad

```typescript
export class Config {
  port: number;

  constructor(port: number) {
    this.port = port;
  }
}
```

## Good

```typescript
export class Config {
  readonly port: number;

  constructor(port: number) {
    this.port = port;
  }
}
```

## See Also

- [typescript-api-parameter-properties](api-parameter-properties.md) - declaring the readonly field as a constructor parameter
- [typescript-api-readonly-returns](api-readonly-returns.md) - the same contract for returned collections
