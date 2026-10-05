---
id: go-lint-unmarshal-pointer
lang: go
prefix: lint
title: Pass Unmarshal a pointer to the value to fill
severity: should
enforce: tool
tool: go vet:unmarshal
baseline: latest
status: verified
triggers:
  keywords: [Unmarshal, pointer, vet, decoding]
  files: ["**/*.go"]
  symbols: [json.Unmarshal]
related: [go-lint-errorsas-pointer, go-sec-json-v2]
sources:
  - title: cmd/vet - unmarshal
    url: https://pkg.go.dev/cmd/vet
  - title: Package encoding/json - Unmarshal
    url: https://pkg.go.dev/encoding/json
---
> Decode into &value; a non-pointer argument is rejected before any work happens.

## Why

The vet documentation lists unmarshal as the check for passing non-pointer or non-interface values to decoding functions, and encoding/json documents that Unmarshal stores the result in the value pointed to by its second argument. A map or struct passed by value cannot receive the decoded data, so the call fails with InvalidUnmarshalError and the result is discarded. Taking the address is the whole contract.

## Bad

```go
import "encoding/json"

func parse(data []byte) (map[string]int, error) {
    var v map[string]int
    if err := json.Unmarshal(data, v); err != nil {
        return nil, err
    }
    return v, nil
}
```

## Good

```go
import "encoding/json"

func parse(data []byte) (map[string]int, error) {
    var v map[string]int
    if err := json.Unmarshal(data, &v); err != nil {
        return nil, err
    }
    return v, nil
}
```

## See Also

- [go-lint-errorsas-pointer](lint-errorsas-pointer.md) - the error-tree version of the same pointer rule
- [go-sec-json-v2](sec-json-v2.md) - choosing the safer JSON package
