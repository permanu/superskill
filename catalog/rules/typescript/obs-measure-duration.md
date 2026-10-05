---
id: typescript-obs-measure-duration
lang: typescript
prefix: obs
title: Record operation durations with performance marks
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [performance.mark, measure, duration]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-perf-measure-first, typescript-obs-structured-log]
sources:
  - title: MDN - Performance.mark
    url: https://developer.mozilla.org/en-US/docs/Web/API/Performance/mark
---
> Mark the start and end of an operation and measure between them instead of logging raw timestamps.

## Why

Raw timestamps in two log lines have to be correlated and subtracted by hand, and clock changes distort the result. `mark` and `measure` record durations on the platform's monotonic timeline and expose them to tracing tools.

## Bad

```typescript
declare function doWork(): void;

export function handle(): void {
  console.log(`work start ${Date.now()}`);
  doWork();
  console.log(`work end ${Date.now()}`);
}
```

## Good

```typescript
declare function doWork(): void;

export function handle(): void {
  performance.mark("work-start");
  doWork();
  performance.mark("work-end");
  performance.measure("work", "work-start", "work-end");
}
```

## See Also

- [typescript-perf-measure-first](perf-measure-first.md) - measuring before deciding to optimize
- [typescript-obs-structured-log](obs-structured-log.md) - where the measured duration is reported
