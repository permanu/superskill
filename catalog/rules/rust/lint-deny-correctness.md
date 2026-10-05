---
id: rust-lint-deny-correctness
lang: rust
prefix: lint
title: "`#![deny(clippy::correctness)]`"
severity: should
enforce: tool
tool: clippy::correctness
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["deny", "correctness", "clippy"]
  files: ["**/*.rs"]
related: ["rust-lint-warn-suspicious", "rust-lint-warn-perf"]
sources:
  - title: "rust-skills: lint-deny-correctness"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-deny-correctness.md
---
> `#![deny(clippy::correctness)]`

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates code rejected by rustc and by `clippy::correctness` when denied).

Clippy's correctness lints catch code that is outright wrong - logic errors, undefined behavior, or code that doesn't do what you think. These should always be errors, not warnings.

## Bad

```rust
// Infinite loop (iter::repeat without take)
for x in std::iter::repeat(1) {  // ERROR: infinite iterator
    println!("{}", x);
}

// Comparison to NaN (always false)
if x == f64::NAN {  // ERROR: NaN != NaN always
    // This never executes
}

// Use after free patterns
let r;
{
    let x = 5;
    r = &x;  // ERROR: x dropped here
}
println!("{}", r);

// Wrong equality check
if x = 5 {  // ERROR: assignment in condition (should be ==)
}

// Useless comparisons
if x >= 0 && x < 0 {  // ERROR: impossible condition
}
```

## Good

```rust
// At the top of lib.rs or main.rs
#![deny(clippy::correctness)]

// Or in Cargo.toml for workspace-wide
// [lints.clippy]
// correctness = "deny"
```

## See Also

- [rust-lint-warn-suspicious](lint-warn-suspicious.md) - Warn on suspicious code
- [rust-lint-warn-perf](lint-warn-perf.md) - Warn on performance issues
