---
id: typescript-perf-batch-dom-io
lang: typescript
prefix: perf
title: Read layout values before writing styles, never interleaved
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [layout, reflow, offsetWidth, thrashing]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [offsetWidth]
related: [typescript-perf-raf-batch, typescript-perf-measure-first]
sources:
  - title: web.dev - Avoid large, complex layouts and layout thrashing
    url: https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing
---
> Read layout values once, then write styles; interleaving forces a synchronous layout per iteration.

## Why

After a style write, the browser must recalculate layout before it can answer a layout read such as `offsetWidth`, so a read-write loop pays for layout on every iteration instead of once per frame. Reading first and writing afterwards lets the browser reuse the previous frame's layout values.

## Bad

```typescript
function resizeParagraphs(paragraphs: HTMLElement[], box: HTMLElement): void {
  for (const paragraph of paragraphs) {
    paragraph.style.width = `${box.offsetWidth}px`;
  }
}
```

## Good

```typescript
function resizeParagraphs(paragraphs: HTMLElement[], box: HTMLElement): void {
  const width = box.offsetWidth;
  for (const paragraph of paragraphs) {
    paragraph.style.width = `${width}px`;
  }
}
```

## See Also

- [typescript-perf-raf-batch](perf-raf-batch.md) - scheduling the writes in the next frame
- [typescript-perf-measure-first](perf-measure-first.md) - measuring layout cost in the browser profiler
