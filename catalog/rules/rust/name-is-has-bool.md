---
id: rust-name-is-has-bool
lang: rust
prefix: name
title: "Use `is_`, `has_`, `can_`, `should_` prefixes for boolean-returning methods"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["bool", "is_", "has_", "can_", "should_", "prefixes", "boolean-returning", "methods"]
  files: ["**/*.rs"]
  symbols: ["is_", "has_", "can_", "should_"]
related: ["rust-name-no-get-prefix", "rust-name-funcs-snake", "rust-api-must-use"]
sources:
  - title: "rust-skills: name-is-has-bool"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-is-has-bool.md
---
> Use `is_`, `has_`, `can_`, `should_` prefixes for boolean-returning methods

## Why

Boolean methods answer yes/no questions. Prefixes like `is_`, `has_`, `can_` make the question explicit, so code reads naturally: `if user.is_active()`, `if buffer.has_remaining()`. Without prefixes, boolean methods are ambiguous and require reading documentation.

## Bad

```rust
struct User;

impl User {
    // Unclear: does this check or set?
    fn active(&self) -> bool {
        false
    }
    
    // Unclear: does this delete or check?
    fn deleted(&self) -> bool {
        false
    }
    
    // Unclear return type
    fn admin(&self) -> bool {
        false
    }
}

fn main() {
    let user = User;

    // Reading code is confusing
    if user.active() {}  // Is this checking or activating?
}
```

## Good

```rust
struct User;

enum Permission {
    Write,
}

impl User {
    fn is_active(&self) -> bool { true }
    fn is_deleted(&self) -> bool { false }
    fn is_admin(&self) -> bool { false }
    fn has_permission(&self, perm: Permission) -> bool { matches!(perm, Permission::Write) }
    fn can_edit(&self) -> bool { self.is_admin() || self.has_permission(Permission::Write) }
}

fn main() {
    let user = User;
    // Reads naturally
    if user.is_active() && user.has_permission(Permission::Write) {
        println!("editing allowed");
    }
}
```

## See Also

- [rust-name-no-get-prefix](name-no-get-prefix.md) - Getter naming
- [rust-name-funcs-snake](name-funcs-snake.md) - Function naming
- [rust-api-must-use](api-must-use.md) - Boolean functions should be checked
