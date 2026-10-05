---
id: go-sec-crypto-rand
lang: go
prefix: sec
title: Generate tokens and keys with crypto/rand, never math/rand
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [crypto/rand, math/rand, token, key, entropy]
  files: ["**/*.go"]
  symbols: [rand.Text, rand.Read]
related: [go-sec-subtle-compare, go-sec-md5]
sources:
  - title: Go Code Review Comments - Crypto Rand
    url: https://go.dev/wiki/CodeReviewComments
---
> Draw every token, key, and nonce from crypto/rand.

## Why

The review guide says not to use math/rand for keys even throwaway ones, because a seed based on time has just a few bits of entropy. crypto/rand reads from the operating system's cryptographic source, and the package provides Text for the common case of a random string. A predictable token lets an attacker forge sessions, reset links, and identifiers.

## Bad

```go
import (
    "math/rand"
    "strconv"
)

func token() string {
    return strconv.Itoa(rand.Intn(1_000_000))
}
```

## Good

```go
import "crypto/rand"

func token() string {
    return rand.Text()
}
```

## See Also

- [go-sec-subtle-compare](sec-subtle-compare.md) - comparing the secrets this produces
- [go-sec-md5](sec-md5.md) - the hash side of the same cryptographic discipline
