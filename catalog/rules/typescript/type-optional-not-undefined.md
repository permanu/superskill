---
id: typescript-type-optional-not-undefined
lang: typescript
prefix: type
title: Omit optional properties instead of assigning undefined to them
severity: should
enforce: both
tool: "tsc:exactOptionalPropertyTypes"
baseline: latest
status: verified
triggers:
  keywords: [optional, undefined, exactOptionalPropertyTypes, absence]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [undefined]
related: [typescript-type-no-non-null-assertion, typescript-type-discriminated-union-state]
sources:
  - title: TSConfig Reference - exactOptionalPropertyTypes
    url: https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html
  - title: TypeScript Handbook - Object Types (optional properties)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> Represent an absent optional property by omitting it, not by assigning `undefined` to it.

## Why

`obj.prop = undefined` and `obj` without `prop` behave differently for `in`, `Object.keys`, and serializers, yet a plain optional property accepts both. Enabling exact optional property types and omitting the key keeps absence distinguishable from a present value.

## Bad

```typescript
interface Settings {
  theme?: "light" | "dark";
}

function build(): Settings {
  return { theme: undefined };
}
```

## Good

```typescript
interface Settings {
  theme?: "light" | "dark";
}

function build(): Settings {
  return {};
}
```

## See Also

- [typescript-type-no-non-null-assertion](type-no-non-null-assertion.md) - reading absence back without an assertion
- [typescript-type-discriminated-union-state](type-discriminated-union-state.md) - when absence needs a named state instead of an optional field
