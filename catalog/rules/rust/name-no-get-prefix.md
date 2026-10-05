---
id: rust-name-no-get-prefix
lang: rust
prefix: name
title: "Omit get_ prefix for simple getters"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["get", "prefix", "omit", "get_", "simple", "getters"]
  files: ["**/*.rs"]
related: ["rust-name-is-has-bool", "rust-api-builder-pattern"]
sources:
  - title: "rust-skills: name-no-get-prefix"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-no-get-prefix.md
---
> Omit get_ prefix for simple getters

## Why

Rust convention omits the `get_` prefix for simple field access. Methods like `len()`, `name()`, `value()` are cleaner than `get_len()`, `get_name()`, `get_value()`. This follows the principle of making the common case concise.

The `get` prefix is reserved for methods that DO something beyond simple field access.

## Bad

```rust
struct User {
    name: String,
    age: u32,
}

impl User {
    fn get_name(&self) -> &str { // Verbose
        &self.name
    }
    fn get_age(&self) -> u32 { // Verbose
        self.age
    }
    fn get_is_adult(&self) -> bool { // Doubly verbose
        self.age >= 18
    }
}

fn main() {
    let user = User { name: String::from("Ada"), age: 30 };
    let name = user.get_name();
    let age = user.get_age();
    let _ = (name, age);
}
```

## Good

```rust
struct User {
    name: String,
    age: u32,
}

impl User {
    fn name(&self) -> &str { // Clean
        &self.name
    }
    fn age(&self) -> u32 { // Clean
        self.age
    }
    fn is_adult(&self) -> bool { // Boolean uses is_ prefix
        self.age >= 18
    }
}

fn main() {
    let user = User { name: String::from("Ada"), age: 30 };
    let name = user.name();
    let age = user.age();
    let _ = (name, age);
}
```

## See Also

- [rust-name-is-has-bool](name-is-has-bool.md) - Boolean naming
- [rust-api-builder-pattern](api-builder-pattern.md) - Builder pattern
