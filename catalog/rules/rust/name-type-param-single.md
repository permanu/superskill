---
id: rust-name-type-param-single
lang: rust
prefix: name
title: "Use single uppercase letters for type parameters: `T`, `E`, `K`, `V`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["type", "param", "single", "uppercase", "letters", "parameters"]
  files: ["**/*.rs"]
related: ["rust-name-lifetime-short", "rust-name-types-camel", "rust-type-generic-bounds"]
sources:
  - title: "rust-skills: name-type-param-single"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-type-param-single.md
---
> Use single uppercase letters for type parameters: `T`, `E`, `K`, `V`

## Why

Generic type parameters conventionally use single uppercase letters. This keeps signatures concise and follows established conventions that readers instantly recognize. `T` for "type", `E` for "error", `K` for "key", `V` for "value" are universal in Rust.

## Bad

```rust
// Verbose type parameters
struct Container<ElementType> {
    items: Vec<ElementType>,
}

fn process<InputType, OutputType>(input: InputType) -> OutputType
where
    InputType: Into<OutputType>,
{
    input.into()
}

// Lowercase - looks like lifetime
struct Wrapper<t> {
    value: t,
}
```

## Good

```rust
// Single uppercase letters
struct Container<T> {
    items: Vec<T>,
}

fn process<I, O>(input: I) -> O
where
    I: Into<O>,
{
    input.into()
}

// Standard conventions
struct HashMap<K, V> {      // K=Key, V=Value
    key: K,
    value: V,
}
enum Result<T, E> {         // T=Type, E=Error
    Ok(T),
    Err(E),
}
struct Ref<'a, T> {         // Lifetime + Type
    value: &'a T,
}
```

## See Also

- [rust-name-lifetime-short](name-lifetime-short.md) - Lifetime parameter naming
- [rust-name-types-camel](name-types-camel.md) - Concrete type naming
- [rust-type-generic-bounds](type-generic-bounds.md) - Trait bounds
