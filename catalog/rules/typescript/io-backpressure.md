---
id: typescript-io-backpressure
lang: typescript
prefix: io
title: Respect writable stream backpressure
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [backpressure, drain, writable]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-io-stream-chunks, typescript-io-pipeline]
sources:
  - title: Node.js - Backpressuring in Streams
    url: https://nodejs.org/en/learn/modules/backpressuring-in-streams
---
> Await the writer's drain when a write returns false so buffered data does not outrun the consumer.

## Why

A `write` call that returns `false` means the internal buffer is full; ignoring it keeps pushing data and grows memory without bound. Awaiting `drain` pauses the producer until the consumer catches up.

## Bad

```typescript
declare function openWriter(): { write(chunk: string): boolean };

export function send(chunks: string[]): void {
  const writer = openWriter();
  for (const chunk of chunks) {
    writer.write(chunk);
  }
}
```

## Good

```typescript
declare function openWriter(): { write(chunk: string): boolean; drain(): Promise<void> };

export async function send(chunks: string[]): Promise<void> {
  const writer = openWriter();
  for (const chunk of chunks) {
    if (!writer.write(chunk)) {
      await writer.drain();
    }
  }
}
```

## See Also

- [typescript-io-stream-chunks](io-stream-chunks.md) - reading the other end of the pipe in chunks
- [typescript-io-pipeline](io-pipeline.md) - connecting streams that manage backpressure themselves
