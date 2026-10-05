---
id: go-test-failure-message
lang: go
prefix: test
title: Fail with the function, the input, the got value, and the want value
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [test failure, error message, got want, debugging]
  files: ["**/*_test.go"]
  symbols: [testing.T.Errorf]
related: [go-test-table-driven, go-test-keep-going, go-test-subtest-names]
sources:
  - title: Go Wiki - Go Test Comments
    url: https://go.dev/wiki/TestComments
  - title: Go Code Review Comments - Useful Test Failures
    url: https://go.dev/wiki/CodeReviewComments
---
> Name the function and input, then print the actual value before the expected one.

## Why

The person reading a failure did not write the test and has only the log line to work from. The test comments ask messages to identify the function and the input, and the review guide asks for the got value, the want value, and the inputs in a fixed order. "parse failed" costs a debugging session; "Parse("42") = 3; want 42" identifies the bug immediately.

## Bad

```go
func TestParse(t *testing.T) {
    got := Parse("42")
    if got != 42 {
        t.Error("parse failed")
    }
}

func Parse(s string) int { return len(s) }
```

## Good

```go
func TestParse(t *testing.T) {
    got := Parse("42")
    if got != 42 {
        t.Errorf("Parse(%q) = %d; want %d", "42", got, 42)
    }
}

func Parse(s string) int { return len(s) }
```

## See Also

- [go-test-table-driven](test-table-driven.md) - sharing one good message across cases
- [go-test-keep-going](test-keep-going.md) - reporting every failure in one run
- [go-test-subtest-names](test-subtest-names.md) - moving context into the subtest name
