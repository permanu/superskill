---
id: rust-api-impl-fromiterator
lang: rust
prefix: api
title: "Implement `FromIterator` and `Extend` for collection types, and `IntoIterator` for all three reference forms"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["impl", "fromiterator", "implement", "extend", "collection", "types", "intoiterator", "three"]
  files: ["**/*.rs"]
  symbols: ["FromIterator", "Extend", "IntoIterator"]
related: ["rust-name-iter-convention", "rust-api-common-traits"]
sources:
  - title: "rust-skills: api-impl-fromiterator"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-impl-fromiterator.md
---
> Implement `FromIterator` and `Extend` for collection types, and `IntoIterator` for all three reference forms

## Why

The Rust API Guidelines (C-COLLECT) require that collection types implement `FromIterator<T>` so that `iter.collect::<MyCollection<T>>()` works. Pairing it with `Extend<T>` enables efficient batch insertion — the standard library uses `Extend` internally in `collect` when extending an existing collection. Implementing `IntoIterator` for the type itself, for `&Type`, and for `&mut Type` rounds out the contract and lets the collection participate in `for` loops and iterator adapter chains. Skipping these traits forces callers into awkward manual loops and breaks generic code.

## Bad

```rust
struct Bag<T>(Vec<T>);

impl<T> Bag<T> {
    fn new() -> Self { Bag(Vec::new()) }

    fn push(&mut self, item: T) { self.0.push(item); }
}

fn main() {
    // Callers must loop manually — no collect(), no extend(), no for loop
    let mut b = Bag::new();
    for x in [1, 2, 3] {
        b.push(x);
    }
}
```

## Good

```rust
struct Bag<T>(Vec<T>);

impl<T> FromIterator<T> for Bag<T> {
    fn from_iter<I: IntoIterator<Item = T>>(iter: I) -> Self { Bag(iter.into_iter().collect()) }
}

impl<T> Extend<T> for Bag<T> {
    fn extend<I: IntoIterator<Item = T>>(&mut self, iter: I) { self.0.extend(iter); }
}

impl<T> IntoIterator for Bag<T> {
    type Item = T;
    type IntoIter = std::vec::IntoIter<T>;
    fn into_iter(self) -> Self::IntoIter { self.0.into_iter() }
}
impl<'a, T> IntoIterator for &'a Bag<T> {
    type Item = &'a T;
    type IntoIter = std::slice::Iter<'a, T>;
    fn into_iter(self) -> Self::IntoIter { self.0.iter() }
}
impl<'a, T> IntoIterator for &'a mut Bag<T> {
    type Item = &'a mut T;
    type IntoIter = std::slice::IterMut<'a, T>;
    fn into_iter(self) -> Self::IntoIter { self.0.iter_mut() }
}
```

## See Also

- [rust-name-iter-convention](name-iter-convention.md) - `iter`/`iter_mut`/`into_iter` method naming
- [rust-api-common-traits](api-common-traits.md) - implement `Debug`, `Clone`, `PartialEq` eagerly
