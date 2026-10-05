---
id: typescript-api-this-return-type
lang: typescript
prefix: api
title: Return this from chainable methods so subclasses keep their type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fluent, chaining, this type, builder]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [this]
related: [typescript-api-parameter-properties, typescript-api-options-object]
sources:
  - title: TypeScript Handbook - Classes (this types)
    url: https://www.typescriptlang.org/docs/handbook/2/classes.html
---
> Return `this` from chainable methods so subclasses keep their own type.

## Why

A method that returns the base class name erases the subclass as soon as the chain continues, so subclass-only methods disappear from the fluent chain. The `this` type is polymorphic: it refers to the instance type that actually called the method.

## Bad

```typescript
export class QueryBuilder {
  private readonly parts: string[] = [];

  where(clause: string): QueryBuilder {
    this.parts.push(clause);
    return this;
  }
}
```

## Good

```typescript
export class QueryBuilder {
  private readonly parts: string[] = [];

  where(clause: string): this {
    this.parts.push(clause);
    return this;
  }
}
```

## See Also

- [typescript-api-parameter-properties](api-parameter-properties.md) - the constructor side of class API design
- [typescript-api-options-object](api-options-object.md) - configuring the builder's callers
