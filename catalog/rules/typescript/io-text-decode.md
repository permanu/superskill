---
id: typescript-io-text-decode
lang: typescript
prefix: io
title: Decode bytes with an explicit text encoding
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [TextDecoder, encoding, bytes]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [TextDecoder]
related: [typescript-io-stream-chunks, typescript-data-unicode-normalize]
sources:
  - title: MDN - TextDecoder
    url: https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder
---
> Decode byte arrays with `TextDecoder` and the expected encoding instead of converting them with `String`.

## Why

`String(bytes)` and `bytes.toString()` join the byte numbers with commas, so the result is not text at all; decoding is the step that turns bytes into characters. `TextDecoder` also takes the encoding explicitly, so the same bytes are not interpreted differently across platforms.

## Bad

```typescript
declare function readBytes(path: string): Promise<Uint8Array>;

export async function text(path: string): Promise<string> {
  const bytes = await readBytes(path);
  return String(bytes);
}
```

## Good

```typescript
declare function readBytes(path: string): Promise<Uint8Array>;

export async function text(path: string): Promise<string> {
  const bytes = await readBytes(path);
  return new TextDecoder("utf-8").decode(bytes);
}
```

## See Also

- [typescript-io-stream-chunks](io-stream-chunks.md) - decoding as chunks arrive
- [typescript-data-unicode-normalize](data-unicode-normalize.md) - normalizing the decoded text before comparing it
