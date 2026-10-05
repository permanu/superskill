---
id: rust-err-no-unwrap-prod
lang: rust
prefix: err
title: "Avoid `unwrap()` in production code; use `?`, `expect()`, or handle errors"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["unwrap", "prod", "production", "code", "expect", "handle", "errors"]
  files: ["**/*.rs"]
  symbols: ["unwrap", "expect"]
related: ["rust-err-result-over-panic", "rust-err-expect-bugs-only", "rust-anti-unwrap-abuse"]
sources:
  - title: "rust-skills: err-no-unwrap-prod"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-no-unwrap-prod.md
---
> Avoid `unwrap()` in production code; use `?`, `expect()`, or handle errors

## Why

`unwrap()` panics on `None` or `Err` without any context about what went wrong. In production, this creates cryptic crash messages that are hard to debug. Either propagate errors with `?`, use `expect()` with a message explaining the invariant, or handle the error explicitly.

## Bad

```rust
use std::collections::HashMap;

struct Request { headers: HashMap<String, String> }
struct User { preferences: HashMap<String, String> }
struct Response;
impl Response { fn new(_data: &str) -> Self { Response } }
struct Database;
impl Database {
    fn find_user(&self, _id: &str) -> Option<User> { None }
}
#[allow(non_upper_case_globals)]
static database: Database = Database;

fn process_request(req: Request) -> Response {
    let user_id = req.headers.get("X-User-Id").unwrap();  // Why did it fail?
    let user = database.find_user(user_id).unwrap();       // Which operation?
    let data = user.preferences.get("theme").unwrap();     // No context
    
    Response::new(data)
}

// Crash message: "called `Option::unwrap()` on a `None` value"
// Where? Why? No idea.
```

## Good

```rust
use std::collections::HashMap;

struct Request { headers: HashMap<String, String> }

enum AppError { MissingHeader(&'static str) }

// Option 1: propagate with ?
fn user_id(req: &Request) -> Result<&String, AppError> {
    req.headers
        .get("X-User-Id")
        .ok_or(AppError::MissingHeader("X-User-Id"))
}

// Option 2: expect() only for invariants (never user input)
fn config_value(config: &HashMap<String, String>) -> &str {
    config
        .get("theme")
        .expect("BUG: required config key missing after validation")
}

// Option 3: provide a default instead of panicking
fn theme(prefs: &HashMap<String, String>) -> &str {
    prefs.get("theme").map(String::as_str).unwrap_or("default")
}
```

## See Also

- [rust-err-result-over-panic](err-result-over-panic.md) - Return Result instead of panicking
- [rust-err-expect-bugs-only](err-expect-bugs-only.md) - When expect() is appropriate
- [rust-anti-unwrap-abuse](anti-unwrap-abuse.md) - Patterns for avoiding unwrap
