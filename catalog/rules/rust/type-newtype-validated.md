---
id: rust-type-newtype-validated
lang: rust
prefix: type
title: "Use newtypes to enforce validation at construction time"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["newtype", "validated", "newtypes", "enforce", "validation", "construction", "time"]
  files: ["**/*.rs"]
related: ["rust-api-parse-dont-validate", "rust-api-newtype-safety", "rust-type-newtype-ids", "rust-conv-fromstr-parsing", "rust-serde-try-from-validate"]
sources:
  - title: "rust-skills: type-newtype-validated"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-newtype-validated.md
---
> Use newtypes to enforce validation at construction time

## Why

A validated newtype guarantees its inner value is always valid. Once you have an `Email`, you know it passed validation—no re-checking needed. This "parse, don't validate" pattern catches errors at boundaries and makes invalid states unrepresentable.

## Bad

```rust
#[derive(Debug)]
enum Error { InvalidEmail }

fn is_valid_email(s: &str) -> bool { s.contains('@') }

// Validation scattered throughout code
fn send_email(to: &str, body: &str) -> Result<(), Error> {
    if !is_valid_email(to) {  // Must check every time
        return Err(Error::InvalidEmail);
    }
    let _ = body;
    Ok(())
}

fn add_recipient(list: &mut Vec<String>, email: &str) -> Result<(), Error> {
    if !is_valid_email(email) {  // Check again
        return Err(Error::InvalidEmail);
    }
    list.push(email.to_string());
    Ok(())
}
```

## Good

```rust
#[derive(Debug)]
enum Error { InvalidEmail(String) }

fn is_valid_email(s: &str) -> bool { s.contains('@') }

fn send_to_address(_to: &str, _body: &str) -> Result<(), Error> { Ok(()) }

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Email(String);

impl Email {
    pub fn new(s: &str) -> Result<Self, Error> {
        if is_valid_email(s) { Ok(Email(s.to_string())) }
        else { Err(Error::InvalidEmail(s.to_string())) }
    }
    pub fn as_str(&self) -> &str { &self.0 }
}

// No validation needed — an `Email` is always valid
fn send_email(to: &Email, body: &str) -> Result<(), Error> {
    send_to_address(to.as_str(), body)
}
fn add_recipient(list: &mut Vec<Email>, email: Email) {
    list.push(email);
}
```

## See Also

- [rust-api-parse-dont-validate](api-parse-dont-validate.md) - Parse at boundaries
- [rust-api-newtype-safety](api-newtype-safety.md) - Type-safe distinctions
- [rust-type-newtype-ids](type-newtype-ids.md) - ID newtypes
- [rust-conv-fromstr-parsing](conv-fromstr-parsing.md) - FromStr for validated parsing
- [rust-serde-try-from-validate](serde-try-from-validate.md) - Validate during deserialization
