---
id: typescript-mem-object-url-revoke
lang: typescript
prefix: mem
title: Revoke object URLs when done
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [createObjectURL, revokeObjectURL, Blob]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-err-finally-cleanup, typescript-mem-finalization-fallback]
sources:
  - title: MDN - URL.revokeObjectURL
    url: https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static
---
> Call `URL.revokeObjectURL` once the consumer is finished with a created object URL.

## Why

`createObjectURL` pins the underlying Blob for as long as the URL exists, and the document outlives the preview. Revoking in `finally` releases the reference on every path, including failures.

## Bad

```typescript
export function preview(file: Blob): string {
  return URL.createObjectURL(file);
}
```

## Good

```typescript
export function withPreview(file: Blob, render: (url: string) => void): void {
  const url = URL.createObjectURL(file);
  try {
    render(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

## See Also

- [typescript-err-finally-cleanup](err-finally-cleanup.md) - releasing on every exit path
- [typescript-mem-finalization-fallback](mem-finalization-fallback.md) - why the release belongs on the normal path
