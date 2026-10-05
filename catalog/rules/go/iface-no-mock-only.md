---
id: go-iface-no-mock-only
lang: go
prefix: iface
title: Do not define interfaces on the producer side only for mocking
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, mock, testing, API design]
  files: ["**/*.go"]
  symbols: [interface]
related: [go-iface-consumer-defined, go-iface-not-premature]
sources:
  - title: Go Code Review Comments - Interfaces
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Best Practices - Test double and helper packages
    url: https://google.github.io/styleguide/go/best-practices
---
> Design for the real API; test against the real implementation or define fakes in tests.

## Why

An interface invented for a mock leaks test scaffolding into the public API and commits every caller to the same shape. The review guide says to design the API so it can be tested through the public surface of the real implementation, and the style guide places test doubles in dedicated test packages. If a seam is genuinely needed, the consumer package defines the small interface it wants to substitute.

## Bad

```go
type Mailer interface {
    Send(to, subject string) error
}

type mockMailer struct{}

func (mockMailer) Send(to, subject string) error { return nil }

func Notify(m Mailer, to string) error { return m.Send(to, "hi") }
```

## Good

```go
type SMTPMailer struct{ addr string }

func (m *SMTPMailer) Send(to, subject string) error { return nil }

func Notify(m *SMTPMailer, to string) error { return m.Send(to, "hi") }
```

## See Also

- [go-iface-consumer-defined](iface-consumer-defined.md) - where a legitimate interface is defined
- [go-iface-not-premature](iface-not-premature.md) - waiting for a real consumer before abstracting
