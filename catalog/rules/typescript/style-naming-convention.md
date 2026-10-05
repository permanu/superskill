---
id: typescript-style-naming-convention
lang: typescript
prefix: style
title: Name values in camelCase and types in PascalCase
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/naming-convention"
baseline: latest
status: verified
triggers:
  keywords: [camelCase, PascalCase, naming]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [const]
related: [typescript-style-const-default]
sources:
  - title: typescript-eslint - naming-convention
    url: https://typescript-eslint.io/rules/naming-convention/
  - title: Google TypeScript Style Guide
    url: https://google.github.io/styleguide/tsguide.html
---
> Name variables and functions in camelCase, types in PascalCase, and module constants in CONSTANT_CASE.

## Why

A single casing convention lets a reader tell a type from a value from a constant at the call site without opening the declaration. Mixed styles force a lookup to answer a question the name should already answer.

## Bad

```typescript
export function Get_User_Name(): string {
  const UserName = "value";
  return UserName;
}
```

## Good

```typescript
export function getUserName(): string {
  const userName = "value";
  return userName;
}
```

## See Also

- [typescript-style-const-default](style-const-default.md) - the declaration forms these names appear in
