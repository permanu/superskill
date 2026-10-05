---
id: rust-type-never-diverge
lang: rust
prefix: type
title: "Use `!` (never type) for functions that never return"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["diverge", "type", "functions", "return"]
  files: ["**/*.rs"]
related: ["rust-err-result-over-panic", "rust-type-result-fallible", "rust-opt-cold-unlikely"]
sources:
  - title: "rust-skills: type-never-diverge"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-never-diverge.md
---
> Use `!` (never type) for functions that never return

## Why

The never type `!` indicates a function will never return normally—it either loops forever, panics, or exits the process. This helps the compiler understand control flow and enables `!` to coerce to any type, making it useful in match arms and expressions.

## Bad

```rust
fn process_events() {}

// Return type doesn't indicate non-returning
fn infinite_loop() {
    loop {
        process_events();
    }
    // Implicit () return type, but never returns
}

// Using Option when it always panics
fn unreachable_code() -> Option<()> {
    panic!("This should never be called");
}
```

## Good

```rust
fn process_events() {}

// ! indicates function never returns
fn infinite_loop() -> ! {
    loop {
        process_events();
    }
}

fn abort_with_error(msg: &str) -> ! {
    eprintln!("Fatal error: {}", msg);
    std::process::exit(1);
}

fn panic_handler() -> ! {
    panic!("Unexpected state");
}
```

## See Also

- [rust-err-result-over-panic](err-result-over-panic.md) - When to panic vs return Result
- [rust-type-result-fallible](type-result-fallible.md) - Result for errors
- [rust-opt-cold-unlikely](opt-cold-unlikely.md) - Marking unlikely paths
