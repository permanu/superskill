---
id: go-sec-tls-verify
lang: go
prefix: sec
title: Never disable TLS certificate verification
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tls, InsecureSkipVerify, certificate, MITM]
  files: ["**/*.go"]
  symbols: [tls.Config.InsecureSkipVerify]
related: [go-sec-tls-minversion, go-sec-cookie-samesite]
sources:
  - title: Package crypto/tls - Config.InsecureSkipVerify
    url: https://pkg.go.dev/crypto/tls
  - title: Package crypto/tls
    url: https://pkg.go.dev/crypto/tls
---
> Leave InsecureSkipVerify false; add trust, never remove verification.

## Why

The crypto/tls documentation says that with InsecureSkipVerify set, the package accepts any certificate presented by the server and any host name in that certificate, leaving the connection susceptible to machine-in-the-middle attacks, and that the field is for testing or for use with a custom verification callback. Disabling verification turns TLS into encryption without authentication, which is exactly what an attacker on the path needs. When a private CA is the reason, put it in RootCAs instead.

## Bad

```go
import "crypto/tls"

func clientConfig() *tls.Config {
    return &tls.Config{InsecureSkipVerify: true}
}
```

## Good

```go
import "crypto/tls"

func clientConfig() *tls.Config {
    return &tls.Config{}
}
```

## See Also

- [go-sec-tls-minversion](sec-tls-minversion.md) - pinning the protocol floor as well
- [go-sec-cookie-samesite](sec-cookie-samesite.md) - protecting the session that rides this connection
