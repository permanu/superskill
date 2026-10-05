---
id: typescript-ui-classlist
lang: typescript
prefix: ui
title: Toggle classes with classList
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [classList, className, DOM]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [classList]
related: [typescript-ui-dataset, typescript-ui-scoped-query]
sources:
  - title: MDN - Element.classList
    url: https://developer.mozilla.org/en-US/docs/Web/API/Element/classList
---
> Add and remove classes with `classList`, not by rewriting `className`.

## Why

String surgery appends duplicates, drops the separator when the element has no classes, and wipes classes the code did not know about. `classList` operates on the token list, so each operation is idempotent and leaves unrelated classes alone.

## Bad

```typescript
export function activate(element: HTMLElement): void {
  element.className = `${element.className} active`;
}
```

## Good

```typescript
export function activate(element: HTMLElement): void {
  element.classList.add("active");
}
```

## See Also

- [typescript-ui-dataset](ui-dataset.md) - the other token-list accessor on elements
- [typescript-ui-scoped-query](ui-scoped-query.md) - acting on the element you meant
