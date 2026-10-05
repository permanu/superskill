---
id: rust-err-custom-type
lang: rust
prefix: err
title: "Define custom error types for domain-specific failures"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["custom", "type", "define", "error", "types", "domain-specific", "failures"]
  files: ["**/*.rs"]
related: ["rust-err-thiserror-lib", "rust-err-anyhow-app", "rust-api-non-exhaustive"]
sources:
  - title: "rust-skills: err-custom-type"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-custom-type.md
---
> Define custom error types for domain-specific failures

## Why

Generic errors like `String`, `Box<dyn Error>`, or catch-all enums obscure what can actually go wrong. Custom error types document failure modes in the type system, enable pattern matching for specific handling, and provide clear API contracts. They make your code self-documenting and help callers handle errors appropriately.

## Bad

```rust
struct User { name: String, age: u8 }

fn save(_user: User) {}
fn prompt_for_name() {}

// Generic string errors - no structure
fn validate_user(user: &User) -> Result<(), String> {
    if user.name.is_empty() { return Err("Name is empty".to_string()); }
    if user.age > 150 { return Err("Age is invalid".to_string()); }
    Ok(())
}

fn main() {
    let user = User { name: String::new(), age: 30 };

    // Caller can't match on specific errors
    match validate_user(&user) {
        Ok(()) => save(user),
        // String comparison is fragile
        Err(msg) if msg.contains("Name") => prompt_for_name(),
        Err(_) => {}
    }
}
```

## Good

```rust
use thiserror::Error;
struct User { name: String, age: u8 }
fn show_error(_msg: &str) {}

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("name cannot be empty")] EmptyName,
    #[error("invalid age {0}: must be between 0 and 150")] InvalidAge(u8),
}

fn validate_user(user: &User) -> Result<(), ValidationError> {
    if user.name.is_empty() { return Err(ValidationError::EmptyName); }
    if user.age > 150 { return Err(ValidationError::InvalidAge(user.age)); }
    Ok(())
}

fn main() {
    let user = User { name: String::new(), age: 200 };
    match validate_user(&user) {
        Ok(()) => {}
        Err(ValidationError::EmptyName) => show_error("name is empty"),
        Err(ValidationError::InvalidAge(age)) => show_error(&format!("invalid age {age}")),
        Err(e) => show_error(&e.to_string()),
    }
}
```

## See Also

- [rust-err-thiserror-lib](err-thiserror-lib.md) - Thiserror for error definitions
- [rust-err-anyhow-app](err-anyhow-app.md) - When to use anyhow instead
- [rust-api-non-exhaustive](api-non-exhaustive.md) - Forward-compatible enums
