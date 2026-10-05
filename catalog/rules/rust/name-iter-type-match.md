---
id: rust-name-iter-type-match
lang: rust
prefix: name
title: "Name iterator types after their source method"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["iter", "type", "match", "name", "iterator", "types", "source", "method"]
  files: ["**/*.rs"]
related: ["rust-name-iter-convention", "rust-api-common-traits"]
sources:
  - title: "rust-skills: name-iter-type-match"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-iter-type-match.md
---
> Name iterator types after their source method

## Why

Iterator types should match the method that creates them. `iter()` returns `Iter`, `into_iter()` returns `IntoIter`, `keys()` returns `Keys`. This naming pattern is established by the standard library and makes types predictable.

## Bad

```rust
// Mismatched names
struct MyCollection<K, V> {
    keys: Vec<K>,
    values: Vec<V>,
}

impl<K, V> MyCollection<K, V> {
    fn iter(&self) -> MyCollectionIterator<'_, V> {   // Should be Iter
        MyCollectionIterator { inner: self.values.iter() }
    }
    fn keys(&self) -> KeyIterator<'_, K> {            // Should be Keys
        KeyIterator { inner: self.keys.iter() }
    }
}

// Generic names that collide with std types
pub struct Iterator<T> { value: T }
pub struct I<T> { value: T }
struct MyCollectionIterator<'a, T> {
    inner: std::slice::Iter<'a, T>,
}

struct KeyIterator<'a, K> {
    inner: std::slice::Iter<'a, K>,
}
```

## Good

```rust
pub struct MyCollection<T> {
    items: Vec<T>,
}

// Iterator types named after the methods that create them
pub struct Iter<'a, T> { inner: std::slice::Iter<'a, T> }
pub struct IterMut<'a, T> { inner: std::slice::IterMut<'a, T> }
pub struct IntoIter<T> { inner: std::vec::IntoIter<T> }
impl<T> Iterator for IntoIter<T> { type Item = T; fn next(&mut self) -> Option<T> { self.inner.next() } }
impl<T> MyCollection<T> {
    pub fn iter(&self) -> Iter<'_, T> {
        Iter { inner: self.items.iter() }
    }
    pub fn iter_mut(&mut self) -> IterMut<'_, T> {
        IterMut { inner: self.items.iter_mut() }
    }
}

impl<T> IntoIterator for MyCollection<T> {
    type Item = T;
    type IntoIter = IntoIter<T>;
    fn into_iter(self) -> IntoIter<T> {
        IntoIter { inner: self.items.into_iter() }
    }
}
```

## See Also

- [rust-name-iter-convention](name-iter-convention.md) - Iter/iter_mut/into_iter
- [rust-api-common-traits](api-common-traits.md) - Implementing common traits
