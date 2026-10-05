---
id: go-err-log-once
lang: go
prefix: err
title: Log each error once, at the boundary that owns the response
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [log, slog, boundary, duplicate, handler]
  files: ["**/*.go"]
  symbols: [slog.Error, slog.ErrorContext]
related: [go-err-wrap-once, go-err-no-ignore, go-err-recover-translate]
sources:
  - title: Google Go Style Best Practices - Logging errors
    url: https://google.github.io/styleguide/go/best-practices
  - title: Package log/slog
    url: https://pkg.go.dev/log/slog
---
> Return errors through intermediate layers and log each one once where it is handled.

## Why

Logging an error in every layer that touches it prints the same failure repeatedly and hides the one place that decided the outcome. The style guide says that if you return an error it is usually better not to log it yourself but to let the caller choose to log, rate-limit, or stop. The boundary that writes the response or exits the process holds the request context and the policy, so that is where the single log line belongs.

## Bad

```go
var errNotFound = errors.New("not found")

type DB struct{}

type User struct{ ID string }

func (db *DB) Find(ctx context.Context, id string) (*User, error) {
    err := fmt.Errorf("find user %s: %w", id, errNotFound)
    slog.Error("find failed", "id", id, "err", err)
    return nil, err
}

func handleGet(w http.ResponseWriter, r *http.Request, db *DB) {
    u, err := db.Find(r.Context(), r.PathValue("id"))
    if err != nil {
        slog.Error("get user failed", "err", err)
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }
    _ = u
}
```

## Good

```go
var errNotFound = errors.New("not found")

type DB struct{}

type User struct{ ID string }

func (db *DB) Find(ctx context.Context, id string) (*User, error) {
    return nil, fmt.Errorf("find user %s: %w", id, errNotFound)
}

func handleGet(w http.ResponseWriter, r *http.Request, db *DB) {
    u, err := db.Find(r.Context(), r.PathValue("id"))
    if err != nil {
        slog.ErrorContext(r.Context(), "get user failed", "id", r.PathValue("id"), "err", err)
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }
    _ = u
}
```

## See Also

- [go-err-wrap-once](err-wrap-once.md) - the same no-duplication rule for error text
- [go-err-no-ignore](err-no-ignore.md) - errors that cannot be returned end up logged somewhere
- [go-err-recover-translate](err-recover-translate.md) - a recovered panic becomes one handled error
