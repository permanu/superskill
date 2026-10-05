---
id: typescript-ui-live-properties
lang: typescript
prefix: ui
title: Read live state from element properties
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [checked, value, attributes]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-ui-form-narrow, typescript-ui-dataset]
sources:
  - title: MDN - HTMLInputElement.checked
    url: https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/checked
---
> Read `input.checked` and similar live properties instead of the markup attribute.

## Why

The attribute records the initial markup state while the property tracks the current state, so the two diverge as soon as the user interacts. Reading the property is reading what the control actually holds.

## Bad

```typescript
export function isChecked(box: HTMLInputElement): boolean {
  return box.hasAttribute("checked");
}
```

## Good

```typescript
export function isChecked(box: HTMLInputElement): boolean {
  return box.checked;
}
```

## See Also

- [typescript-ui-form-narrow](ui-form-narrow.md) - getting a typed control before reading it
- [typescript-ui-dataset](ui-dataset.md) - the attribute access that is correct for custom data
