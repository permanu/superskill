---
id: go-data-json-tags-explicit
lang: go
prefix: data
title: Tag JSON fields explicitly instead of relying on Go field names
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, struct tag, wire format, rename]
  files: ["**/*.go"]
  symbols: []
related: [go-data-json-omitempty-vs-omitzero, go-data-json-unknown-fields]
sources:
  - title: Package encoding/json - Marshal
    url: https://pkg.go.dev/encoding/json
---
> Pin the JSON name with a tag; the default key is the Go field name.

## Why

The encoding/json documentation says each exported struct field becomes a member of the object using the field name as the object key unless a tag customizes it. That default makes the wire format track internal renames: changing ID to UserID silently renames the JSON key for every client. An explicit `json:"id"` separates the Go identifier from the protocol identifier, and the tag is also where case and options are declared.

## Bad

```go
type User struct {
    ID    int
    Email string
}
```

## Good

```go
type User struct {
    ID    int    `json:"id"`
    Email string `json:"email"`
}
```

## See Also

- [go-data-json-omitempty-vs-omitzero](data-json-omitempty-vs-omitzero.md) - the options that live in the tag
- [go-data-json-unknown-fields](data-json-unknown-fields.md) - enforcing the schema on input
