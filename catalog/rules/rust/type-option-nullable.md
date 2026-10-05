---
id: rust-type-option-nullable
lang: rust
prefix: type
title: "Use `Option<T>` for values that may not exist"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["option", "nullable", "values", "might", "exist"]
  files: ["**/*.rs"]
  symbols: ["Option"]
related: ["rust-type-result-fallible", "rust-type-enum-states", "rust-err-no-unwrap-prod"]
sources:
  - title: "rust-skills: type-option-nullable"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-option-nullable.md
---
> Use `Option<T>` for values that may not exist

## Why

`Option<T>` explicitly represents "value or nothing" in the type system. Unlike null pointers or sentinel values, you can't accidentally use a missing value—the compiler forces you to handle the `None` case. This eliminates null pointer exceptions at compile time.

## Bad

```rust
use std::collections::HashMap;

#[derive(Clone)]
struct User { name: String }

fn empty_user() -> User { User { name: String::new() } }

// Sentinel values - easy to forget to check
fn find_user(id: u64) -> User {
    let users: HashMap<u64, User> = HashMap::new();
    users.get(&id).cloned().unwrap_or_else(empty_user)
}

// Nullable-style with raw pointers: unsafe, no compiler help
fn find_user_raw(id: u64) -> *const User {
    let users: HashMap<u64, User> = HashMap::new();
    users.get(&id).map(|u| u as *const User).unwrap_or(std::ptr::null())
}

fn main() {
    let user = find_user(42);
    println!("{}", user.name); // Might be empty user - silent bug
}
```

## Good

```rust
use std::collections::HashMap;

#[derive(Clone)]
struct User { name: String }

// Option makes absence explicit
fn find_user(id: u64) -> Option<User> {
    let users: HashMap<u64, User> = HashMap::new();
    users.get(&id).cloned()
}

fn main() {
    // Must handle the None case
    let user = find_user(42);
    match user {
        Some(u) => println!("{}", u.name),
        None => println!("User not found"),
    }

    // Or use combinators
    let name = find_user(42)
        .map(|u| u.name)
        .unwrap_or_else(|| "Unknown".to_string());
    let _ = name;
}
```

## See Also

- [rust-type-result-fallible](type-result-fallible.md) - Result for errors
- [rust-type-enum-states](type-enum-states.md) - Enums for states
- [rust-err-no-unwrap-prod](err-no-unwrap-prod.md) - Handling Option safely
