---
id: typescript-io-stream-chunks
lang: typescript
prefix: io
title: Process large inputs as streams, not whole files
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stream, chunks, memory]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-io-backpressure, typescript-conc-yield-long-work]
sources:
  - title: Node.js - Reading files with Node.js
    url: https://nodejs.org/en/learn/manipulating-files/reading-files-with-nodejs
---
> Read large files and responses chunk by chunk instead of buffering the whole value in memory.

## Why

Reading an entire file holds the full contents in memory and delays all work until the last byte arrives; the streaming form hands each chunk over as it is read. The same iterator shape works for files, HTTP bodies, and sockets.

## Bad

```typescript
declare function readAll(path: string): Promise<string>;

export async function countBytes(path: string): Promise<number> {
  const content = await readAll(path);
  return content.length;
}
```

## Good

```typescript
declare function openChunks(path: string): AsyncIterable<string>;

export async function countBytes(path: string): Promise<number> {
  let total = 0;
  for await (const chunk of openChunks(path)) {
    total += chunk.length;
  }
  return total;
}
```

## See Also

- [typescript-io-backpressure](io-backpressure.md) - pausing the producer when the consumer is slow
- [typescript-conc-yield-long-work](conc-yield-long-work.md) - keeping the event loop responsive during bulk work
