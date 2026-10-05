---
id: typescript-ui-dataset
lang: typescript
prefix: ui
title: Read data attributes through dataset
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dataset, data attributes, DOM]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [dataset]
related: [typescript-ui-scoped-query, typescript-style-dot-notation]
sources:
  - title: MDN - HTMLElement.dataset
    url: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
---
> Read `data-*` attributes through `element.dataset` instead of `getAttribute`.

## Why

`dataset` exposes an element's custom data attributes as camelCase properties, so the attribute name is written once in the code's own naming style. `getAttribute` takes an arbitrary string and returns `string | null` for any name, including ones that do not exist.

## Bad

```typescript
export function userId(element: HTMLElement): string {
  return element.getAttribute("data-user-id") ?? "";
}
```

## Good

```typescript
export function userId(element: HTMLElement): string {
  return element.dataset.userId ?? "";
}
```

## See Also

- [typescript-ui-scoped-query](ui-scoped-query.md) - reading the element the data lives on
- [typescript-style-dot-notation](style-dot-notation.md) - the same preference for known property names
