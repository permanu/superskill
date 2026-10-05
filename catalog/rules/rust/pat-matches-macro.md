---
id: rust-pat-matches-macro
lang: rust
prefix: pat
title: "Use `matches!()` for boolean pattern tests"
severity: should
enforce: tool
tool: clippy::match_like_matches_macro
baseline: latest
status: verified
triggers:
  keywords: ["matches", "macro", "boolean", "pattern", "tests"]
  files: ["**/*.rs"]
  symbols: ["matches"]
related: ["rust-pat-exhaustive-enum", "rust-name-is-has-bool"]
sources:
  - title: "rust-skills: pat-matches-macro"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/pat-matches-macro.md
---
> Use `matches!()` for boolean pattern tests

## Why

`matches!(value, Pattern)` is the idiomatic way to ask "does this value match a pattern?" in a boolean context. Spelling it out as a `match` that returns `true`/`false` is noisy and distracts the reader from the intent. Clippy flags the verbose form with `clippy::match_like_matches_macro`. The macro also supports optional guards, making it useful for range checks and filtered option tests without introducing a binding.

## Bad

```rust
enum Status { Active, Pending, Closed }

fn is_active(s: &Status) -> bool {
    match s {
        Status::Active => true,
        _ => false,
    }
}

fn is_small_digit(n: u32) -> bool {
    match n {
        1..=9 => true,
        _ => false,
    }
}

fn is_positive(opt: Option<i32>) -> bool {
    match opt {
        Some(v) if v > 0 => true,
        _ => false,
    }
}
```

## Good

```rust
enum Status {
    Active,
    Pending,
    Closed,
}

fn is_active(s: &Status) -> bool {
    matches!(s, Status::Active)
}

fn is_small_digit(n: u32) -> bool {
    matches!(n, 1..=9)
}

fn is_positive(opt: Option<i32>) -> bool {
    matches!(opt, Some(v) if v > 0)
}
```

## See Also

- [rust-pat-exhaustive-enum](pat-exhaustive-enum.md) - Match enums exhaustively instead of using catch-all arms
- [rust-name-is-has-bool](name-is-has-bool.md) - Use `is_`, `has_`, `can_` prefixes for boolean methods
