---
id: go-proj-util-package
lang: go
prefix: proj
title: Name packages after what they provide, not util or common
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [package name, util, common, helper, import conflict]
  files: ["**/*.go"]
  symbols: []
related: [go-proj-package-per-directory, go-style-name-repetition]
sources:
  - title: Google Go Style Decisions - Package names
    url: https://google.github.io/styleguide/go/decisions
  - title: Google Go Style Best Practices - Util packages
    url: https://google.github.io/styleguide/go/best-practices
---
> util tells the reader nothing; name the package for its actual job.

## Why

The style decisions say to avoid uninformative package names like util, utility, common, helper, model, and testhelper that tempt users to rename the package when importing, and the best practices page explains that such names make code harder to read and cause needless import conflicts when used broadly. A package called util also grows without a theme, because nothing about the name rejects the next unrelated function. A name like records or parse says what belongs inside and keeps the import line self-explanatory.

## Bad

```go
// util/parse.go: package util
func Parse(data []byte) ([]string, error) { return nil, nil }
```

## Good

```go
// records/parse.go: package records
func Parse(data []byte) ([]string, error) { return nil, nil }
```

## See Also

- [go-proj-package-per-directory](proj-package-per-directory.md) - the directory that gives the package its name
- [go-style-name-repetition](style-name-repetition.md) - dropping words the context already provides
