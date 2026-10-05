---
id: go-test-parallel-subtests
lang: go
prefix: test
title: Mark independent subtests with t.Parallel to run them concurrently
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [t.Parallel, subtests, parallelism, speed]
  files: ["**/*_test.go"]
  symbols: [testing.T.Parallel]
related: [go-test-table-driven, go-test-setenv, go-test-subtest-names]
sources:
  - title: Using Subtests and Sub-benchmarks
    url: https://go.dev/blog/subtests
  - title: Package testing - T.Parallel
    url: https://pkg.go.dev/testing
---
> Call t.Parallel inside subtests that share no mutable state.

## Why

Sequential subtests spend most of their time waiting on I/O, and the subtest machinery already tracks completion so the parent waits for every parallel case. The subtests article shows the pattern and notes the parent test does not return until the parallel group finishes, which also gives a natural place to tear down shared resources. Independent cases only need one line to overlap.

## Bad

```go
func TestEndpoints(t *testing.T) {
    for _, ep := range []string{"/a", "/b"} {
        if err := probe(ep); err != nil {
            t.Errorf("probe(%s): %v", ep, err)
        }
    }
}

func probe(endpoint string) error { return nil }
```

## Good

```go
func TestEndpoints(t *testing.T) {
    for _, ep := range []string{"/a", "/b"} {
        t.Run(ep, func(t *testing.T) {
            t.Parallel()
            if err := probe(ep); err != nil {
                t.Errorf("probe(%s): %v", ep, err)
            }
        })
    }
}

func probe(endpoint string) error { return nil }
```

## See Also

- [go-test-table-driven](test-table-driven.md) - the table the parallel cases iterate over
- [go-test-setenv](test-setenv.md) - process-global state that forbids parallelism
- [go-test-subtest-names](test-subtest-names.md) - naming each parallel case
