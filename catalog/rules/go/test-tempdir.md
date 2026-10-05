---
id: go-test-tempdir
lang: go
prefix: test
title: Use t.TempDir for test files instead of managing a temporary directory
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [t.TempDir, temporary files, cleanup, fixtures]
  files: ["**/*_test.go"]
  symbols: [testing.T.TempDir]
related: [go-test-cleanup, go-test-helper]
sources:
  - title: Package testing - T.TempDir
    url: https://pkg.go.dev/testing
  - title: Go Wiki - Go Test Comments
    url: https://go.dev/wiki/TestComments
---
> Create test files under t.TempDir and let the testing package remove them.

## Why

A hand-managed MkdirTemp directory leaks on every failing test path and needs its own cleanup, which is exactly the kind of bookkeeping a test should not carry. t.TempDir returns a unique directory and registers its removal with Cleanup automatically. The directory name is also derived from the test name, so leftovers are identifiable when debugging.

## Bad

```go
func writeConfig(t *testing.T) string {
    dir, err := os.MkdirTemp("", "cfg")
    if err != nil {
        t.Fatal(err)
    }
    path := filepath.Join(dir, "app.yaml")
    if err := os.WriteFile(path, []byte("a: 1"), 0o600); err != nil {
        t.Fatal(err)
    }
    return path
}
```

## Good

```go
func writeConfig(t *testing.T) string {
    path := filepath.Join(t.TempDir(), "app.yaml")
    if err := os.WriteFile(path, []byte("a: 1"), 0o600); err != nil {
        t.Fatal(err)
    }
    return path
}
```

## See Also

- [go-test-cleanup](test-cleanup.md) - cleanup for resources that are not directories
- [go-test-helper](test-helper.md) - marking the fixture helper
