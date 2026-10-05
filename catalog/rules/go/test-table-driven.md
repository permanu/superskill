---
id: go-test-table-driven
lang: go
prefix: test
title: Replace copy-pasted checks with a table of named cases
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [table-driven, subtests, test cases, refactor]
  files: ["**/*_test.go"]
  symbols: [testing.T]
related: [go-test-subtest-names, go-test-parallel-subtests, go-test-failure-message]
sources:
  - title: Go Wiki - TableDrivenTests
    url: https://go.dev/wiki/TableDrivenTests
  - title: Go Code Review Comments - Useful Test Failures
    url: https://go.dev/wiki/CodeReviewComments
---
> When the same check repeats with different inputs, store the cases in a table and run one loop.

## Why

Copy-pasted test bodies drift: one copy gets a new assertion and the others do not. The table-driven guide says that when you reach for copy and paste in a test, refactor into a table or a helper instead, because the check is written once and amortized over every case. Named cases also make the failing input obvious in the output.

## Bad

```go
func TestParse(t *testing.T) {
    if got := Parse("1"); got != 1 {
        t.Errorf("Parse(1) = %d; want 1", got)
    }
    if got := Parse("22"); got != 22 {
        t.Errorf("Parse(22) = %d; want 22", got)
    }
    if got := Parse(""); got != 0 {
        t.Errorf("Parse(empty) = %d; want 0", got)
    }
}

func Parse(s string) int { return len(s) }
```

## Good

```go
func TestParse(t *testing.T) {
    cases := []struct {
        name string
        in   string
        want int
    }{
        {"one digit", "1", 1},
        {"two digits", "22", 22},
        {"empty", "", 0},
    }
    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            if got := Parse(tc.in); got != tc.want {
                t.Errorf("Parse(%q) = %d; want %d", tc.in, got, tc.want)
            }
        })
    }
}

func Parse(s string) int { return len(s) }
```

## See Also

- [go-test-subtest-names](test-subtest-names.md) - naming the cases people will read in failures
- [go-test-parallel-subtests](test-parallel-subtests.md) - running the cases concurrently
- [go-test-failure-message](test-failure-message.md) - the message each case produces
