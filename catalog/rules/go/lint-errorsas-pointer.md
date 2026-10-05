---
id: go-lint-errorsas-pointer
lang: go
prefix: lint
title: Pass errors.As a pointer to the target type
severity: should
enforce: tool
tool: go vet:errorsas
baseline: latest
status: verified
triggers:
  keywords: [errors.As, pointer, vet, error type]
  files: ["**/*.go"]
  symbols: [errors.As]
related: [go-err-match-by-is-as, go-lint-unmarshal-pointer]
sources:
  - title: cmd/vet - errorsas
    url: https://pkg.go.dev/cmd/vet
  - title: Package errors - As
    url: https://pkg.go.dev/errors
---
> Give errors.As an address of the target variable, typed to the error you want.

## Why

The vet documentation lists errorsas as the check that reports non-pointer or non-error values passed to errors.As, and the errors package requires target to be a non-nil pointer to a type that implements error or to an interface type. The errors documentation states that As panics if target is not such a pointer, so the misuse fails loudly at the call rather than reporting a miss. Declaring the concrete type and passing its address is the supported form.

## Bad

```go
import "errors"

func isPathError(err error) bool {
    var target error
    return errors.As(err, target)
}
```

## Good

```go
import (
    "errors"
    "io/fs"
)

func isPathError(err error) bool {
    var target *fs.PathError
    return errors.As(err, &target)
}
```

## See Also

- [go-err-match-by-is-as](err-match-by-is-as.md) - when to use As rather than Is
- [go-lint-unmarshal-pointer](lint-unmarshal-pointer.md) - the same pointer rule for decoding
