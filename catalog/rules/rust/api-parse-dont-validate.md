---
id: rust-api-parse-dont-validate
lang: rust
prefix: api
title: "Parse into validated types at boundaries"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["parse", "validate", "validated", "types", "boundaries"]
  files: ["**/*.rs"]
related: ["rust-api-newtype-safety", "rust-type-newtype-validated", "rust-api-typestate", "rust-conv-tryfrom-fallible", "rust-serde-try-from-validate"]
sources:
  - title: "rust-skills: api-parse-dont-validate"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-parse-dont-validate.md
  - title: "github.com/launchbadge/sqlx/blob/master/src/macros/mod.rs"
    url: https://github.com/launchbadge/sqlx/blob/master/src/macros/mod.rs
---
> Parse into validated types at boundaries

## Why

Instead of validating data and hoping you remember to check everywhere, parse it into a type that can only be constructed from valid data. The type system then guarantees validity - you can't forget to validate because invalid states are unrepresentable.

## Bad

```rust
#[derive(Debug)]
enum Error { InvalidEmail }

fn is_valid_email(s: &str) -> bool { s.contains('@') }

struct Database;
impl Database {
    fn store_email(&self, _email: &str) {}
}
static DATABASE: Database = Database;

// Validation repeated at every call site, easy to forget.
fn send_email(email: &str) -> Result<(), Error> {
    if !is_valid_email(email) { return Err(Error::InvalidEmail); }
    Ok(())
}
fn add_to_mailing_list(email: &str) -> Result<(), Error> {
    if !is_valid_email(email) { return Err(Error::InvalidEmail); }
    Ok(())
}
fn process_user_email(email: &str) {
    DATABASE.store_email(email); // no validation here
}
```

## Good

```rust
#[derive(Debug, PartialEq, Eq, Hash)]
pub struct Email(String);

#[derive(Debug)]
pub enum EmailError { Invalid }

impl Email {
    /// Parses and validates an email address.
    pub fn parse(s: impl Into<String>) -> Result<Self, EmailError> {
        let s = s.into();
        if s.contains('@') && s.len() > 3 {
            Ok(Email(s))
        } else {
            Err(EmailError::Invalid)
        }
    }
    pub fn as_str(&self) -> &str { &self.0 }
}

fn send_email(email: &Email) {
    let _ = email.as_str(); // no validation needed
}
fn add_to_mailing_list(list: &mut Vec<Email>, email: Email) {
    list.push(email); // guaranteed valid by construction
}
```

## See Also

- [rust-api-newtype-safety](api-newtype-safety.md) - Use newtypes for type safety
- [rust-type-newtype-validated](type-newtype-validated.md) - Newtypes for validated data
- [rust-api-typestate](api-typestate.md) - Compile-time state machines
- [rust-conv-tryfrom-fallible](conv-tryfrom-fallible.md) - Parse via TryFrom
- [rust-serde-try-from-validate](serde-try-from-validate.md) - Validate at the serde boundary
