---
id: typescript-perf-raf-batch
lang: typescript
prefix: perf
title: Schedule visual updates with requestAnimationFrame
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [requestAnimationFrame, render, frame, repaint]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [requestAnimationFrame]
related: [typescript-perf-batch-dom-io, typescript-async-microtask-defer]
sources:
  - title: MDN - requestAnimationFrame()
    url: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
---
> Schedule visual updates with `requestAnimationFrame` so they run once per frame before the next repaint.

## Why

`requestAnimationFrame` asks the browser to call the callback before the next repaint, and calls are paused in background tabs to save work. A timer fires on its own schedule, so it can run updates no frame will display or run several updates between two paints.

## Bad

```typescript
declare function render(value: number): void;

function update(value: number): void {
  setTimeout(() => {
    render(value);
  }, 0);
}
```

## Good

```typescript
declare function render(value: number): void;

function update(value: number): void {
  requestAnimationFrame(() => {
    render(value);
  });
}
```

## See Also

- [typescript-perf-batch-dom-io](perf-batch-dom-io.md) - ordering the reads and writes inside the frame
- [typescript-async-microtask-defer](async-microtask-defer.md) - the microtask queue for non-visual deferral
