---
id: typescript-const-static-readonly
lang: typescript
prefix: const
title: Mark class constants static readonly
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static, readonly, class constant]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [static, readonly]
related: [typescript-api-readonly-fields, typescript-const-object-freeze]
sources:
  - title: TypeScript Handbook - Classes (readonly)
    url: https://www.typescriptlang.org/docs/handbook/2/classes.html
---
> Prefix class-level constants with `static readonly` so no importer can reassign them.

## Why

A plain `static` field is writable by every importer, so a shared default can be changed process-wide by one assignment. `static readonly` makes that assignment a compile error while leaving the value readable.

## Bad

```typescript
export class Config {
  static retries = 3;
}

export function raise(): void {
  Config.retries = 5;
}
```

## Good

```typescript
export class Config {
  static readonly retries = 3;
}

export function retries(): number {
  return Config.retries;
}
```

## See Also

- [typescript-api-readonly-fields](api-readonly-fields.md) - the instance-field version of the same decision
- [typescript-const-object-freeze](const-object-freeze.md) - freezing a shared object value instead of a class member
