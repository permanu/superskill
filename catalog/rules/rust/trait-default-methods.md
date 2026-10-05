---
id: rust-trait-default-methods
lang: rust
prefix: trait
title: "Define a trait in terms of a few required methods plus defaulted ones built on top of them"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["default", "methods", "define", "trait", "terms", "few", "required", "plus"]
  files: ["**/*.rs"]
related: ["rust-api-extension-trait", "rust-trait-associated-type-vs-generic", "rust-trait-blanket-impl"]
sources:
  - title: "rust-skills: trait-default-methods"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/trait-default-methods.md
---
> Define a trait in terms of a few required methods plus defaulted ones built on top of them

## Why

A trait with only required methods places the full implementation burden on every consumer. Providing default method bodies — as `std::iter::Iterator` does, building `map`, `filter`, `fold`, and dozens more on a single required `next` — means implementors write only the essential logic and receive the rest for free. Defaults also act as documentation: they show the canonical relationship between methods. Implementors can still override a default for performance (e.g., `Iterator::count` overridden by `std::vec::IntoIter` to avoid iterating) without changing the observable contract.

## Bad

```rust
// Every implementor must manually implement all three methods,
// even though two of them are mechanical compositions of the first.
trait Summarise {
    fn sentences(&self) -> Vec<String>;
    fn first_sentence(&self) -> Option<String>;  // always just sentences().into_iter().next()
    fn word_count(&self) -> usize;               // always sentences().join(" ").split_whitespace().count()
}

struct Article { body: String }

impl Summarise for Article {
    fn sentences(&self) -> Vec<String> {
        self.body.split('.').map(str::trim).map(str::to_owned).collect()
    }
    // Duplicated logic — must be kept in sync across every implementor.
    fn first_sentence(&self) -> Option<String> {
        self.sentences().into_iter().next()
    }
    fn word_count(&self) -> usize {
        self.sentences().join(" ").split_whitespace().count()
    }
}
```

## Good

```rust
trait Summarise {
    // Required: the only method implementors must provide
    fn sentences(&self) -> Vec<String>;
    // Defaulted: free for all implementors
    fn first_sentence(&self) -> Option<String> { self.sentences().into_iter().next() }

    fn word_count(&self) -> usize { self.sentences().join(" ").split_whitespace().count() }
}

// Minimal impl — one method, the rest come for free.
struct Article { body: String }
impl Summarise for Article {
    fn sentences(&self) -> Vec<String> {
        self.body.split('.').map(str::trim).map(str::to_owned).collect()
    }
}

// Override a default when a better implementation exists.
struct PreSplit { parts: Vec<String> }
impl Summarise for PreSplit {
    fn sentences(&self) -> Vec<String> { self.parts.clone() }
    fn word_count(&self) -> usize {
        self.parts.iter().flat_map(|s| s.split_whitespace()).count()
    }
}
```

## See Also

- [rust-api-extension-trait](api-extension-trait.md) - Add methods to foreign types via extension traits
- [rust-trait-associated-type-vs-generic](trait-associated-type-vs-generic.md) - Choose between associated types and generic parameters
- [rust-trait-blanket-impl](trait-blanket-impl.md) - Give behaviour to every type meeting a bound
