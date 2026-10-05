---
id: typescript-api-parameter-properties
lang: typescript
prefix: api
title: Declare injected dependencies as parameter properties
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constructor, parameter property, injection, readonly]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [readonly]
related: [typescript-api-readonly-fields, typescript-api-options-object]
sources:
  - title: Google TypeScript Style Guide (parameter properties)
    url: https://google.github.io/styleguide/tsguide.html
  - title: TypeScript Handbook - Classes (parameter properties)
    url: https://www.typescriptlang.org/docs/handbook/2/classes.html
---
> Declare injected dependencies as parameter properties instead of assigning them in the constructor.

## Why

A field declaration plus a constructor assignment repeats the same name three times, and the pair drifts when the modifier changes in only one place. The parameter property declares visibility, immutability, and the member in a single position the compiler checks.

## Bad

```typescript
export interface Repository {
  find(id: string): string;
}

export class UserService {
  private readonly repository: Repository;

  constructor(repository: Repository) {
    this.repository = repository;
  }
}
```

## Good

```typescript
export interface Repository {
  find(id: string): string;
}

export class UserService {
  constructor(private readonly repository: Repository) {}
}
```

## See Also

- [typescript-api-readonly-fields](api-readonly-fields.md) - the immutability half of the declaration
- [typescript-api-options-object](api-options-object.md) - grouping constructor options
