---
id: rust-opt-cold-unlikely
lang: rust
prefix: opt
title: "Mark unlikely code paths with `#[cold]` to help compiler optimization"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["cold", "unlikely", "mark", "code", "paths", "help", "compiler", "optimization"]
  files: ["**/*.rs"]
  symbols: ["cold"]
related: ["rust-opt-inline-never-cold", "rust-opt-likely-hint", "rust-err-result-over-panic"]
sources:
  - title: "rust-skills: opt-cold-unlikely"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-cold-unlikely.md
---
> Mark unlikely code paths with `#[cold]` to help compiler optimization

## Why

The `#[cold]` attribute tells the compiler that a function is rarely called. The compiler uses this to optimize code layout—keeping cold code away from hot code improves instruction cache utilization. Combined with branch layout optimization, this can measurably improve performance.

## Bad

```rust
struct Data;

enum ValidationError { Empty, TooLong, NonAscii }

// All branches treated equally
fn validate(input: &str) -> Result<Data, ValidationError> {
    if input.is_empty() { return Err(ValidationError::Empty); } // Rare
    if input.len() > 1000 { return Err(ValidationError::TooLong); } // Rare
    if !input.is_ascii() { return Err(ValidationError::NonAscii); } // Rare
    Ok(parse_data(input)) // Common case
}

fn parse_data(input: &str) -> Data {
    let _ = input;
    Data
}
```

## Good

```rust
struct Data;

enum ValidationError { Empty, TooLong, NonAscii }

// Keep rare error paths out of the hot code layout
#[cold]
fn cold(error: ValidationError) -> Result<Data, ValidationError> {
    Err(error)
}

fn validate(input: &str) -> Result<Data, ValidationError> {
    if input.is_empty() { return cold(ValidationError::Empty); }
    if input.len() > 1000 { return cold(ValidationError::TooLong); }
    if !input.is_ascii() { return cold(ValidationError::NonAscii); }
    Ok(parse_data(input))
}

fn parse_data(input: &str) -> Data {
    let _ = input;
    Data
}
```

## See Also

- [rust-opt-inline-never-cold](opt-inline-never-cold.md) - Combining with inline(never)
- [rust-opt-likely-hint](opt-likely-hint.md) - Branch prediction hints
- [rust-err-result-over-panic](err-result-over-panic.md) - Error handling
