---
id: typescript-ui-form-narrow
lang: typescript
prefix: ui
title: Narrow form controls with instanceof
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [form controls, instanceof, DOM]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-ui-live-properties, typescript-pat-type-predicate]
sources:
  - title: MDN - HTMLFormElement.elements
    url: https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements
---
> Check a named form control with `instanceof` before reading its value.

## Why

`elements.namedItem` returns an `Element`, a `RadioNodeList`, or `null`, so a cast skips the check that the control is the input the code expects. `instanceof` narrows to the exact interface and fails loudly when the markup changed.

## Bad

```typescript
export function email(form: HTMLFormElement): string {
  const input = form.elements.namedItem("email") as HTMLInputElement;
  return input.value;
}
```

## Good

```typescript
export function email(form: HTMLFormElement): string {
  const input = form.elements.namedItem("email");
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("missing email input");
  }
  return input.value;
}
```

## See Also

- [typescript-ui-live-properties](ui-live-properties.md) - reading the control's live state
- [typescript-pat-type-predicate](pat-type-predicate.md) - guards that carry their narrowing to callers
