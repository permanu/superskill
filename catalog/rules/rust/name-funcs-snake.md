---
id: rust-name-funcs-snake
lang: rust
prefix: name
title: "Use `snake_case` for functions, methods, variables, and modules"
severity: should
enforce: tool
tool: rustc::non_snake_case
baseline: latest
status: verified
triggers:
  keywords: ["funcs", "snake", "snake_case", "functions", "methods", "variables", "modules"]
  files: ["**/*.rs"]
  symbols: ["snake_case"]
related: ["rust-name-types-camel", "rust-name-consts-screaming", "rust-name-lifetime-short"]
sources:
  - title: "rust-skills: name-funcs-snake"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-funcs-snake.md
---
> Use `snake_case` for functions, methods, variables, and modules

## Why

Rust uses `snake_case` for "value-level" names—functions, methods, variables, modules. This convention is enforced by the compiler and distinguishes runtime entities from types. Consistent naming makes code scannable and predictable.

## Bad

```rust
struct User;
struct Order;

// CamelCase functions - compiler warns
fn calculateTotal() -> f64 { 0.0 }  // warning: function `calculateTotal` should have a snake case name
fn getUserName() -> String { String::new() }  // warning

// Inconsistent naming
fn get_user() -> User { User }
fn fetchOrder() -> Order { Order }  // Mixed conventions
```

## Good

```rust
struct User { email: String }
struct Order;

// snake_case for functions
fn calculate_total() -> f64 { 0.0 }
fn get_user_name() -> String { String::new() }
fn fetch_order() -> Order { Order }

// snake_case for methods
impl User {
    fn full_name(&self) -> String { String::new() }
    fn is_active(&self) -> bool { true }
    fn set_email(&mut self, email: &str) { self.email = email.to_string(); }
}

// snake_case for variables
fn main() {
    let user_count = 42;
    let max_connections = 100;
    let is_valid = true;
    let _ = (user_count, max_connections, is_valid);
}

// snake_case for modules
mod user_service {} mod http_client {} mod json_parser {}
```

## See Also

- [rust-name-types-camel](name-types-camel.md) - Type naming
- [rust-name-consts-screaming](name-consts-screaming.md) - Constant naming
- [rust-name-lifetime-short](name-lifetime-short.md) - Lifetime naming
