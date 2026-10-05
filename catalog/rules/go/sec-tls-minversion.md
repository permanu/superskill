---
id: go-sec-tls-minversion
lang: go
prefix: sec
title: Pin MinVersion explicitly instead of relying on the TLS default
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tls, MinVersion, protocol, downgrade]
  files: ["**/*.go"]
  symbols: [tls.Config.MinVersion, tls.VersionTLS12]
related: [go-sec-tls-verify, go-api-option-defaults]
sources:
  - title: Package crypto/tls - Config.MinVersion
    url: https://pkg.go.dev/crypto/tls
  - title: Go 1 and the Future of Go Programs
    url: https://go.dev/doc/go1compat
---
> Set the minimum TLS version your service accepts; do not inherit it silently.

## Why

The crypto/tls documentation describes MinVersion as the minimum acceptable version and says TLS 1.2 is only "currently" the default, with TLS 1.0 still the minimum the package supports. A security floor expressed as a default can move with a release or be lowered by a later configuration, so a service that requires a specific version states it. The compatibility document's promise covers source compatibility, not configuration values, which makes an explicit floor the only durable statement.

## Bad

```go
import "crypto/tls"

func serverConfig(cert tls.Certificate) *tls.Config {
    return &tls.Config{Certificates: []tls.Certificate{cert}}
}
```

## Good

```go
import "crypto/tls"

func serverConfig(cert tls.Certificate) *tls.Config {
    return &tls.Config{
        Certificates: []tls.Certificate{cert},
        MinVersion:   tls.VersionTLS12,
    }
}
```

## See Also

- [go-sec-tls-verify](sec-tls-verify.md) - the verification half of the TLS configuration
- [go-api-option-defaults](api-option-defaults.md) - documenting the defaults that remain
