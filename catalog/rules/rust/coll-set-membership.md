---
id: rust-coll-set-membership
lang: rust
prefix: coll
title: "Use `HashSet`/`BTreeSet` for membership tests and dedup, not linear `Vec::contains`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["set", "membership", "hashset", "btreeset", "tests", "dedup", "linear", "vec"]
  files: ["**/*.rs"]
  symbols: ["HashSet", "BTreeSet", "Vec::contains"]
related: ["rust-coll-map-choice", "rust-perf-ahash"]
sources:
  - title: "rust-skills: coll-set-membership"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/coll-set-membership.md
---
> Use `HashSet`/`BTreeSet` for membership tests and dedup, not linear `Vec::contains`

## Why

`Vec::contains` is O(n) per call. When you check membership for m items against a list of n items in a loop, the total cost is O(n × m) — quadratic. A `HashSet` reduces each check to O(1) average, making the same loop O(n + m). Use `BTreeSet` when you also need sorted iteration or range queries. Keep a `Vec` only when order matters, duplicates are intentional, or the collection is so small (say, ≤ 8 items) that the overhead of hashing outweighs the savings.

Deduplication follows the same rule: collecting into a `HashSet` is one line and O(n), while repeatedly removing duplicates from a sorted `Vec` is more code and no faster.

## Bad

```rust
fn find_common(all_users: &[String], active_ids: &[String]) -> Vec<String> {
    let mut common = Vec::new();
    for user in all_users {
        // O(n) per iteration → O(n * m) total
        if active_ids.contains(user) {
            common.push(user.clone());
        }
    }
    common
}

fn deduplicate(items: Vec<String>) -> Vec<String> {
    let mut seen: Vec<String> = Vec::new();
    for item in items {
        // O(n) per item — quadratic overall
        if !seen.contains(&item) {
            seen.push(item);
        }
    }
    seen
}
```

## Good

```rust
use std::collections::{BTreeSet, HashSet};

// O(n + m): build the set once, then each membership test is O(1).
fn find_common(all_users: &[String], active_ids: &[String]) -> Vec<String> {
    let active: HashSet<&String> = active_ids.iter().collect();
    all_users
        .iter()
        .filter(|u| active.contains(u))
        .cloned()
        .collect()
}

// Dedup while preserving order: track seen items in a HashSet.
fn deduplicate_ordered(items: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::with_capacity(items.len());
    items.into_iter().filter(|s| seen.insert(s.clone())).collect()
}

// Dedup into a sorted, unique collection: use BTreeSet.
fn unique_sorted(items: Vec<String>) -> Vec<String> {
    items.into_iter().collect::<BTreeSet<_>>().into_iter().collect()
}
```

## See Also

- [rust-coll-map-choice](coll-map-choice.md) - choosing between `HashMap`, `BTreeMap`, and `IndexMap`
- [rust-perf-ahash](perf-ahash.md) - Swap in a faster hasher for non-adversarial sets
