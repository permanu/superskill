---
id: rust-name-iter-convention
lang: rust
prefix: name
title: "Use iter/iter_mut/into_iter for iterator methods"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["iter", "convention", "iter_mut", "into_iter", "iterator", "methods"]
  files: ["**/*.rs"]
related: ["rust-name-iter-type-match", "rust-perf-iter-over-index"]
sources:
  - title: "rust-skills: name-iter-convention"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-iter-convention.md
---
> Use iter/iter_mut/into_iter for iterator methods

## Why

Rust has a standard convention for iterator method names that signals ownership semantics. Following this convention makes APIs predictable and enables the `for item in collection` syntax to work correctly.

## Bad

```rust
struct MyCollection<T> {
    items: Vec<T>,
}

impl<T> MyCollection<T> {
    // Non-standard names
    fn elements(&self) -> impl Iterator<Item = &T> { self.items.iter() }      // Should be iter()
    fn get_items(&self) -> impl Iterator<Item = &T> { self.items.iter() }     // Should be iter()
    fn iterate(&self) -> impl Iterator<Item = &T> { self.items.iter() }       // Should be iter()
    fn as_iter(&self) -> impl Iterator<Item = &T> { self.items.iter() }       // Should be iter()
    fn to_iter(self) -> impl Iterator<Item = T> { self.items.into_iter() }    // Should be into_iter()
}
```

## Good

```rust
struct MyCollection<T> { items: Vec<T> }

impl<T> MyCollection<T> {
    fn iter(&self) -> impl Iterator<Item = &T> { self.items.iter() }
    fn iter_mut(&mut self) -> impl Iterator<Item = &mut T> { self.items.iter_mut() }
}

// IntoIterator provides into_iter()
impl<T> IntoIterator for MyCollection<T> {
    type Item = T;
    type IntoIter = std::vec::IntoIter<T>;
    fn into_iter(self) -> Self::IntoIter { self.items.into_iter() }
}

// Also implement for references
impl<'a, T> IntoIterator for &'a MyCollection<T> {
    type Item = &'a T;
    type IntoIter = std::slice::Iter<'a, T>;
    fn into_iter(self) -> Self::IntoIter { self.items.iter() }
}
impl<'a, T> IntoIterator for &'a mut MyCollection<T> {
    type Item = &'a mut T;
    type IntoIter = std::slice::IterMut<'a, T>;
    fn into_iter(self) -> Self::IntoIter { self.items.iter_mut() }
}
```

## See Also

- [rust-name-iter-type-match](name-iter-type-match.md) - Iterator type naming
- [rust-api-common-traits](api-common-traits.md) - Implementing `IntoIterator` and other common traits
- [rust-perf-iter-over-index](perf-iter-over-index.md) - Prefer iterators
