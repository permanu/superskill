---
id: go-api-constructors-new
lang: go
prefix: api
title: Name constructors New and return a fully initialized value
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constructor, New, initialization, API design]
  files: ["**/*.go"]
  symbols: [New]
related: [go-api-zero-value-useful, go-api-options-struct, go-api-init-minimal]
sources:
  - title: Effective Go - Constructors and composite literals
    url: https://go.dev/doc/effective_go
  - title: Google Go Style Best Practices - Avoid repetition
    url: https://google.github.io/styleguide/go/best-practices
---
> Construct values with New and return them complete; never require a follow-up Init.

## Why

A constructor that returns a zero value and expects a later Init call lets callers use a half-built value and spreads initialization across call sites. Effective Go's constructor example returns a value that is ready to use, and Go style names constructors New or NewThing so godoc groups them with the type. Requiring a second call also breaks whenever a method runs before the caller remembers to initialize.

## Bad

```go
type User struct{ ID string }

func CreateUser() *User { return &User{} }

func (u *User) Init(id string) { u.ID = id }
```

## Good

```go
type User struct{ ID string }

func NewUser(id string) *User { return &User{ID: id} }
```

## See Also

- [go-api-zero-value-useful](api-zero-value-useful.md) - the zero value as the other constructor
- [go-api-options-struct](api-options-struct.md) - constructors with many inputs
- [go-api-init-minimal](api-init-minimal.md) - initialization that belongs in main
