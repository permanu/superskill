---
id: go-sec-cookie-samesite
lang: go
prefix: sec
title: Set SameSite on session cookies so browsers do not attach them cross-site
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cookie, SameSite, CSRF, session]
  files: ["**/*.go"]
  symbols: [http.Cookie, http.SameSiteLaxMode]
related: [go-sec-maxbytes-body, go-obs-log-no-pii]
sources:
  - title: Package net/http - SameSite
    url: https://pkg.go.dev/net/http
  - title: Package net/http - Cookie
    url: https://pkg.go.dev/net/http
---
> Give session cookies an explicit SameSite policy plus the Secure and HttpOnly attributes.

## Why

The net/http documentation says SameSite makes it impossible for the browser to send the cookie along with cross-site requests, mitigating cross-origin information leakage and providing some protection against cross-site request forgery. A cookie with no policy falls back to browser-specific defaults, so the protection depends on the client rather than the service. Secure keeps the value off plaintext transports and HttpOnly keeps it away from page scripts, which narrows the ways a session token can be stolen.

## Bad

```go
import "net/http"

func setSession(w http.ResponseWriter, token string) {
    http.SetCookie(w, &http.Cookie{Name: "session", Value: token})
}
```

## Good

```go
import "net/http"

func setSession(w http.ResponseWriter, token string) {
    http.SetCookie(w, &http.Cookie{
        Name:     "session",
        Value:    token,
        HttpOnly: true,
        Secure:   true,
        SameSite: http.SameSiteLaxMode,
    })
}
```

## See Also

- [go-sec-maxbytes-body](sec-maxbytes-body.md) - the other request-side hardening
- [go-obs-log-no-pii](obs-log-no-pii.md) - keeping the token out of logs too
