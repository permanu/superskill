---
id: rust-lint-pedantic-selective
lang: rust
prefix: lint
title: "Enable clippy::pedantic selectively"
severity: prefer
enforce: tool
tool: clippy::pedantic
baseline: latest
status: verified
triggers:
  keywords: ["pedantic", "selective", "enable", "clippy", "selectively"]
  files: ["**/*.rs"]
related: ["rust-lint-warn-style", "rust-lint-warn-complexity", "rust-lint-deny-correctness"]
sources:
  - title: "rust-skills: lint-pedantic-selective"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-pedantic-selective.md
---
> Enable clippy::pedantic selectively

## Why

The `clippy::pedantic` group contains opinionated lints that aren't universally applicable. Enabling it wholesale produces noise; selectively enabling useful pedantic lints improves code quality without false positives.

## Bad

```rust
// Too noisy - will fight you constantly
#![warn(clippy::pedantic)]
```

## Good

```rust
// # Cargo.toml - cherry-pick useful pedantic lints
// [lints.clippy]
// # Enable pedantic as baseline
// pedantic = "warn"

// # Disable noisy ones
// missing_errors_doc = "allow"      # Document errors separately
// missing_panics_doc = "allow"      # Document panics separately
// module_name_repetitions = "allow" # Allow Foo::FooError pattern
// too_many_lines = "allow"          # Function length varies
// must_use_candidate = "allow"      # Too many suggestions
```

## See Also

- [rust-lint-warn-style](lint-warn-style.md) - Style warnings
- [rust-lint-warn-complexity](lint-warn-complexity.md) - Complexity warnings
- [rust-lint-deny-correctness](lint-deny-correctness.md) - Correctness lints
