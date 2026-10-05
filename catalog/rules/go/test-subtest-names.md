---
id: go-test-subtest-names
lang: go
prefix: test
title: Give every subtest a human-readable name, not an index
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [t.Run, subtest name, test output, table]
  files: ["**/*_test.go"]
  symbols: [testing.T.Run]
related: [go-test-table-driven, go-test-parallel-subtests, go-test-failure-message]
sources:
  - title: Go Wiki - Go Test Comments
    url: https://go.dev/wiki/TestComments
  - title: Using Subtests and Sub-benchmarks
    url: https://go.dev/blog/subtests
---
> Name subtests for the case they exercise so failures read as sentences.

## Why

The subtest name is the primary identifier in failure output and in `-run` filters; an index forces the reader to count table entries to find the failing case. The test comments ask for names that stay readable after the runner escapes spaces, and the subtests article shows the same table entry producing `TestTime/12:31_in_Europe/Zuri` in the log. Names also survive refactoring of the table order.

## Bad

```go
func TestParse(t *testing.T) {
    cases := []string{"1", "22", ""}
    for i, in := range cases {
        t.Run(strconv.Itoa(i), func(t *testing.T) {
            _ = Parse(in)
        })
    }
}

func Parse(s string) int { return len(s) }
```

## Good

```go
func TestParse(t *testing.T) {
    cases := map[string]string{
        "one digit":  "1",
        "two digits": "22",
        "empty":      "",
    }
    for name, in := range cases {
        t.Run(name, func(t *testing.T) {
            _ = Parse(in)
        })
    }
}

func Parse(s string) int { return len(s) }
```

## See Also

- [go-test-table-driven](test-table-driven.md) - the table supplying the names
- [go-test-parallel-subtests](test-parallel-subtests.md) - running named cases concurrently
- [go-test-failure-message](test-failure-message.md) - the message inside each named case
