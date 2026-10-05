---
id: go-test-fuzz-skip-invalid
lang: go
prefix: test
title: Skip invalid fuzz inputs instead of failing on them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fuzzing, t.Skip, invalid input, fuzz target]
  files: ["**/*_test.go"]
  symbols: [testing.T.Skip]
related: [go-test-fuzz-seeds, go-test-keep-going]
sources:
  - title: Package testing - Fuzzing
    url: https://pkg.go.dev/testing
  - title: Package testing - Skipping
    url: https://pkg.go.dev/testing
---
> Call t.Skip when the input is invalid; fail only on broken invariants.

## Why

A fuzz target runs on arbitrary bytes, so inputs the API is allowed to reject are not bugs; reporting them as failures floods the corpus with false positives and hides real findings. The testing documentation's own fuzz example calls t.Skip for inputs that fail to unmarshal and asserts only on the round trip that should hold. The seed corpus stays useful because only genuine invariant violations are recorded.

## Bad

```go
func FuzzDecode(f *testing.F) {
    f.Fuzz(func(t *testing.T, in []byte) {
        if _, err := Decode(in); err != nil {
            t.Fatal(err)
        }
    })
}

func Decode(b []byte) ([]byte, error) { return b, nil }
```

## Good

```go
func FuzzDecode(f *testing.F) {
    f.Fuzz(func(t *testing.T, in []byte) {
        if _, err := Decode(in); err != nil {
            t.Skip()
        }
    })
}

func Decode(b []byte) ([]byte, error) { return b, nil }
```

## See Also

- [go-test-fuzz-seeds](test-fuzz-seeds.md) - the corpus the target mutates
- [go-test-keep-going](test-keep-going.md) - why real failures keep running
