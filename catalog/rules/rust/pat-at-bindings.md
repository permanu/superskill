---
id: rust-pat-at-bindings
lang: rust
prefix: pat
title: "Use `@` bindings to capture a value while matching it against a pattern"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["bindings", "capture", "value", "while", "matching", "against", "pattern"]
  files: ["**/*.rs"]
related: ["rust-pat-exhaustive-enum", "rust-type-enum-states"]
sources:
  - title: "rust-skills: pat-at-bindings"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/pat-at-bindings.md
---
> Use `@` bindings to capture a value while matching it against a pattern

## Why

The `name @ pattern` syntax binds the matched value to `name` and simultaneously tests it against `pattern` in a single arm. Without `@`, you either re-access the original expression (verbose) or add a guard that repeats the condition and re-extracts the value (redundant). `@` bindings make the constraint and the binding a single, readable unit.

## Bad

```rust
fn classify(n: u32) -> String {
    match n {
        1..=9 => format!("single digit: {n}"),
        10..=99 => format!("two digits: {n}"),
        _ => String::from("large"),
    }
}

// More revealing: nested struct field — must re-access after matching range
#[derive(Debug)]
enum Command {
    Move { x: i32, y: i32 },
}

fn validate_move(cmd: &Command) {
    match cmd {
        Command::Move { x, y } if *x >= 0 && *x <= 100 => {
            // x is already bound, so this is fine, but the guard duplicates the range
            println!("valid move to x={x}, y={y}");
        }
        _ => println!("invalid command"),
    }
}
```

## Good

```rust
fn classify(n: u32) -> String {
    match n {
        id @ 1..=9 => format!("single digit: {id}"),
        id @ 10..=99 => format!("two digits: {id}"),
        _ => String::from("large"),
    }
}

// Nested struct field with @ binding
#[derive(Debug)]
enum Command {
    Move { x: i32, y: i32 },
}

fn validate_move(cmd: &Command) {
    match cmd {
        Command::Move { x: x_pos @ 0..=100, y } => {
            println!("valid move to x={x_pos}, y={y}");
        }
        _ => println!("invalid command"),
    }
}

// `x: x_pos @ 0..=100` destructures the `x` field, checks that it falls in `0..=100`, and binds the value to `x_pos` — all in one expression.
```

## See Also

- [rust-pat-exhaustive-enum](pat-exhaustive-enum.md) - Match enums exhaustively to catch new variants
- [rust-type-enum-states](type-enum-states.md) - Use enums for mutually exclusive states
