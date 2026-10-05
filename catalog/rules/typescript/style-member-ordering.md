---
id: typescript-style-member-ordering
lang: typescript
prefix: style
title: Order class members fields first, then constructor, then methods
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/member-ordering"
baseline: latest
status: verified
triggers:
  keywords: [member order, class layout, fields first]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [class]
related: [typescript-api-parameter-properties]
sources:
  - title: typescript-eslint - member-ordering
    url: https://typescript-eslint.io/rules/member-ordering/
---
> Declare fields before the constructor and methods after it so a class reads as data, setup, then behavior.

## Why

A fixed member order lets a reader find a field or method by position instead of scanning the whole class. Fields first also groups everything the constructor initializes next to the code that does the initializing.

## Bad

```typescript
export class Session {
  read(): string {
    return this.token;
  }

  private token = "value";
}
```

## Good

```typescript
export class Session {
  private token = "value";

  read(): string {
    return this.token;
  }
}
```

## See Also

- [typescript-api-parameter-properties](api-parameter-properties.md) - constructors that assign what the fields declare
