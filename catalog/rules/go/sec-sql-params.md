---
id: go-sec-sql-params
lang: go
prefix: sec
title: Pass SQL values as parameters, never assemble statements with fmt
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [SQL injection, database/sql, placeholders, query]
  files: ["**/*.go"]
  symbols: [sql.DB.Query, sql.DB.QueryContext]
related: [go-sec-exec-args, go-sec-valid-path]
sources:
  - title: Avoiding SQL injection risk
    url: https://go.dev/doc/database/sql-injection
---
> Bind values with placeholders so the driver sends statement and data separately.

## Why

The official SQL injection guide shows the safe form, `db.Query("SELECT * FROM user WHERE id = ?", id)`, and calls out the fmt.Sprintf version as a security risk: the full statement is assembled before it reaches the DBMS, so a caller can complete it in unexpected ways. The sql package creates a prepared statement from the query and sends each parameter separately, which is why parameter binding exists. Binding syntax varies by driver, but the rule does not.

## Bad

```go
import (
    "database/sql"
    "fmt"
)

func userByID(db *sql.DB, id string) (*sql.Rows, error) {
    return db.Query(fmt.Sprintf("SELECT * FROM user WHERE id = '%s'", id))
}
```

## Good

```go
import "database/sql"

func userByID(db *sql.DB, id string) (*sql.Rows, error) {
    return db.Query("SELECT * FROM user WHERE id = ?", id)
}
```

## See Also

- [go-sec-exec-args](sec-exec-args.md) - the same statement/data separation for commands
- [go-sec-valid-path](sec-valid-path.md) - validating the values that are not parameterizable
