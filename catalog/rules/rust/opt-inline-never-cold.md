---
id: rust-opt-inline-never-cold
lang: rust
prefix: opt
title: "Use `#[inline(never)]` and `#[cold]` for error paths and rarely-executed code"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["inline", "cold", "error", "paths", "rarely-executed", "code"]
  files: ["**/*.rs"]
  symbols: ["inline", "cold"]
related: ["rust-opt-inline-small", "rust-opt-inline-always-rare", "rust-err-result-over-panic"]
sources:
  - title: "rust-skills: opt-inline-never-cold"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-inline-never-cold.md
---
> Use `#[inline(never)]` and `#[cold]` for error paths and rarely-executed code

## Why

Inlining error handling code into hot paths wastes instruction cache space and can prevent other optimizations. `#[inline(never)]` keeps cold code out of the hot path. `#[cold]` tells the compiler this branch is unlikely, enabling better branch prediction hints and code layout.

## Bad

```rust
struct Output;

enum Error {
    Empty {
        context: String,
        suggestions: Vec<&'static str>,
    },
}

fn process_data(data: &[u8]) -> Result<Output, Error> {
    if data.is_empty() {
        // Error path inlined into hot function
        return Err(Error::Empty {
            context: format!("Expected data, got empty slice"),
            suggestions: vec!["Check input", "Validate before calling"],
        });
    }
    // Hot path now polluted with error construction code
    do_processing(data)
}

fn do_processing(_data: &[u8]) -> Result<Output, Error> {
    Ok(Output)
}
```

## Good

```rust
struct Error {
    context: String,
    suggestions: Vec<&'static str>,
}

fn process_data(data: &[u8]) -> Result<&[u8], Error> {
    if data.is_empty() {
        return Err(empty_data_error()); // Cold path stays out of the hot function
    }
    Ok(data)
}

#[cold]
#[inline(never)]
fn empty_data_error() -> Error {
    Error {
        context: "Expected data, got empty slice".to_string(),
        suggestions: vec!["Check input", "Validate before calling"],
    }
}
```

## See Also

- [rust-opt-inline-small](opt-inline-small.md) - Inlining for hot code
- [rust-opt-inline-always-rare](opt-inline-always-rare.md) - Forced inlining
- [rust-err-result-over-panic](err-result-over-panic.md) - Error handling patterns
