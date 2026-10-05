---
id: rust-macro-fragment-specifiers
lang: rust
prefix: macro
title: "Capture with precise fragment specifiers, not raw `:tt`, where you can"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["fragment", "specifiers", "capture", "precise", "raw"]
  files: ["**/*.rs"]
related: ["rust-macro-rules-hygiene", "rust-macro-prefer-functions"]
sources:
  - title: "rust-skills: macro-fragment-specifiers"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/macro-fragment-specifiers.md
---
> Capture with precise fragment specifiers, not raw `:tt`, where you can

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates that re-expanding `:tt` soup in expression position fails at expansion: `expected expression, found let statement`).

Fragment specifiers tell the compiler — and readers — exactly what syntactic category a macro arm expects. They produce targeted error messages ("expected expression" instead of "no rules expected token"), enable better IDE tooling, and prevent ambiguous parses. Using raw `:tt` (token tree) forces you to re-parse or validate by hand and leaks implementation details into error messages.

Note the **follow-set restriction**: after `:expr`, `:ty`, `:pat`, and a few others, only a limited set of tokens may appear — most commonly `=>`, `,`, `;`, `|`, or another fragment. Plan your separator tokens accordingly.

## Bad

```rust
// Slurping everything as :tt, then trying to use $e as if it were an expression.
macro_rules! debug_val {
    ($($t:tt)*) => {
        println!("{} = {:?}", stringify!($($t)*), $($t)*);
        //                                          ^^^^^^^^ re-expanding :tt soup
    };
}

fn main() {
    debug_val!(1 + 2);      // works by accident
    debug_val!(let x = 1);  // accepted by the macro; blows up at expansion
}
```

## Good

```rust
macro_rules! debug_val {
    // :expr captures a single expression; the follow-set allows `=>` and `,` after it.
    ($e:expr) => {
        println!("{} = {:?}", stringify!($e), $e);
    };
}

fn main() {
    debug_val!(1 + 2);
    // debug_val!(let x = 1); // now correctly rejected at the macro call site
}
```

## See Also

- [rust-macro-rules-hygiene](macro-rules-hygiene.md) - Hygiene and `$crate` for declarative macros
- [rust-macro-prefer-functions](macro-prefer-functions.md) - When a function is a better choice
