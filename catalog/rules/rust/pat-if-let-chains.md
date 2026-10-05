---
id: rust-pat-if-let-chains
lang: rust
prefix: pat
title: "Use `if let` chains to combine pattern bindings and conditions"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["let", "chains", "combine", "pattern", "bindings", "conditions"]
  files: ["**/*.rs"]
related: ["rust-pat-let-else", "rust-pat-matches-macro"]
sources:
  - title: "rust-skills: pat-if-let-chains"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/pat-if-let-chains.md
---
> Use `if let` chains to combine pattern bindings and conditions

## Why

If-let chains (stable on the current baseline) let you write a single `if` header that binds multiple patterns and tests arbitrary boolean conditions, all with `&&`. Without chains, each additional binding requires another level of nesting, pushing the happy-path body further right and forcing the reader to track multiple scopes. With chains, all preconditions read left-to-right at the same indentation level.

## Bad

```rust
fn handle(input: Option<String>, limit: Option<u32>) -> Option<String> {
    if let Some(s) = input {
        if let Ok(n) = s.trim().parse::<u32>() {
            if let Some(max) = limit {
                if n <= max {
                    return Some(format!("valid: {n}"));
                }
            }
        }
    }
    None
}
```

## Good

```rust
fn handle(input: Option<String>, limit: Option<u32>) -> Option<String> {
    if let Some(s) = input
        && let Ok(n) = s.trim().parse::<u32>()
        && let Some(max) = limit
        && n <= max
    {
        return Some(format!("valid: {n}"));
    }
    None
}

// Each `&&` clause is evaluated in order; short-circuit semantics still apply, so later clauses only run if earlier ones succeed.
```

## See Also

- [rust-pat-let-else](pat-let-else.md) - Early-return pattern extraction without nesting
- [rust-pat-matches-macro](pat-matches-macro.md) - Boolean pattern tests with `matches!()`
