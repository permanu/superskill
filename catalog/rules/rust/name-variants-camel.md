---
id: rust-name-variants-camel
lang: rust
prefix: name
title: "Use `UpperCamelCase` for enum variants"
severity: should
enforce: tool
tool: rustc::non_camel_case_types
baseline: latest
status: verified
triggers:
  keywords: ["variants", "camel", "uppercamelcase", "enum"]
  files: ["**/*.rs"]
  symbols: ["UpperCamelCase"]
related: ["rust-name-types-camel", "rust-api-non-exhaustive", "rust-type-enum-states"]
sources:
  - title: "rust-skills: name-variants-camel"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-variants-camel.md
---
> Use `UpperCamelCase` for enum variants

## Why

Enum variants follow the same naming convention as types—`UpperCamelCase`. This distinguishes them from fields, variables, and functions. The compiler warns on violations, and consistent naming helps readers instantly recognize variant names.

## Bad

```rust
enum Status {
    pending,       // warning: variant `pending` should have an upper camel case name
    in_progress,   // warning
    COMPLETED,     // Not idiomatic
}

enum Color {
    RED,           // Screaming case - not Rust style
    GREEN,
    BLUE,
}
```

## Good

```rust
enum Status {
    Pending,
    InProgress,
    Completed,
    Failed,
}

enum Color {
    Red,
    Green,
    Blue,
    Custom(u8, u8, u8),
}

enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
    Patch,
}
```

## See Also

- [rust-name-types-camel](name-types-camel.md) - Type naming
- [rust-api-non-exhaustive](api-non-exhaustive.md) - Forward-compatible enums
- [rust-type-enum-states](type-enum-states.md) - State machine enums
