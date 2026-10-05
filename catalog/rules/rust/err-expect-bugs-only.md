---
id: rust-err-expect-bugs-only
lang: rust
prefix: err
title: "Use `expect()` only for invariants that indicate bugs, not user errors"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["expect", "bugs", "invariants", "indicate", "user", "errors"]
  files: ["**/*.rs"]
  symbols: ["expect"]
related: ["rust-err-no-unwrap-prod", "rust-err-result-over-panic", "rust-api-parse-dont-validate"]
sources:
  - title: "rust-skills: err-expect-bugs-only"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-expect-bugs-only.md
---
> Use `expect()` only for invariants that indicate bugs, not user errors

## Why

`expect()` is better than `unwrap()` because it provides context, but it still panics. Reserve it for situations where failure indicates a bug in your code—a violated invariant, not a user error or external failure. The message should explain why the invariant should hold, helping future developers understand and fix the bug.

## Bad

```rust
use std::fs;

#[derive(serde::Deserialize)] struct Config;
#[derive(serde::Deserialize)] struct Data;

// User input can legitimately fail - don't expect
fn parse_user_input(input: &str) -> Config {
    serde_json::from_str(input)
        .expect("Invalid JSON")  // User error, not a bug!
}

// Network can fail - don't expect
fn fetch_data(url: &str) -> Data {
    reqwest::blocking::get(url)
        .expect("Network request failed")  // External failure!
        .json()
        .expect("Invalid response")
}

// File might not exist - don't expect
fn load_config() -> Config {
    let content = fs::read_to_string("config.json")
        .expect("Config file missing");  // Environment issue!
    serde_json::from_str(&content).expect("Invalid config")
}
```

## Good

```rust
use regex::Regex;
use std::collections::HashMap;

// Invariant: after insert, the key exists
fn cache_and_get(cache: &mut HashMap<String, i32>, key: String, value: i32) -> &i32 {
    cache.insert(key.clone(), value);
    cache.get(&key)
        .expect("BUG: key must exist immediately after insert")
}

// Invariant: the regex is a compile-time constant
fn create_parser() -> Regex {
    Regex::new(r"^\d{4}-\d{2}-\d{2}$")
        .expect("BUG: date regex is invalid - this is a compile-time constant")
}

struct ValidatedData { required_field: Option<i32> }
struct Output;

// Invariant: already validated
fn process_validated(data: ValidatedData) -> Result<Output, ()> {
    let _value = data.required_field
        .expect("BUG: ValidatedData guarantees required_field is Some");
    Ok(Output)
}
```

## See Also

- [rust-err-no-unwrap-prod](err-no-unwrap-prod.md) - Avoiding unwrap in production
- [rust-err-result-over-panic](err-result-over-panic.md) - When to return Result
- [rust-api-parse-dont-validate](api-parse-dont-validate.md) - Type-driven validation
