---
id: go-test-example-output
lang: go
prefix: test
title: Make examples runnable with an Output comment
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [example, Output comment, documentation, runnable]
  files: ["**/*_test.go"]
  symbols: [Example]
related: [go-api-doc-exported, go-test-benchmark-loop]
sources:
  - title: Testable Examples in Go
    url: https://go.dev/blog/examples
  - title: Package testing - Examples
    url: https://pkg.go.dev/testing
---
> Attach an Output comment to every example that can run.

## Why

The testing package executes example functions and compares stdout with the Output comment, so the documentation cannot drift from the API. The examples article calls this executable documentation and shows that an example without an Output comment is compiled but never run. The Output line turns a snippet that merely looks right into a test that fails when the behavior changes.

## Bad

```go
// Parse converts s to an integer.
//
// Example usage is left to the reader.
func Parse(s string) int { return len(s) }
```

## Good

```go
func ExampleParse() {
    fmt.Println(Parse("ab"))
    // Output: 2
}

func Parse(s string) int { return len(s) }
```

## See Also

- [go-api-doc-exported](api-doc-exported.md) - the doc comments examples attach to
- [go-test-benchmark-loop](test-benchmark-loop.md) - the other executable test form
