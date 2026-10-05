---
id: go-conc-loopvar-no-copy
lang: go
prefix: conc
title: Do not copy loop variables that goroutines capture; per-iteration scoping is guaranteed
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [loop variable, closure, goroutine, capture]
  files: ["**/*.go"]
  symbols: [range, go]
related: [go-conc-goroutine-lifetime, go-conc-sync-function]
sources:
  - title: Fixing For Loops in Go 1.22
    url: https://go.dev/blog/loopvar-preview
  - title: Go Code Review Comments - Goroutine Lifetimes
    url: https://go.dev/wiki/CodeReviewComments
---
> Drop `x := x` copies: each loop iteration gets its own variable.

## Why

The language now scopes the iteration variable per iteration, which fixed the classic closure bug at its source: every goroutine started in a loop sees its own value. The `v := v` workaround predates that change and only adds noise, and the loop-closure checker no longer reports captures that are safe. Copies remain necessary only for modules that still opt into the old semantics.

## Bad

```go
func startAll(tasks []Task) {
    for _, task := range tasks {
        task := task
        go run(task)
    }
}

type Task struct{}

func run(Task) {}
```

## Good

```go
func startAll(tasks []Task) {
    for _, task := range tasks {
        go run(task)
    }
}

type Task struct{}

func run(Task) {}
```

## See Also

- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - the lifetime of the goroutines that capture the variable
- [go-conc-sync-function](conc-sync-function.md) - avoiding the goroutine altogether when possible
