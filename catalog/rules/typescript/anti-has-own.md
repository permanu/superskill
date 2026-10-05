---
id: typescript-anti-has-own
lang: typescript
prefix: anti
title: Check own properties with Object.hasOwn
severity: should
enforce: tool
tool: "eslint:no-prototype-builtins"
baseline: latest
status: verified
triggers:
  keywords: [hasOwnProperty, Object.hasOwn, own property]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Object.hasOwn]
related: [typescript-anti-for-in-array, typescript-sec-no-merge-untrusted]
sources:
  - title: ESLint - no-prototype-builtins
    url: https://eslint.org/docs/latest/rules/no-prototype-builtins/
  - title: MDN - Object.hasOwn
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn
---
> Test property existence with `Object.hasOwn` instead of calling `hasOwnProperty` on the value.

## Why

`value.hasOwnProperty` is looked up on the object itself, so a record with a `hasOwnProperty` key, or one created with a null prototype, breaks the call. `Object.hasOwn` is a static check that cannot be shadowed by the data being checked.

## Bad

```typescript
export function hasKey(record: Record<string, number>, key: string): boolean {
  return record.hasOwnProperty(key);
}
```

## Good

```typescript
export function hasKey(record: Record<string, number>, key: string): boolean {
  return Object.hasOwn(record, key);
}
```

## See Also

- [typescript-anti-for-in-array](anti-for-in-array.md) - enumerating keys without touching the prototype chain
- [typescript-sec-no-merge-untrusted](sec-no-merge-untrusted.md) - building objects from known keys instead of merged input
