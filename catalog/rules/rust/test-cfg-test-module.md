---
id: rust-test-cfg-test-module
lang: rust
prefix: test
title: "Put unit tests in `#[cfg(test)] mod tests { }` within each module"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["cfg", "test", "module", "put", "unit", "tests", "mod", "within"]
  files: ["**/*.rs"]
  symbols: ["cfg"]
related: ["rust-test-use-super", "rust-test-integration-dir", "rust-test-descriptive-names"]
sources:
  - title: "rust-skills: test-cfg-test-module"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-cfg-test-module.md
---
> Put unit tests in `#[cfg(test)] mod tests { }` within each module

## Why

The `#[cfg(test)]` attribute ensures test code is only compiled during `cargo test`, not in release builds. Placing tests in a `tests` submodule within the same file keeps tests close to the code they test while maintaining separation. This is Rust's idiomatic unit test pattern.

## Bad

```rust
// Tests without cfg(test) - compiled into release binary
mod tests {
    #[test]
    fn test_something() {}  // Included in release build!
}

// Tests in separate file without access to private items
// src/my_module.rs
fn private_helper() {}

// tests/my_module_test.rs
// Can't access private_helper!
```

## Good

```rust
// src/my_module.rs

fn public_api() -> i32 {
    private_helper() * 2
}

fn private_helper() -> i32 {
    21
}

#[cfg(test)]
mod tests {
    use super::*;  // Access to private items
    
    #[test]
    fn test_public_api() {
        assert_eq!(public_api(), 42);
    }
    
    #[test]
    fn test_private_helper() {
        assert_eq!(private_helper(), 21);  // Can test private!
    }
}
```

## See Also

- [rust-test-use-super](test-use-super.md) - Importing from parent module
- [rust-test-integration-dir](test-integration-dir.md) - Integration tests
- [rust-test-descriptive-names](test-descriptive-names.md) - Test naming
