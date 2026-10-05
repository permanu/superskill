---
id: rust-anti-stringly-typed
lang: rust
prefix: anti
title: "Don't use strings where enums or newtypes would provide type safety"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["stringly", "typed", "don", "strings", "enums", "newtypes", "provide", "type"]
  files: ["**/*.rs"]
related: ["rust-api-newtype-safety", "rust-api-parse-dont-validate", "rust-type-newtype-ids"]
sources:
  - title: "rust-skills: anti-stringly-typed"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-stringly-typed.md
---
> Don't use strings where enums or newtypes would provide type safety

## Why

Strings are the most primitive way to represent data—they accept any value, provide no validation, and offer no IDE support. When you have a fixed set of valid values or a semantic type, use enums or newtypes. The compiler catches mistakes at compile time instead of runtime.

## Bad

```rust
fn process_order(status: &str, priority: &str) {
    // What are valid statuses? "pending"? "Pending"? "PENDING"?
    // What are valid priorities? "high"? "1"? "urgent"?
    match status {
        "pending" => {}
        "completed" => {}
        _ => panic!("unknown status"),  // Runtime error
    }
}

struct User {
    email: String,    // Any string, even "not an email"
    phone: String,    // Any string, even "hello"
    user_id: String,  // Could be confused with other string IDs
}

fn main() {
    // Easy to make mistakes
    process_order("complete", "high");  // Typo: "complete" vs "completed"
    process_order("high", "pending");   // Swapped arguments - compiles!
}
```

## Good

```rust
#[derive(Clone, Copy)]
enum OrderStatus { Pending, Completed }

fn process_order(status: OrderStatus) {
    match status {
        OrderStatus::Pending => {}
        OrderStatus::Completed => {}
    }
}

struct Email(String);
struct UserId(u64);

impl Email {
    fn new(s: &str) -> Result<Self, ()> {
        if s.contains('@') { Ok(Email(s.to_string())) } else { Err(()) }
    }
}

fn main() {
    // Compile errors catch mistakes
    process_order(OrderStatus::Completed);
    // process_order("complete");  // Compile error: expected OrderStatus
    let _ = (Email::new("a@b.com").unwrap(), UserId(1));
}
```

## See Also

- [rust-api-newtype-safety](api-newtype-safety.md) - Newtype pattern
- [rust-api-parse-dont-validate](api-parse-dont-validate.md) - Parse at boundaries
- [rust-type-newtype-ids](type-newtype-ids.md) - Type-safe IDs
