---
id: go-gen-differing-impls-interface
lang: go
prefix: gen
title: Use an interface when the implementation differs per type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generics, interface, type switch, dynamic]
  files: ["**/*.go"]
  symbols: []
related: [go-gen-write-code-first, go-gen-prefer-functions]
sources:
  - title: When To Use Generics - Don't use type parameters if method implementations differ
    url: https://go.dev/blog/when-generics
  - title: Go FAQ - Why doesn't Go have variant types?
    url: https://go.dev/doc/faq
---
> When each type needs different code, dispatch through a method, not a type parameter.

## Why

The generics guide states the inverse rule directly: if the implementation is different for each type, use an interface type and write different method implementations rather than a type parameter. A generic function that switches on the dynamic type defeats the static checking generics exist to provide, and it must handle every future type in one place. The FAQ makes the same point for variant types: an interface plus a type switch is how Go expresses a closed set of behaviors.

## Bad

```go
func Size[T any](v T) int {
    switch any(v).(type) {
    case string:
        return len(any(v).(string))
    case []byte:
        return len(any(v).([]byte))
    }
    return 0
}
```

## Good

```go
type Sizer interface {
    Size() int
}

func Size(s Sizer) int { return s.Size() }
```

## See Also

- [go-gen-write-code-first](gen-write-code-first.md) - deciding whether generics apply
- [go-gen-prefer-functions](gen-prefer-functions.md) - the constraint form that does fit
