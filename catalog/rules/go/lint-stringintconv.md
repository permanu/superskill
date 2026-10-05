---
id: go-lint-stringintconv
lang: go
prefix: lint
title: Convert numbers to text with strconv, not a string conversion
severity: should
enforce: tool
tool: go vet:stringintconv
baseline: latest
status: verified
triggers:
  keywords: [string conversion, strconv, rune, vet]
  files: ["**/*.go"]
  symbols: [strconv.Itoa]
related: [go-lint-printf-verbs, go-sec-md5]
sources:
  - title: cmd/vet - stringintconv
    url: https://pkg.go.dev/cmd/vet
---
> Write strconv.Itoa(n) for digits; string(n) is one rune.

## Why

The vet documentation lists stringintconv as the check for string(int) conversions, which produce a one-rune string containing the code point rather than the decimal digits. string(65) is "A", not "65", so an ID, port, or count silently turns into a character. strconv.Itoa states the intent and yields the digits.

## Bad

```go
func label(n int) string {
    return string(n)
}
```

## Good

```go
import "strconv"

func label(n int) string {
    return strconv.Itoa(n)
}
```

## See Also

- [go-lint-printf-verbs](lint-printf-verbs.md) - the other numeric formatting check vet performs
- [go-sec-md5](sec-md5.md) - another place the right crypto/strconv helper beats a raw conversion
