---
id: go-sec-valid-path
lang: go
prefix: sec
title: Validate user-supplied paths with filepath.IsLocal before joining
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [path traversal, filepath.IsLocal, file system, user input]
  files: ["**/*.go"]
  symbols: [filepath.IsLocal, filepath.Join]
related: [go-sec-exec-args, go-sec-maxbytes-body]
sources:
  - title: Package path/filepath - IsLocal
    url: https://pkg.go.dev/path/filepath
---
> Reject non-local path input before it reaches Join and the file system.

## Why

The filepath documentation guarantees that when IsLocal reports true, Join(base, path) always produces a path contained within base and Clean never leaves ".." elements. Without that check, a name like "../../etc/passwd" escapes the intended root as soon as it is joined. IsLocal is lexical, so it also rejects absolute paths and Windows reserved names before any I/O happens.

## Bad

```go
import (
    "os"
    "path/filepath"
)

func readFile(root, name string) ([]byte, error) {
    return os.ReadFile(filepath.Join(root, name))
}
```

## Good

```go
import (
    "errors"
    "os"
    "path/filepath"
)

func readFile(root, name string) ([]byte, error) {
    if !filepath.IsLocal(name) {
        return nil, errors.New("invalid path")
    }
    return os.ReadFile(filepath.Join(root, name))
}
```

## See Also

- [go-sec-exec-args](sec-exec-args.md) - the same distrust applied to commands
- [go-sec-maxbytes-body](sec-maxbytes-body.md) - bounding the data read from untrusted input
