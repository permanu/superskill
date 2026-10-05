---
id: rust-lint-warn-suspicious
lang: rust
prefix: lint
title: "Enable clippy::suspicious for likely bugs"
severity: should
enforce: tool
tool: clippy::suspicious
baseline: latest
status: verified
triggers:
  keywords: ["warn", "suspicious", "enable", "clippy", "likely", "bugs"]
  files: ["**/*.rs"]
related: ["rust-lint-deny-correctness", "rust-lint-warn-style", "rust-lint-warn-complexity"]
sources:
  - title: "rust-skills: lint-warn-suspicious"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-warn-suspicious.md
---
> Enable clippy::suspicious for likely bugs

## Why

The `clippy::suspicious` lint group catches code patterns that are syntactically valid but almost always wrong. These are potential bugs that deserve investigation. Enabling this group as a warning helps catch mistakes early.

## Bad

```rust
fn suspicious_examples() {
    // WARN: suspicious + in a << expression
    let _ = 1 << 4 + 1;

    // WARN: suspicious | in a + expression
    let (x, y) = (1, 2);
    let _ = x | 1 + y;

    // WARN: almost swapped operands in a comparison
    if 5 < x && x < 3 { }

    // WARN: side effect in a map closure
    let v = vec![1, 2, 3];
    let _: Vec<_> = v.iter().map(|x| { println!("{x}"); x }).collect();

    // WARN: redundant nested format
    let _ = format!("{}", format!("{}", 5));

    // WARN: suspicious use of ! on a bool
    let b = true;
    let _ = !b as i32;

    // WARN: float-to-int cast may lose precision
    let _ = 3.14_f64 as i32;
}
```

## Good

```rust
// In lib.rs or main.rs
#![warn(clippy::suspicious)]

// Or in `Cargo.toml`:

// [lints.clippy]
// suspicious = "warn"
```

## See Also

- [rust-lint-deny-correctness](lint-deny-correctness.md) - Deny definite bugs
- [rust-lint-warn-style](lint-warn-style.md) - Style warnings
- [rust-lint-warn-complexity](lint-warn-complexity.md) - Complexity warnings
