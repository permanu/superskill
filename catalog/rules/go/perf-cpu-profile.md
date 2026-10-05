---
id: go-perf-cpu-profile
lang: go
prefix: perf
title: Capture a CPU profile before changing a hot path
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pprof, CPU profile, profiling, hotspot]
  files: ["**/*.go"]
  symbols: [pprof.StartCPUProfile, pprof.StopCPUProfile]
related: [go-perf-trace-task, go-obs-pprof-explicit]
sources:
  - title: Package runtime/pprof - StartCPUProfile
    url: https://pkg.go.dev/runtime/pprof
  - title: Diagnostics - Profiling
    url: https://go.dev/doc/diagnostics
---
> Start and stop a CPU profile around the workload so the fix targets the real hotspot.

## Why

The diagnostics guide defines the CPU profile as showing where a program spends its time while consuming CPU, which is the only reliable input for optimization decisions. StartCPUProfile streams the profile to a writer and StopCPUProfile flushes it, so a command can collect a profile of its own run. Guessing at hot paths wastes effort on code the profiler would never have listed.

## Bad

```go
func serve() error {
    return http.ListenAndServe(":8080", mux())
}

func mux() http.Handler { return http.NewServeMux() }
```

## Good

```go
func serve() error {
    f, err := os.Create("cpu.pprof")
    if err != nil {
        return err
    }
    defer f.Close()
    if err := pprof.StartCPUProfile(f); err != nil {
        return err
    }
    defer pprof.StopCPUProfile()
    return http.ListenAndServe(":8080", mux())
}

func mux() http.Handler { return http.NewServeMux() }
```

## See Also

- [go-perf-trace-task](perf-trace-task.md) - tracing latency the CPU profile cannot show
- [go-obs-pprof-explicit](obs-pprof-explicit.md) - collecting profiles from a running server
