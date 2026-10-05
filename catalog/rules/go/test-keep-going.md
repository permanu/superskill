---
id: go-test-keep-going
lang: go
prefix: test
title: Prefer t.Error over t.Fatal so one run reports every failure
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [t.Error, t.Fatal, test failure, diagnostics]
  files: ["**/*_test.go"]
  symbols: [testing.T.Error, testing.T.Fatal]
related: [go-test-failure-message, go-test-no-fatal-in-goroutine]
sources:
  - title: Go Wiki - Go Test Comments
    url: https://go.dev/wiki/TestComments
  - title: Package testing - T.Error, T.Fatal
    url: https://pkg.go.dev/testing
---
> Keep the test running after a failed check; reserve Fatal for setup that blocks the rest.

## Why

A test that stops at the first failure makes the fixer play whac-a-mole, re-running to discover each next bug. The test comments ask tests to keep going and print all failed checks in a single run, preferring Error over Fatal for comparisons. Fatal is for setup failures without which the test cannot run at all; inside a subtest it ends just that case, which the same guide endorses.

## Bad

```go
func TestParse(t *testing.T) {
    if got := Parse("1"); got != 1 {
        t.Fatalf("Parse(1) = %d; want 1", got)
    }
    if got := Parse("22"); got != 22 {
        t.Fatalf("Parse(22) = %d; want 22", got)
    }
}

func Parse(s string) int { return len(s) }
```

## Good

```go
func TestParse(t *testing.T) {
    if got := Parse("1"); got != 1 {
        t.Errorf("Parse(1) = %d; want 1", got)
    }
    if got := Parse("22"); got != 22 {
        t.Errorf("Parse(22) = %d; want 22", got)
    }
}

func Parse(s string) int { return len(s) }
```

## See Also

- [go-test-failure-message](test-failure-message.md) - what each kept-going failure should say
- [go-test-no-fatal-in-goroutine](test-no-fatal-in-goroutine.md) - where Fatal stops working entirely
