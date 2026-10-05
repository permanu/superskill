---
id: rust-name-types-camel
lang: rust
prefix: name
title: "Use `UpperCamelCase` for types, traits, and enum names"
severity: should
enforce: tool
tool: rustc::non_camel_case_types
baseline: latest
status: verified
triggers:
  keywords: ["types", "camel", "uppercamelcase", "traits", "enum", "names"]
  files: ["**/*.rs"]
  symbols: ["UpperCamelCase"]
related: ["rust-name-variants-camel", "rust-name-funcs-snake", "rust-name-acronym-word"]
sources:
  - title: "rust-skills: name-types-camel"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-types-camel.md
---
> Use `UpperCamelCase` for types, traits, and enum names

## Why

Rust's naming conventions are enforced by the compiler and linter. Consistent naming makes code immediately recognizable—you know `HttpClient` is a type, `send_request` is a function. Violating conventions triggers warnings and makes code harder to read.

## Bad

```rust
// Lowercase types - compiler warns
struct http_client {}  // warning: type `http_client` should have an upper camel case name
trait serializable {}  // warning
enum response_type {}  // warning

// Screaming case for types
struct HTTP_CLIENT {}  // Not idiomatic
```

## Good

```rust
// UpperCamelCase for all types
struct HttpClient {}
trait Serializable {}
enum ResponseType {}

// Compound words
struct TcpConnection {}
struct IoError {}
struct FileReader {}

// Generic types
struct HashMap<K, V> {
    key: K,
    value: V,
}
struct Result<T, E> {
    ok: T,
    err: E,
}
```

## See Also

- [rust-name-variants-camel](name-variants-camel.md) - Enum variant naming
- [rust-name-funcs-snake](name-funcs-snake.md) - Function naming
- [rust-name-acronym-word](name-acronym-word.md) - Acronym handling
