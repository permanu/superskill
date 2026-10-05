---
id: rust-type-no-stringly
lang: rust
prefix: type
title: "Avoid stringly-typed APIs; use enums, newtypes, or validated types"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["stringly", "stringly-typed", "apis", "enums", "newtypes", "validated", "types"]
  files: ["**/*.rs"]
related: ["rust-anti-stringly-typed", "rust-type-newtype-validated", "rust-type-enum-states"]
sources:
  - title: "rust-skills: type-no-stringly"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-no-stringly.md
---
> Avoid stringly-typed APIs; use enums, newtypes, or validated types

## Why

Strings accept any value—typos, wrong formats, invalid data all compile fine. Enums, newtypes, and validated types catch errors at compile time or construction time, not runtime. They also provide better IDE support, documentation, and make invalid states unrepresentable.

## Bad

```rust
// Status as string - easy to get wrong
fn set_status(status: &str) {
    match status {
        "pending" => {}
        "active" => {}
        "completed" => {}
        _ => panic!("Unknown status"),  // Runtime error
    }
}

// Configuration as strings
fn configure(key: &str, value: &str) {
    // No type safety, no validation
    let _ = (key, value);
}

fn main() {
    // Easy to misuse
    set_status("pending");   // OK
    set_status("Pending");   // Runtime error - wrong case
    set_status("aktive");    // Runtime error - typo
    set_status("done");      // Runtime error - wrong word
}
```

## Good

```rust
use std::time::Duration;

// Status as enum - compile-time safety
enum Status {
    Pending,
    Active,
    Completed,
}

fn set_status(status: Status) {
    match status {
        Status::Pending => {}
        Status::Active => {}
        Status::Completed => {}
    }  // Exhaustive - the compiler checks all cases
}
// Typed config instead of key/value strings
struct Config { timeout: Duration, retries: u32, mode: Mode }
enum Mode { Fast, Safe, Balanced }

fn main() {
    // Can only pass valid values
    set_status(Status::Pending);  // OK
    // set_status(Status::Aktivev);  // Compile error - typo caught!
}
```

## See Also

- [rust-anti-stringly-typed](anti-stringly-typed.md) - Anti-pattern details
- [rust-type-newtype-validated](type-newtype-validated.md) - Validated newtypes
- [rust-type-enum-states](type-enum-states.md) - Enums for states
