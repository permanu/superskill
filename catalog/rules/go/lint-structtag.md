---
id: go-lint-structtag
lang: go
prefix: lint
title: Write struct tags in the key:"value" form
severity: should
enforce: tool
tool: go vet:structtag
baseline: latest
status: verified
triggers:
  keywords: [struct tag, json, vet, reflection]
  files: ["**/*.go"]
  symbols: [reflect.StructTag]
related: [go-lint-unmarshal-pointer, go-api-keyed-struct-literals]
sources:
  - title: cmd/vet - structtag
    url: https://pkg.go.dev/cmd/vet
---
> Quote tag values; a malformed tag is silently ignored at run time.

## Why

The vet documentation lists structtag as the check that field tags conform to reflect.StructTag.Get, the same parser the encoding packages use. A tag written as `json:name` without quotes is not a valid tag pair, so the field keeps its default name and the bug surfaces only in serialized output. The canonical form is `json:"name"`, optionally with comma-separated options.

## Bad

```go
type Config struct {
    Name string `json:name`
}
```

## Good

```go
type Config struct {
    Name string `json:"name"`
}
```

## See Also

- [go-lint-unmarshal-pointer](lint-unmarshal-pointer.md) - the other reflection-based vet check
- [go-api-keyed-struct-literals](api-keyed-struct-literals.md) - struct construction vet also verifies
