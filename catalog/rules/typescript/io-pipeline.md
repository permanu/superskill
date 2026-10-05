---
id: typescript-io-pipeline
lang: typescript
prefix: io
title: Connect streams with pipeline, not pipe
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pipeline, pipe, stream errors]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-io-backpressure, typescript-io-stream-chunks]
sources:
  - title: Node.js - Stream
    url: https://nodejs.org/api/stream.html
---
> Connect a stream chain with `pipeline` so errors propagate and the chain is cleaned up.

## Why

`pipe` forwards data but does not forward errors or close the destination when an earlier stream fails, so a broken chain leaks handles and leaves the caller waiting. `pipeline` propagates the first error, destroys the streams, and reports completion once.

## Bad

```typescript
declare function openInput(): { pipe(target: unknown): void };
declare function openOutput(): unknown;

export function copy(): void {
  openInput().pipe(openOutput());
}
```

## Good

```typescript
declare function pipeline(input: unknown, output: unknown): Promise<void>;
declare function openInput(): unknown;
declare function openOutput(): unknown;

export async function copy(): Promise<void> {
  await pipeline(openInput(), openOutput());
}
```

## See Also

- [typescript-io-backpressure](io-backpressure.md) - the buffer behavior pipeline manages for you
- [typescript-io-stream-chunks](io-stream-chunks.md) - consuming a stream that arrives as chunks
