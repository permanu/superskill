---
id: rust-proj-pub-super-parent
lang: rust
prefix: proj
title: "Use pub(super) for parent-only visibility"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["pub", "super", "parent", "parent-only", "visibility"]
  files: ["**/*.rs"]
related: ["rust-proj-pub-crate-internal", "rust-proj-pub-use-reexport", "rust-proj-mod-by-feature"]
sources:
  - title: "rust-skills: proj-pub-super-parent"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-pub-super-parent.md
---
> Use pub(super) for parent-only visibility

## Why

`pub(super)` exposes items only to the immediate parent module. This is useful for helper functions and types that submodules share but shouldn't be visible to the rest of the crate.

## Bad

```rust
// src/parser/mod.rs
mod parser {
    pub mod lexer {
        // src/parser/lexer.rs
        pub fn internal_helper() {  // Visible to entire crate!
            // Helper only needed by lexer and ast
        }

        pub(crate) struct Token {  // Visible to entire crate
            // Only parser submodules need this
        }
    }

    pub mod ast {}
}
```

## Good

```rust
// src/parser/mod.rs
mod parser {
    pub(super) struct Token { pub(super) kind: TokenKind, pub(super) span: Span }
    pub(super) fn shared_helper() -> Token { Token { kind: TokenKind, span: Span } }

    pub mod lexer {
        use super::{shared_helper, Token};
        pub fn lex(input: &str) -> Vec<Token> {
            let _ = input;
            let _token = shared_helper();
            Vec::new()
        }
    }
    pub mod ast {
        use super::{Ast, Token};
        pub fn parse(tokens: Vec<Token>) -> Ast {
            let _ = tokens;
            Ast
        }
    }

    pub struct Ast;
    pub struct TokenKind;
    pub struct Span;
}
```

## See Also

- [rust-proj-pub-crate-internal](proj-pub-crate-internal.md) - Crate visibility
- [rust-proj-pub-use-reexport](proj-pub-use-reexport.md) - Re-export patterns
- [rust-proj-mod-by-feature](proj-mod-by-feature.md) - Feature organization
