---
id: typescript-ui-scoped-query
lang: typescript
prefix: ui
title: Scope DOM queries to the component root
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [querySelector, component scope, DOM]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-ui-dataset, typescript-ui-document-fragment]
sources:
  - title: MDN - Document.querySelector
    url: https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector
---
> Query from the component's root element instead of the whole document.

## Why

A document-wide query returns the first match anywhere in the page, so one component's update can reach another component's markup. Scoping the query to the root keeps the search inside the subtree the code owns.

## Bad

```typescript
export function disable(): void {
  const button = document.querySelector("button");
  button?.setAttribute("disabled", "true");
}
```

## Good

```typescript
export function update(root: HTMLElement): void {
  const button = root.querySelector("button");
  button?.setAttribute("disabled", "true");
}
```

## See Also

- [typescript-ui-dataset](ui-dataset.md) - reading data from the scoped element
- [typescript-ui-document-fragment](ui-document-fragment.md) - inserting nodes into the same subtree
