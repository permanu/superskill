---
id: rust-test-snapshot-testing
lang: rust
prefix: test
title: "Use snapshot testing (insta) for complex or serialized output"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["snapshot", "testing", "insta", "complex", "serialized", "output"]
  files: ["**/*.rs"]
related: ["rust-test-arrange-act-assert", "rust-test-proptest-properties", "rust-test-doctest-examples"]
sources:
  - title: "rust-skills: test-snapshot-testing"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-snapshot-testing.md
---
> Use snapshot testing (insta) for complex or serialized output

## Why

Asserting large structured output — pretty-printed structs, rendered error messages, JSON responses, generated code, CLI output — with hand-written `assert_eq!` is verbose, brittle, and hard to update when output intentionally changes. The `insta` crate records an approved snapshot on first run and diffs against it on subsequent runs; when output changes legitimately, `cargo insta review` presents a diff and lets you accept it in one keystroke. Snapshots are committed to the repo and reviewed in PRs, making output changes visible and deliberate rather than silent.

## Bad

```rust
use std::fmt;

enum AppError { NotFound { id: u64 } }
impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::NotFound { id } => write!(f, "resource with id {id} was not found"),
        }
    }
}

#[derive(serde::Serialize)]
struct Config { timeout: u32, retries: u32 }
#[test]
fn test_render_error() {
    let err = AppError::NotFound { id: 42 };
    // Fragile: must manually maintain this string forever
    assert_eq!(format!("{err}"), "resource with id 42 was not found");
}
#[test]
fn test_config_serialization() {
    let json = serde_json::to_string_pretty(&Config { timeout: 30, retries: 3 }).unwrap();
    assert_eq!(json, "{\n  \"timeout\": 30,\n  \"retries\": 3\n}");
}
```

## Good

```rust
// [dev-dependencies]
// insta = { version = "1", features = ["json"] }

use insta::{assert_debug_snapshot, assert_json_snapshot};

#[derive(Debug)]
enum AppError { NotFound { id: u64 } }

#[derive(Debug, serde::Serialize)]
struct Config { timeout: u32, retries: u32 }

#[test]
fn test_render_error() {
    let err = AppError::NotFound { id: 42 };
    // First run records the snapshot; later runs diff against it
    assert_debug_snapshot!(err);
}

#[test]
fn test_config_serialization() {
    let config = Config { timeout: 30, retries: 3 };
    // Stored as pretty-printed JSON for easy review
    assert_json_snapshot!(config);
}
```

## See Also

- [rust-test-arrange-act-assert](test-arrange-act-assert.md) - Structure tests as arrange/act/assert
- [rust-test-proptest-properties](test-proptest-properties.md) - Use proptest for property-based testing
- [rust-test-doctest-examples](test-doctest-examples.md) - Keep doc examples as executable tests
