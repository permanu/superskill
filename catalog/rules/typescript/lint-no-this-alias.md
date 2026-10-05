---
id: typescript-lint-no-this-alias
lang: typescript
prefix: lint
title: Use arrow functions instead of aliasing this
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/no-this-alias"
baseline: latest
status: verified
triggers:
  keywords: [this alias, self, arrow function]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [this]
related: [typescript-api-this-return-type]
sources:
  - title: typescript-eslint - no-this-alias
    url: https://typescript-eslint.io/rules/no-this-alias/
---
> Capture the enclosing receiver with an arrow function instead of assigning `this` to a variable.

## Why

Arrow functions already keep the enclosing `this`, so an alias adds a second name for the same object and obscures which receiver the callback means. Using the arrow directly makes the binding a language rule rather than a convention.

## Bad

```typescript
export class Counter {
  count = 0;

  start(): void {
    const self = this;
    setTimeout(() => {
      self.count += 1;
    }, 0);
  }
}
```

## Good

```typescript
export class Counter {
  count = 0;

  start(): void {
    setTimeout(() => {
      this.count += 1;
    }, 0);
  }
}
```

## See Also

- [typescript-api-this-return-type](api-this-return-type.md) - the other use of this, returned for chaining
