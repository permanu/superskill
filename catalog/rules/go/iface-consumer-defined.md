---
id: go-iface-consumer-defined
lang: go
prefix: iface
title: Define interfaces in the consuming package and return concrete types
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, consumer, concrete type, package design]
  files: ["**/*.go"]
  symbols: [interface]
related: [go-iface-no-mock-only, go-iface-not-premature, go-iface-accept-narrow]
sources:
  - title: Go Code Review Comments - Interfaces
    url: https://go.dev/wiki/CodeReviewComments
  - title: Effective Go - Interfaces
    url: https://go.dev/doc/effective_go
---
> Let consumers declare the interface they need; producers return concrete types.

## Why

An interface defined by the producer freezes one abstraction for every consumer and forces mocks into the API. Defining it where it is used lets each consumer ask for the smallest method set it calls, and returning concrete types lets implementations add methods without breaking callers. The review guide recommends returning concrete (usually pointer or struct) types and defining interfaces on the consumer side.

## Bad

```go
type User struct{ ID string }

type UserStore interface {
    GetUser(id string) (*User, error)
}

type PostgresStore struct{}

func (s *PostgresStore) GetUser(id string) (*User, error) { return nil, nil }

func NewStore() UserStore { return &PostgresStore{} }
```

## Good

```go
type User struct{ ID string }

type PostgresStore struct{}

func (s *PostgresStore) GetUser(id string) (*User, error) { return nil, nil }

func NewStore() *PostgresStore { return &PostgresStore{} }

type UserGetter interface {
    GetUser(id string) (*User, error)
}

func Lookup(g UserGetter, id string) (*User, error) { return g.GetUser(id) }
```

## See Also

- [go-iface-no-mock-only](iface-no-mock-only.md) - the mock-driven version of the same mistake
- [go-iface-not-premature](iface-not-premature.md) - when to introduce the interface at all
- [go-iface-accept-narrow](iface-accept-narrow.md) - how consumers pick the method set
