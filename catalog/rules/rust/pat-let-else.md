---
id: rust-pat-let-else
lang: rust
prefix: pat
title: "Use `let ... else` for early-return pattern extraction"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["let", "else", "early-return", "pattern", "extraction"]
  files: ["**/*.rs"]
related: ["rust-err-question-mark", "rust-anti-unwrap-abuse", "rust-pat-exhaustive-enum"]
sources:
  - title: "rust-skills: pat-let-else"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/pat-let-else.md
---
> Use `let ... else` for early-return pattern extraction

## Why

`let ... else` (stable on the current baseline) binds a pattern in the success path or diverges in the `else` branch. It keeps the happy path at the top indentation level and eliminates rightward drift that accumulates when nesting multiple `if let` blocks. The `else` block must diverge via `return`, `continue`, `break`, or a macro like `panic!` or `bail!`.

## Bad

```rust
fn process(input: Option<String>) -> Option<u32> {
    if let Some(s) = input {
        if let Ok(n) = s.trim().parse::<u32>() {
            if n > 0 {
                return Some(n * 2);
            } else {
                return None;
            }
        } else {
            return None;
        }
    } else {
        return None;
    }
}
```

## Good

```rust
fn process(input: Option<String>) -> Option<u32> {
    let Some(s) = input else { return None; };
    let Ok(n) = s.trim().parse::<u32>() else { return None; };
    if n == 0 {
        return None;
    }
    Some(n * 2)
}

// Multiple extractions stay flat, each guarding against one failure mode before the next line runs.
```

## See Also

- [rust-err-question-mark](err-question-mark.md) - Use `?` for error propagation
- [rust-anti-unwrap-abuse](anti-unwrap-abuse.md) - Avoid `.unwrap()` in production code
- [rust-pat-exhaustive-enum](pat-exhaustive-enum.md) - Match enums exhaustively
