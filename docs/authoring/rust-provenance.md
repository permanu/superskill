# Rust Rules — Provenance & Adaptation Notes

**Date:** 2026-10-04
**Scope:** `catalog/rules/rust/**` (265 rules + `INDEX.md`)
**Status of all rules:** `draft` — content pending adversarial verification (CONTRACT.md §7, §13)

## Upstream

- **Repository:** https://github.com/leonardomso/rust-skills
- **Commit:** `fd2a861ab0406a4ac536a55274d14ea6fd1ca9c9` (`git clone --depth 1`, master)
- **Pack:** 265 rules across 26 categories, upstream version 1.5.1
- **License:** MIT. The upstream `SKILL.md` declares `license: MIT`; the repository `LICENSE` file is the MIT license. The adaptation preserves upstream rule text (Why/Bad/Good/See Also); attribution is kept via the first source entry of every rule (`https://github.com/leonardomso/rust-skills/blob/master/rules/<file>`) and this document.

## Deliverables

- `catalog/rules/rust/<prefix>-<name>.md` — one file per upstream rule, same file name as upstream.
- `catalog/rules/rust/INDEX.md` — all 265 rules grouped by prefix, `Baseline: latest`, `Rules: 265 (verified: 0)`.
- This document.

Baseline policy: every rule uses `baseline: latest` (literal). No version numbers are pinned anywhere, per CONTRACT.md §8 (latest-stable policy).

## Adaptation method (mechanical)

A deterministic script transformed each upstream `rules/*.md` file:

1. **Frontmatter** derived per contract:
   - `id: rust-<prefix>-<name>` from the file name; `lang: rust`; `prefix` from the file-name prefix (26 declared prefixes: `own err mem unsafe api async conc opt num type trait conv const serde pat macro closure coll name test doc obs perf proj lint anti`).
   - `title` = upstream `>` summary (all ≤ 27 words; none shortened).
   - `severity`: `must` for unsafe/UB/data-loss/correctness rules (24), `prefer` for tuning/taste rules (20), `should` otherwise (221). The explicit must/prefer lists are in the transform script used for this batch.
   - `enforce: tool` + `tool` id when a clippy lint is named in the summary or `Why It Matters` (11 rules), plus three non-clippy tool cases: `lint-missing-docs` → `rustc::missing_docs`, `lint-cfg-check` → `rustc::unexpected_cfgs`, `lint-rustfmt-check` → `rustfmt`. All other rules are `enforce: review` (252).
   - `triggers.keywords` 3–8 words from file name + summary; `triggers.files: ["**/*.rs"]`; `triggers.symbols` from summary code spans when obvious.
   - `related`: upstream See Also targets mapped to `rust-<prefix>-<name>` ids, only when the target exists (777 links; 234 distinct targets).
   - `sources`: first source is the upstream file URL; additional entries are external URLs that already existed in the upstream rule body (11 rules; 276 source entries total). Placeholder URLs found only inside example code (example.com, `github.com/user/...`, `docs.rs/my-crate`, …) were excluded as noise.
2. **Body**: `## Why` = upstream `## Why It Matters` verbatim; `## Bad` / `## Good` = upstream sections with all fenced blocks merged into a single `rust` fence; `## See Also` = normalized ids with upstream relation clauses. Other upstream sections (Key Points, Caveats, Evidence, …) were not carried over — the contract's body order admits only Why/Bad/Good/See Also.
3. **Fence normalization:** every Bad/Good section contains exactly one `rust` fence. Non-Rust blocks (toml/yaml/bash/text/file trees) and prose inside Bad/Good are embedded as `//` comments inside that fence, so upstream bytes are preserved while the contract shape holds. Empty-language fences whose content is Rust (doc-comment fragments) are kept as code; inner fences inside doc comments (`/// ``` `) are left in place.
4. **See Also** links were rewritten from `./file.md` to `file.md` and the link text to the `rust-…` id; clauses are upstream text.

## Section fallbacks (rules without upstream Bad and/or Good)

19 rules lack canonical `## Bad` / `## Good` sections; content was taken from the closest upstream section, listed here for the verifier:

| rule | Bad source | Good source |
|---|---|---|
| lint-cargo-metadata | What It Catches | Configuration |
| lint-deny-correctness | What It Catches | Setup |
| lint-missing-docs | What It Catches | (upstream Good) |
| lint-rustfmt-check | Ignoring Files | CI Configuration |
| lint-warn-complexity / perf / style / suspicious | What It Catches | Configuration |
| opt-likely-hint | Nightly: std::hint | Stable Rust: Code Structure Hints |
| opt-simd-portable | Platform-Specific (When Needed) | Autovectorization (Stable) |
| perf-release-profile | Default Profile | Optimized Profile |
| proj-mod-rs-dir | Adjacent File Benefits | mod.rs Benefits |
| name-iter-convention / name-iter-type-match | (upstream Bad) | Implementation |
| perf-collect-into | (upstream Bad) | Good (Stable: extend) |

Four rules had no anti-example upstream; a minimal Bad snippet was written for this adaptation (disclosed, still `draft`): `opt-pgo-profile`, `test-criterion-bench`, `test-mockall-mocking`, `test-proptest-properties`.

## Verification state

- Deterministic structural self-check passed on all 266 files: frontmatter fields, id/path match, `baseline: latest`, `status: draft`, section order, exactly one `rust` fence in Bad and Good, all `related` targets resolve, INDEX ↔ directory parity, 265 index entries.
- **Compile sample (local toolchain `rustc 1.94.0`, `--edition 2024`):** 30 of 60 sampled snippets (30 rules × Bad+Good) compiled as standalone lib crates. Failures are the expected upstream classes, not transform damage:
  - function-body fragments / undefined local items (`handle`, `Config`, `State`, `MyCollection`, `Data`; top-level `let`/`for`/`match` statements);
  - external crates (`serde`, `tokio`, `criterion`, `proptest`, `indexmap`, `thiserror`) not available without dependencies;
  - upstream `...` elisions (`name-funcs-snake`, `name-types-camel`);
  - `unsafe-no-mangle-unsafe` Bad deliberately shows pre-2024 bare attributes, which do not compile on edition 2024;
  - `lint-deny-correctness` Good embeds TOML lines inside an upstream `rust` fence (kept verbatim).
- The local toolchain is 1.94; upstream targets newer stable (1.98 at adaptation time). Examples relying on APIs stabilized after 1.94 are unchecked and remain `draft`, per CONTRACT.md §8.

## Known debt before verification

- Upstream snippets are illustrative fragments; 63 files contain `...` elisions and many reference items defined elsewhere in the same rule. Contract anti-slop rules (§12) are not yet met for those snippets.
- Config-oriented lint rules (`lint-rustfmt-check`, `opt-pgo-profile`, `opt-lto-release`, …) carry YAML/TOML content as Rust comments; the verifier may prefer a different rendering.
- `sources` are upstream-centric: most rules cite only the upstream file. Primary-source mapping (Rust Reference, API Guidelines, Clippy docs, Rustonomicon, etc.) is verification work.
- No rule is `verified`; the adversarial verifier must re-derive severity, enforce/tool, and related links.
