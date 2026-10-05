---
id: rust-coll-map-choice
lang: rust
prefix: coll
title: "Pick the map by access pattern: `HashMap` (fast, unordered), `BTreeMap` (sorted / range queries), `IndexMap` (insertion order)"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["map", "choice", "pick", "access", "pattern", "hashmap", "fast", "unordered"]
  files: ["**/*.rs"]
  symbols: ["HashMap", "BTreeMap", "IndexMap"]
related: ["rust-perf-ahash", "rust-perf-entry-api", "rust-coll-seq-choice"]
sources:
  - title: "rust-skills: coll-map-choice"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/coll-map-choice.md
---
> Pick the map by access pattern: `HashMap` (fast, unordered), `BTreeMap` (sorted / range queries), `IndexMap` (insertion order)

## Why

`HashMap` is the right default: O(1) average lookup and insertion with no ordering overhead. `BTreeMap` keeps keys sorted in a B-tree, enabling efficient range queries and ordered iteration at the cost of O(log n) operations. The `indexmap` crate's `IndexMap` preserves insertion order with O(1) average lookup — valuable for deterministic output, config files, or any API where output order must match input order. Choosing the wrong map wastes CPU cycles on sorting you don't need or forces you to sort after the fact.

## Bad

```rust
use std::collections::HashMap;

fn word_counts(text: &str) -> HashMap<&str, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word).or_insert(0) += 1;
    }
    counts
    // Iterating this for a report produces random order every run.
    // Caller has to sort externally — meaning repeated, avoidable work.
}

fn main() {
    let counts = word_counts("the quick brown fox jumps over the lazy dog");
    // Non-deterministic output: order changes between runs.
    for (word, count) in &counts {
        println!("{word}: {count}");
    }
}
```

## Good

```rust
use std::collections::{BTreeMap, HashMap};
use indexmap::IndexMap;

fn total_scores<'a>(records: &[(&'a str, u32)]) -> HashMap<&'a str, u32> {
    let mut scores = HashMap::new();
    for &(name, score) in records {
        *scores.entry(name).or_insert(0) += score;
    }
    scores
}
fn events_in_range(log: &BTreeMap<u64, String>, start: u64, end: u64) -> Vec<(&u64, &String)> {
    log.range(start..=end).collect() // only possible with sorted keys
}
fn parse_config(pairs: &[(&str, &str)]) -> IndexMap<String, String> {
    pairs.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect()
    // insertion order preserved for deterministic output
}

fn main() {
    let scores = total_scores(&[("a", 1), ("b", 2)]);
    let log: BTreeMap<u64, String> = [(1_000, "start".to_string())].into();
    let window = events_in_range(&log, 1_000, 2_500);
    let cfg = parse_config(&[("host", "localhost"), ("port", "8080")]);
    let _ = (scores.get("a"), window, cfg.get("host"));
}
```

## See Also

- [rust-perf-ahash](perf-ahash.md) - Swap in a faster hasher for non-adversarial maps
- [rust-perf-entry-api](perf-entry-api.md) - Use `entry()` to avoid double lookups
- [rust-coll-seq-choice](coll-seq-choice.md) - Choosing the right sequence type
