# Atomic Rules — Deterministic Validator

**Owner:** `src/rules/` — spec: [`CONTRACT.md`](./CONTRACT.md) v1.0+.
The validator is the deterministic gate every rule passes before an independent
verifier looks at it. It checks structure, sourcing, anti-slop, index coverage,
and (by default) compiles both code snippets with the local toolchains.

## Usage

```bash
node dist/rules/cli.js validate [--lang <lang>] [--json] [--no-compile]
```

- `--lang <lang>` — validate one pack (`rust typescript python go swift java c cpp`).
- `--json` — print the raw `ValidationReport` as JSON.
- `--no-compile` — skip snippet compilation (structure checks only).

Exit code is `1` when the report contains errors, `0` otherwise (warnings do not
fail the run). The catalog root defaults to `<repo>/catalog/rules`, resolved from
the CLI module location, so it works from any working directory.

Programmatic API (all async):

```ts
validateFile(path, options?) // one rule -> FileValidationResult
validatePack(langDir, options?) // one language dir -> ValidationReport
validateAll(root = "catalog/rules", options?) // every language dir -> ValidationReport
```

`ValidateOptions`: `{ compile?: boolean; knownIds?: ReadonlySet<string> }`.

### Report fields

`ValidationReport`:

- `errors` / `warnings` — flat `ValidationIssue[]` (`{code, message, path, severity}`).
- `ruleCount` — rule files discovered.
- `checkedCount` — rule files that passed with **zero errors** (clean count).

`FileValidationResult` adds the parsed `rule: RuleFile | null` and `compile:
SnippetCheck[]` (per-section `HarnessResult`, including the `compiler` version
used).

## Static checks

| Code | Severity | Check |
|---|---|---|
| `fm-missing` | error | File does not start with a `---` frontmatter block. |
| `fm-parse` | error | YAML frontmatter does not parse. |
| `field-required` | error | Missing/empty `id`, `lang`, `prefix`, `title`, `severity`, `enforce`, `baseline`, `status`. |
| `enum` | error | `lang`, `severity`, `enforce`, or `status` outside its enum. |
| `prefix-format` | error | `prefix` is not lowercase kebab-case. |
| `field-type` | error | `tool`, `triggers`, `triggers.*`, or `related` has the wrong shape. |
| `tool-required` | error | `enforce: tool`/`both` without a `tool` id. |
| `source-missing` | error | `sources` absent or empty. |
| `source-title` | error | A source lacks a non-empty title. |
| `source-url` | error | A source URL is not a valid `http(s)` URL. |
| `id-mismatch` | error | `id !== "<lang>-<file stem>"` (per §2; e.g. `err-foo.md` in `rust/` → `rust-err-foo`). |
| `prefix-mismatch` | error | File stem does not start with `"<prefix>-"`. |
| `lang-dir-mismatch` | error | Rule `lang` differs from its language directory name. |
| `related-unresolved` | error | A `related` id does not exist under the catalog. |
| `related-external` | error | `external:` entry without a valid URL after the prefix. |
| `related-unchecked` | warning | No catalog scan was possible, so ids could not be resolved (single-file use only). |
| `summary-missing` | error | First non-empty body line is not a `> ` blockquote summary. |
| `summary-too-long` | error | Summary exceeds 30 words. |
| `section-missing` | error | `## Why`, `## Bad`, or `## Good` absent. |
| `section-order` | error | Sections not in order `Why, Bad, Good, See Also`. |
| `section-duplicate` | error | A canonical section appears twice. |
| `section-unknown` | error | Heading other than the four canonical sections. |
| `fence-count` | error | `## Bad`/`## Good` does not contain exactly one fenced code block. |
| `fence-language` | error | Fence tag does not match the rule's language (`rust`; `typescript`/`ts`; `python`/`py`; `cpp`/`c++`/`cxx`; exact code otherwise). |
| `forbidden-token` | error / warning | `TODO`, `FIXME`, `XXX`, `TBD` are errors; `placeholder`, `lorem` are warnings. |
| `snippet-elision` | error | Bare elision line: the entire line is `...` or `..` (Python `Ellipsis` exempt). |
| `comment-elision` | warning | `...` or spaced `..` inside `//`, `#`, or `/* */` comments in a code fence. |
| `unicode-ellipsis` | warning | Unicode ellipsis `…` used as an elision. |
| `snippet-too-long` | warning | A snippet exceeds 25 content lines (§4). |
| `hedging` | warning | `consider`, `might`, or `often` in prose (outside code fences). |
| `vague-condition` | warning | `as needed` without a nearby condition (`if`/`when`/`unless`/`before`/`after`/`once`/`whenever`/`only`). |
| `read-failed` | error | File/directory could not be read. |
| `pack-missing` | warning | `validatePack` directory does not exist. |
| `root-missing` | warning | `validateAll` root does not exist (reported, not fatal). |
| `index-file-missing` | error | `INDEX.md` absent from a pack. |
| `index-missing` | error | Rule file not listed in `INDEX.md`. |
| `index-extra` | error | `INDEX.md` lists a file that does not exist as a rule in the directory. |
| `compile-skipped` | warning | Toolchain missing; snippet was not compiled. |
| `compile-exempt` | warning | Rule declares `compile_exempt`; snippet compilation skipped for the stated reason (rule still counts as checked). |
| `compile-failed` | error | Snippet failed to compile (message carries the compiler version). |

`INDEX.md` is compared in both directions over its list entries: every rule file
must have exactly one list link, and every list link must resolve to a rule file
(reserved files `INDEX.md`, `sources.md`, `categories.md` are never rule files).
Prose links elsewhere in the index (for example to `categories.md`) are ignored.

Compilation runs only when the file is otherwise error-free, so a rule with
static errors never pays for a toolchain run. Warnings (comment elisions,
Unicode ellipses, over-length snippets, hedging) never block: `checkedCount`
counts rules with zero **errors** only.

Elision policy (§12): bare `...`/`..` lines are errors; `...`/spaced `..` inside
comments and `…` are warnings. Literal syntax such as C/C++ `...` (catch-all,
varargs, packs) and Rust `..` ranges — including `0..10` in comments — is not
flagged, and a Python `...` statement is treated as `Ellipsis`, not an elision.

`compile_exempt` classes (CONTRACT §3): (a) snippets that intentionally
demonstrate a compile error; (b) features stabilized after the locally available
toolchain (e.g. rust `MaybeUninit::<[T; N]>::from`, stable in 1.95 while the
harness runs 1.94); (c) proc-macro cross-crate cases. Every exemption must state
the concrete reason, and exempted rules stay `draft` until a verifier approves
them.

## Compilation harness

`compileSnippet(lang, code)` writes the snippet to a fresh `mkdtemp` directory,
runs the language toolchain, deletes the directory, and returns
`HarnessResult { ok, skipped, compiler, output }`. `compiler` records the version
probed from the toolchain (e.g. `rustc 1.94.0`, `tsc 5.9.3`, `Python 3.14.6`), or
`skipped` when the toolchain is unavailable — evidence for verification reports.

- Timeout: 30 s per invocation; output capped at 64 KiB.
- Missing toolchain: `{ ok: false, skipped: true, compiler: "skipped" }`. The
  validator turns that into a `compile-skipped` warning, never an error.
- Probe results are cached per process.

| lang | command | wrapping |
|---|---|---|
| rust | `rustc --edition 2024 --crate-type lib --emit metadata --out-dir <tmp>` | none first; falls back to `fn main() { <code> }` for statement fragments. On `E0432`/`E0433`/`E0463` (unresolved/missing crate) it re-checks inside a cached cargo fixture with the standard dependency set (`serde`, `tokio`, `thiserror`, `reqwest`, `proptest`, …), prepared once via `cargo fetch` under `~/.superskill/cache/rust-harness` and reused offline; `macro-proc-*` snippets use a `proc-macro = true` fixture. Fallback results are labelled `rustc <version> (cargo fixture)`. |
| typescript | `node <repo>/node_modules/typescript/bin/tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext <file>` (falls back to `tsc` on PATH) | none. |
| python | `python3 -m py_compile <file>` | none. |
| go | `go build ./...` in a temp module | prepends `package main` when the snippet has no package clause; appends an empty `func main() {}` when a `main` package lacks one. |
| swift | `swiftc -parse <file>` | none (top-level code is valid). |
| java | `javac -d <tmp> <file>` | type declarations (including `@interface`) are kept (file named after the public type); method blocks are wrapped in `class Snippet`; bare statements in `class Snippet { main(...) }`; `module` declarations compile as `module-info.java`; `package`-only units as `package-info.java`. Snippets importing `org.junit.*` / `org.openjdk.jmh.*` compile with `-cp ~/.superskill/cache/jars/*` (jars fetched once from Maven Central; `SUPERSKILL_JAVA_JAR_CACHE` overrides the dir). If the jars are unavailable the snippet is skipped with a `missing-dependency:` reason. |
| c | `clang -fsyntax-only -std=c23 <file>` | none first; falls back to `int main(void) { <code> }` with stdio/stdlib/string/stdint/stdbool includes; leading preprocessor lines stay at file scope. |
| cpp | `clang++ -fsyntax-only -std=c++23 <file>` | same as C, with iostream/string/vector/cstdio/cstdint includes and `int main()`. |

### Limitations

- Wrapping is heuristic and best-effort: only the unwrapped form is compiled when
  it is valid, so authors should still write self-contained snippets (§4). When
  both forms fail, the first-attempt output is reported.
- Toolchains are not version-pinned; the version actually used is recorded in
  `HarnessResult.compiler`. `baseline` is the literal `latest` (CONTRACT §8).
- The rust cargo fixture is prepared lazily on first fallback use (`cargo fetch`
  plus one warm `cargo check`; allow several minutes on a cold cache). Later
  checks run `cargo check --offline` against the shared target dir, so they work
  without network. Set `SUPERSKILL_RUST_HARNESS_DIR` to relocate the cache. If
  cargo or the fixture is unavailable, the snippet is skipped with a reason
  (`… cargo fixture unavailable: …`) instead of failing. Rules that legitimately
  demonstrate compile errors carry `compile_exempt` and are skipped by design.
- Non-compile checks are purely textual (headings, fences, tokens); they do not
  parse Markdown in full.
- The validator never fetches source URLs; reachability is checked by authors
  and the adversarial verifier.
- Checks are deterministic: directory entries and issues are sorted, and
  compilation runs sequentially.
