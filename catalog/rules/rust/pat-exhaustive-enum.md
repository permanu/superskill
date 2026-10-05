---
id: rust-pat-exhaustive-enum
lang: rust
prefix: pat
title: "Match owned enums exhaustively; avoid catch-all `_` that hides new variants"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["exhaustive", "enum", "match", "owned", "enums", "exhaustively", "catch-all", "hides"]
  files: ["**/*.rs"]
related: ["rust-api-non-exhaustive", "rust-type-enum-states", "rust-pat-matches-macro"]
sources:
  - title: "rust-skills: pat-exhaustive-enum"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/pat-exhaustive-enum.md
---
> Match owned enums exhaustively; avoid catch-all `_` that hides new variants

## Why

A `_ =>` wildcard arm silently absorbs any variant added to an enum you own, converting what should be a compile-time error into a silent runtime no-op. Exhaustive matches let the compiler act as a checklist: add a variant, get a build failure everywhere it is unhandled. Reserve `_` and `..` for **foreign** `#[non_exhaustive]` enums, where the language requires a catch-all, and document why it is necessary.

## Bad

```rust
#[derive(Debug)]
enum Status {
    Active,
    Pending,
    Closed,
}

fn describe(s: &Status) -> &'static str {
    match s {
        Status::Active => "active",
        _ => "inactive", // hides Status::Pending silently; adding a new variant goes unnoticed
    }
}

// If `Status::Suspended` is later added, `describe` compiles and silently returns `"inactive"` for it — a logic bug the compiler never catches.
```

## Good

```rust
#[derive(Debug)]
enum Status {
    Active,
    Pending,
    Closed,
}

fn describe(s: &Status) -> &'static str {
    match s {
        Status::Active => "active",
        Status::Pending => "pending",
        Status::Closed => "closed",
        // Adding Status::Suspended now causes a compile error here — intended.
    }
}
```

## See Also

- [rust-api-non-exhaustive](api-non-exhaustive.md) - use `#[non_exhaustive]` for future-proof enums in public APIs
- [rust-type-enum-states](type-enum-states.md) - Use enums for mutually exclusive states
- [rust-pat-matches-macro](pat-matches-macro.md) - Boolean pattern tests with `matches!()`
