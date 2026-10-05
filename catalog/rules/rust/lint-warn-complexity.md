---
id: rust-lint-warn-complexity
lang: rust
prefix: lint
title: "Enable clippy::complexity for simpler code"
severity: should
enforce: tool
tool: clippy::complexity
baseline: latest
status: verified
triggers:
  keywords: ["warn", "complexity", "enable", "clippy", "simpler", "code"]
  files: ["**/*.rs"]
related: ["rust-lint-warn-style", "rust-lint-warn-perf", "rust-lint-pedantic-selective"]
sources:
  - title: "rust-skills: lint-warn-complexity"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-warn-complexity.md
---
> Enable clippy::complexity for simpler code

## Why

The `clippy::complexity` lint group identifies unnecessarily complex code that can be simplified. Complex code is harder to read and maintain, and it hides bugs. Clippy suggests cleaner alternatives.

## Bad

```rust
fn lint_examples() {
    let option = Some(1);

    // WARN: manual implementation of Option::map
    let _ = match option {
        Some(x) => Some(x + 1),
        None => None,
    };

    // WARN: redundant allocation
    let s = format!("literal");
    let _ = s;

    // WARN: overly complex boolean expression
    let x = 1;
    if !(x == 0) { }

    // WARN: clone_on_copy
    let y = x.clone();
    let _ = y;
}
```

## Good

```rust
// In lib.rs or main.rs
#![warn(clippy::complexity)]

// Or in `Cargo.toml`:

// [lints.clippy]
// complexity = "warn"
```

## See Also

- [rust-lint-warn-style](lint-warn-style.md) - Style warnings
- [rust-lint-warn-perf](lint-warn-perf.md) - Performance warnings
- [rust-lint-pedantic-selective](lint-pedantic-selective.md) - Pedantic lints
