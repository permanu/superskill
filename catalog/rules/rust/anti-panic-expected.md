---
id: rust-anti-panic-expected
lang: rust
prefix: anti
title: "Don't panic on expected or recoverable errors"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["panic", "expected", "don", "recoverable", "errors"]
  files: ["**/*.rs"]
related: ["rust-err-result-over-panic", "rust-anti-unwrap-abuse", "rust-err-expect-bugs-only"]
sources:
  - title: "rust-skills: anti-panic-expected"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-panic-expected.md
---
> Don't panic on expected or recoverable errors

## Why

Panics crash the program. They're for unrecoverable situations—bugs, corrupted state, invariant violations. Using panic for expected conditions (network failures, file not found, invalid input) makes programs fragile and forces callers to catch panics or die.

Use `Result` for recoverable errors.

## Bad

```rust
#[derive(serde::Deserialize)] struct Data;
#[derive(serde::Deserialize)] struct Config;

// Network failures are expected
fn fetch_data(url: &str) -> Data {
    let response = reqwest::blocking::get(url).expect("network error");
    response.json().expect("invalid json")
}

// User input is often invalid
fn parse_config(input: &str) -> Config {
    toml::from_str(input).expect("invalid config")
}

// Validation failures are expected
fn process_age(age: i32) {
    if age < 0 {
        panic!("age cannot be negative");
    }
}
```

## Good

```rust
#[derive(serde::Deserialize)] struct Data;
#[derive(serde::Deserialize)] struct Config;

#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("network error: {0}")] Network(#[from] reqwest::Error),
    #[error("invalid config: {0}")] Config(#[from] toml::de::Error),
    #[error("age cannot be negative")] Age,
}

// Return errors for expected failures
fn fetch_data(url: &str) -> Result<Data, AppError> {
    Ok(reqwest::blocking::get(url)?.json()?)
}

fn parse_config(input: &str) -> Result<Config, AppError> {
    Ok(toml::from_str(input)?)
}

fn process_age(age: i32) -> Result<(), AppError> {
    if age < 0 {
        return Err(AppError::Age);
    }
    Ok(())
}
```

## See Also

- [rust-err-result-over-panic](err-result-over-panic.md) - Use Result
- [rust-anti-unwrap-abuse](anti-unwrap-abuse.md) - Unwrap anti-pattern
- [rust-err-expect-bugs-only](err-expect-bugs-only.md) - When to expect
