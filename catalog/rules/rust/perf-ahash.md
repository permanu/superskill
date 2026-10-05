---
id: rust-perf-ahash
lang: rust
prefix: perf
title: "Use a faster hasher (`ahash` / `FxHashMap`) when DoS resistance is not needed"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["ahash", "faster", "hasher", "fxhashmap", "dos", "resistance"]
  files: ["**/*.rs"]
  symbols: ["ahash", "FxHashMap"]
related: ["rust-perf-entry-api", "rust-perf-profile-first", "rust-mem-with-capacity"]
sources:
  - title: "rust-skills: perf-ahash"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-ahash.md
---
> Use a faster hasher (`ahash` / `FxHashMap`) when DoS resistance is not needed

## Why

Rust's default `HashMap` uses SipHash-1-3, which is DoS-resistant (hash flooding attacks on external input are not viable) but roughly 2–4× slower than non-cryptographic hashers on typical integer and short-string keys. For internal maps keyed by compiler-generated IDs, integer handles, or other trusted data, switching to a faster hasher can meaningfully reduce CPU time in hot map-heavy code. The wrong choice here is a security bug, not just a performance one — never use a non-DoS-resistant hasher for maps keyed by untrusted external input (user-supplied strings, network data, file paths from untrusted sources).

## Bad

```rust
use std::collections::HashMap;

// Using the default SipHash hasher for compiler-internal integer keys —
// DoS resistance is wasted cost here.
fn build_id_map(ids: &[(u32, String)]) -> HashMap<u32, String> {
    ids.iter().cloned().collect()
}
```

## Good

```rust
// ahash: randomized seed, DoS-resistant, ~2x faster than SipHash.
use ahash::AHashMap;

fn build_id_map_ahash(ids: &[(u32, String)]) -> AHashMap<u32, String> {
    ids.iter().cloned().collect()
}

// FxHashMap (rustc-hash): fastest option, but uses a predictable hash.
// Only for trusted integer or pointer keys (compiler internals, in-process caches).
use rustc_hash::{FxBuildHasher, FxHashMap};

fn build_node_map(nodes: &[(u32, String)]) -> FxHashMap<u32, String> {
    let mut map = FxHashMap::with_capacity_and_hasher(nodes.len(), Default::default());
    map.extend(nodes.iter().cloned());
    map
}

// Convenient type alias to avoid repeating the hasher parameter
use std::collections::HashMap;

type FastMap<K, V> = HashMap<K, V, FxBuildHasher>;

fn fast_map_example() -> FastMap<u32, u64> {
    FastMap::with_capacity_and_hasher(64, FxBuildHasher)
}
```

## See Also

- [rust-perf-entry-api](perf-entry-api.md) - avoid redundant lookups with the entry API
- [rust-perf-profile-first](perf-profile-first.md) - Profile before optimizing
- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocate collections when size is known
