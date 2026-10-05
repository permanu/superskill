---
id: typescript-proj-no-implicit-override
lang: typescript
prefix: proj
title: Mark overriding members with the override keyword
severity: should
enforce: tool
tool: "tsc:noImplicitOverride"
baseline: latest
status: verified
triggers:
  keywords: [override, inheritance, subclass]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [override]
related: [typescript-api-this-return-type]
sources:
  - title: TypeScript - noImplicitOverride
    url: https://www.typescriptlang.org/tsconfig/noImplicitOverride.html
---
> Write `override` on subclass members so a renamed base method becomes a compile error, not a silent new method.

## Why

Without the keyword, a member that no longer overrides anything is indistinguishable from a new one: a base-class rename quietly detaches the override. `override` makes the compiler check the base contract and fail when the two drift apart.

## Bad

```typescript
export class Base {
  load(): string {
    return "base";
  }
}

export class Child extends Base {
  load(): string {
    return "child";
  }
}
```

## Good

```typescript
export class Base {
  load(): string {
    return "base";
  }
}

export class Child extends Base {
  override load(): string {
    return "child";
  }
}
```

## See Also

- [typescript-api-this-return-type](api-this-return-type.md) - subclass behavior that also depends on the base-class contract
