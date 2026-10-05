---
id: go-sec-subtle-compare
lang: go
prefix: sec
title: Compare secrets with crypto/subtle, not ==
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constant time, subtle, MAC, token comparison]
  files: ["**/*.go"]
  symbols: [subtle.ConstantTimeCompare]
related: [go-sec-crypto-rand, go-sec-md5]
sources:
  - title: Package crypto/subtle - ConstantTimeCompare
    url: https://pkg.go.dev/crypto/subtle
  - title: Package crypto/subtle
    url: https://pkg.go.dev/crypto/subtle
---
> Compare MACs, tokens, and hashes in constant time.

## Why

The subtle documentation defines ConstantTimeCompare as returning whether two slices are equal with a running time that depends only on the length, not the contents. A byte-wise comparison or == stops at the first mismatch, so an attacker who can measure response times learns how many leading bytes are correct and can recover the secret byte by byte. The package exists precisely because this comparison is easy to get wrong.

## Bad

```go
func validMAC(got, want []byte) bool {
    return string(got) == string(want)
}
```

## Good

```go
import "crypto/subtle"

func validMAC(got, want []byte) bool {
    return subtle.ConstantTimeCompare(got, want) == 1
}
```

## See Also

- [go-sec-crypto-rand](sec-crypto-rand.md) - generating the values being compared
- [go-sec-md5](sec-md5.md) - choosing hashes that are safe to compare
