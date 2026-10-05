---
id: go-perf-trace-task
lang: go
prefix: perf
title: Annotate requests with trace.NewTask to see their latency
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [runtime/trace, NewTask, latency, execution tracer]
  files: ["**/*.go"]
  symbols: [trace.NewTask, trace.Task.End]
related: [go-perf-cpu-profile, go-obs-pprof-labels]
sources:
  - title: Package runtime/trace - NewTask
    url: https://pkg.go.dev/runtime/trace
  - title: Diagnostics - Tracing
    url: https://go.dev/doc/diagnostics
---
> Wrap each logical operation in a trace task so the tracer reports its latency.

## Why

The runtime/trace documentation says the trace tool measures task latency as the time between task creation and End, and provides latency distributions per task type. The diagnostics guide positions tracing as the way to see how much latency each component contributes, including across goroutines that share the task context. CPU profiles answer where time is spent, not where a request waited.

## Bad

```go
func handle(ctx context.Context) {
    doWork(ctx)
}

func doWork(context.Context) {}
```

## Good

```go
func handle(ctx context.Context) {
    ctx, task := trace.NewTask(ctx, "handle")
    defer task.End()
    doWork(ctx)
}

func doWork(context.Context) {}
```

## See Also

- [go-perf-cpu-profile](perf-cpu-profile.md) - the complementary CPU view
- [go-obs-pprof-labels](obs-pprof-labels.md) - attribution for profiles instead of traces
