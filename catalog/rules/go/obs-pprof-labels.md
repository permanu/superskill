---
id: go-obs-pprof-labels
lang: go
prefix: obs
title: Attribute work to its owner with pprof.Do labels
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pprof, labels, attribution, profiles]
  files: ["**/*.go"]
  symbols: [pprof.Do, pprof.Labels]
related: [go-perf-trace-task, go-perf-cpu-profile]
sources:
  - title: Package runtime/pprof - Do
    url: https://pkg.go.dev/runtime/pprof
  - title: Go Release Notes - tracebacks and goroutine labels
    url: https://go.dev/doc/go1.27
---
> Label request-scoped work with pprof.Do so profiles show who owns a goroutine.

## Why

The runtime/pprof documentation says Do runs f with the given labels added and that goroutines spawned during f inherit the augmented label set, which lets the CPU and goroutine profiles separate work by job, tenant, or request. A profile without labels shows one flat hot stack even when different callers have different fixes. The runtime also prints labels in goroutine tracebacks, so a crash report carries the same attribution.

## Bad

```go
func worker(ctx context.Context, job string) {
    doWork(job)
}

func doWork(string) {}
```

## Good

```go
func worker(ctx context.Context, job string) {
    pprof.Do(ctx, pprof.Labels("job", job), func(ctx context.Context) {
        doWork(job)
    })
}

func doWork(string) {}
```

## See Also

- [go-perf-trace-task](perf-trace-task.md) - latency attribution in the execution tracer
- [go-perf-cpu-profile](perf-cpu-profile.md) - the profile these labels annotate
