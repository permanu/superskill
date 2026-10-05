---
id: typescript-ui-document-fragment
lang: typescript
prefix: ui
title: Insert many nodes with a document fragment
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [DocumentFragment, DOM insertion, batching]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-perf-batch-dom-io, typescript-ui-scoped-query]
sources:
  - title: MDN - Document.createDocumentFragment
    url: https://developer.mozilla.org/en-US/docs/Web/API/Document/createDocumentFragment
---
> Collect new nodes in a `DocumentFragment` and insert them in one operation.

## Why

Appending inside the loop touches the live tree once per node, and each touch can trigger layout work. A fragment holds the nodes off-document and inserts them together, so the tree changes once.

## Bad

```typescript
export function fill(list: HTMLElement, items: string[]): void {
  for (const item of items) {
    const node = document.createElement("li");
    node.textContent = item;
    list.append(node);
  }
}
```

## Good

```typescript
export function fill(list: HTMLElement, items: string[]): void {
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const node = document.createElement("li");
    node.textContent = item;
    fragment.append(node);
  }
  list.append(fragment);
}
```

## See Also

- [typescript-perf-batch-dom-io](perf-batch-dom-io.md) - batching the reads and writes around the insertion
- [typescript-ui-scoped-query](ui-scoped-query.md) - keeping the update inside the component's subtree
