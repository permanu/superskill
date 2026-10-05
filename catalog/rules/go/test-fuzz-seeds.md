---
id: go-test-fuzz-seeds
lang: go
prefix: test
title: Seed fuzz targets with small inputs that exercise the edges
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fuzzing, seed corpus, F.Add, invariants]
  files: ["**/*_test.go"]
  symbols: [testing.F.Fuzz, testing.F.Add]
related: [go-test-fuzz-skip-invalid, go-test-table-driven]
sources:
  - title: Package testing - Fuzzing
    url: https://pkg.go.dev/testing
  - title: Go Security Best Practices - Fuzzing
    url: https://go.dev/doc/security/best-practices
---
> Register seed inputs with f.Add before the fuzz target runs.

## Why

The fuzzing engine mutates the seed corpus to find new coverage, so empty, zero, and boundary inputs give it a head start and act as regression tests for previously found bugs. The testing documentation asks for a set of small seed inputs with good code coverage, and the security guidance recommends fuzzing precisely because it reaches edge cases programmers skip. A target with no seeds starts from random noise.

## Bad

```go
func FuzzRoundTrip(f *testing.F) {
    f.Fuzz(func(t *testing.T, in []byte) {
        out := Encode(in)
        if got := Decode(out); !bytes.Equal(got, in) {
            t.Fatalf("round trip mismatch: %q", in)
        }
    })
}

func Encode(b []byte) []byte { return b }

func Decode(b []byte) []byte { return b }
```

## Good

```go
func FuzzRoundTrip(f *testing.F) {
    for _, seed := range [][]byte{{}, {0}, {0xff}} {
        f.Add(seed)
    }
    f.Fuzz(func(t *testing.T, in []byte) {
        out := Encode(in)
        if got := Decode(out); !bytes.Equal(got, in) {
            t.Fatalf("round trip mismatch: %q", in)
        }
    })
}

func Encode(b []byte) []byte { return b }

func Decode(b []byte) []byte { return b }
```

## See Also

- [go-test-fuzz-skip-invalid](test-fuzz-skip-invalid.md) - rejecting inputs the parser refuses
- [go-test-table-driven](test-table-driven.md) - the deterministic counterpart
