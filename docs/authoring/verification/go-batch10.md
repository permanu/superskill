# Verification Report - Go Batch 10 (`mod`, `type`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/go/mod-*.md` (14) + `catalog/rules/go/type-*.md` (8) - 22 rules, all entered as `status: draft`
- Toolchain: go1.27.1 darwin/arm64 (`module scratch`, `go 1.27`); snippet wrapping per `src/rules/harness/go.ts` (prepend `package main`, append `func main() {}`)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/batch10-verify-go` (5 fetched sources + text extracts, 44 extracted snippets, build/vet logs, 8-package behavior module, 5 compile-fail probes, structural checker)
- Ownership applied: 20 `status:` fields flipped `draft` -> `verified`; this report created. The 2 rejected rules remain `draft`. No other edits; no git.

## Method

1. Fetched every cited URL (HTTP 200; 5 unique): go.dev/ref/mod, go.dev/doc/modules/layout, go.dev/ref/spec, go.dev/doc/effective_go, pkg.go.dev/unsafe. Converted to text and located the claim-specific passages (section names checked against the page TOC).
2. Extracted both snippets from all 22 rules (44 files) into the scratch module using the project harness convention. `go build ./...` exit 0 and `go vet ./...` exit 0 for 44/44 dirs; no snippet needed `compile_exempt`.
3. For the 14 `mod` rules, assessed the declaration-level comment illustrations directly: every Bad/Good comment names the module artifact and the decision (module path, tag, require line, go.work use, GOPRIVATE, tool directive, vendor manifest, retract, toolchain), so the lesson survives without executable module operations. The body function is an inert carrier in all 14; comments carry the contrast.
4. Ran bounded behavior tests (`go test ./behavior/... -timeout 120s`, 8 packages, all PASS) covering the requested cases: embedding promotion, pointer-receiver mutation, map element copy, interface comparison panics, uintptr GC semantics, make-for-reference, named units, definition-vs-alias. Added 5 compile-fail probes for the negative claims.
5. Structural checker over the 22 files: frontmatter fields, id/path match, baseline, section order, exactly one `go` fence per Bad/Good, summary word cap and hedging, `related`/See Also resolution, anti-slop tokens, plus a significant-word Jaccard near-duplicate scan against the whole Go pack.
6. Deterministic validator: `node dist/rules/cli.js validate --lang go --json` - 0 errors and 1 warning on batch-10 files (the warning is a hedging word in a See Also clause; warnings do not block per CONTRACT section 12). The pack's other 161 errors are in previously verified/other batches, outside scope.
7. Flip policy: only rules passing every check were flipped; two rules were rejected on source-contradicted Why claims (below).

## Source verification (claim -> passage)

- **mod-go-sum-commit**: ref `go.sum files`: "contains cryptographic hashes of the module's direct and indirect dependencies. When the go command downloads a module .mod or .zip file into the module cache, it computes a hash and checks that the hash matches the corresponding hash in the main module's go.sum file."; "go mod tidy will add missing hashes and will remove unnecessary hashes from go.sum."
- **mod-semver-versions**: ref `Versions`: "A version identifies an immutable snapshot of a module... Each version starts with the letter v, followed by a semantic version."; `Version queries`: a revision identifier "selects a pseudo-version for the underlying commit" when not tagged with a semantic version.
- **mod-go-install-version**: ref `go install`: "Since Go 1.16, go install is the recommended command for building and installing programs. When used with a version suffix (like @latest or @v1.4.6), go install builds packages in module-aware mode, ignoring the go.mod file in the current directory or any parent directory"; "useful for installing executables without affecting the dependencies of the main module."
- **mod-workspace**: ref `Workspaces`: "A workspace is a collection of modules on disk that are used as the main modules when running minimal version selection (MVS)... declared in a go.work file that specifies relative paths to the module directories"; `replace directive`: "Conflicting replace directives across main modules are disallowed, and must be removed or overridden in a replace in the go.work file." **But the Why's "A replace directive committed in go.mod changes the module for every consumer" is contradicted by the same page: "replace directives only apply in the main module's go.mod file and are ignored in other modules" (see rejection).**
- **mod-retract**: ref `retract directive`: "Retracted versions should remain available in version control repositories and on module proxies to ensure that builds that depend on them are not broken"; "users will not upgrade to it automatically using go get, go mod tidy, or other commands. Builds that depend on retracted versions should continue to work."
- **mod-tool-directive**: ref `tool directive`: "Since Go 1.24, a tool directive adds a package as a dependency of the current module. It also makes it available to run with go tool when the current working directory is within this module, or within a workspace that contains this module." **But the Why's "hides the same information in a file that no tool reads" is contradicted by the same page: "go mod tidy acts as if all build tags are enabled, so it will consider platform-specific source files and files that require custom build tags" - which is exactly how the tools.go pattern keeps dependencies (see rejection).**
- **mod-module-path-location**: ref `Module paths`: "A module path should describe both what the module does and where to find it. Typically, a module path consists of a repository root path, a directory within the repository (usually empty), and a major version suffix"; "If a module might be depended on by other modules, these rules must be followed so that the go command can find and download the module." Layout guide derives imports from the repository URL (`import "github.com/someuser/modname"`).
- **mod-split-shared-packages**: layout guide, `Server project`: "In case the server repository grows packages that become useful for sharing with other projects, it's best to split these off to separate modules."
- **mod-mvs-minimums**: ref `Minimal version selection (MVS)`: "tracking the highest required version of each module... they are the minimum versions that satisfy all requirements"; `go get`: "required versions in go.mod files are minimum versions and may be increased automatically as new dependencies are added."
- **mod-toolchain-directive**: ref `toolchain directive`: "The suggested Go toolchain's version cannot be less than the required Go version declared in the go directive. The toolchain directive only has an effect when the module is the main module and the default toolchain's version is less than the suggested toolchain's version."
- **mod-unstable-v0**: ref `Versions`: "A version is considered unstable if its major version is 0 or it has a pre-release suffix. Unstable versions are not subject to compatibility requirements."; major version suffixes required for v2+ and "a v1 version acts as a commitment to compatibility."
- **mod-pseudo-versions**: ref `Pseudo-versions`: "Pseudo-versions may refer to revisions for which no semantic version tags are available. They may be used to test commits before creating version tags, for example, on a development branch."
- **mod-vendor-consistency**: ref `Vendoring`: "When the go command reads vendor/modules.txt, it checks that the module versions are consistent with go.mod. If go.mod has changed since vendor/modules.txt was generated, the go command will report an error. go mod vendor should be run again to update the vendor directory."
- **mod-private-modules**: ref `Authenticating modules`: "The GOPRIVATE and GONOSUMDB environment variables may be used to disable requests to the checksum database for specific modules."; "To download specific modules from source repositories instead of a proxy, set the GOPRIVATE or GONOPROXY environment variables."; env table: "GOPRIVATE - list of glob patterns of module path prefixes that should be considered private. Acts as a default value for GONOPROXY and GONOSUMDB."
- **type-uintptr-not-pointer**: unsafe: "A uintptr is an integer, not a reference. Converting a Pointer to a uintptr creates an integer value with no pointer semantics. Even if a uintptr holds the address of some object, the garbage collector will not update that uintptr's value if the object moves, nor will that uintptr keep the object from being reclaimed."; "Conversion of a uintptr back to Pointer is not valid in general."; spec `Package unsafe`: "The effect of converting between Pointer and uintptr is implementation-defined."
- **type-map-element-copy**: spec `Address operators`: operand "must be addressable, that is, either a variable, pointer indirection, or slice indexing operation; or a field selector of an addressable struct operand; or an array indexing operation of an addressable array" (no map index); `Assignment statements`: "Each left-hand side operand must be addressable, a map index expression, or (for = assignments only) the blank identifier."
- **type-definition-over-alias**: spec `Type definitions`: "A type definition creates a new, distinct type... The new type is called a defined type. It is different from any other type, including the type it is created from."; `Type identity`: "A named type is always different from any other type."; `Alias declarations`: "An alias declaration binds an identifier to the given type... it serves as an alias for the given type."
- **type-pointer-receiver-mutation**: Effective Go `Pointers vs. Values`: "pointer methods can modify the receiver; invoking them on a value would cause the method to receive a copy of the value, so any modifications would be discarded."; the counter example adds "The receiver needs to be a pointer so the increment is visible to the caller."
- **type-named-units**: spec `Type definitions` and `Type identity` as above (defined type distinct even with the same underlying type).
- **type-make-for-reference**: spec `Making slices, maps and channels`: "make takes a type T, which must be a slice, map or channel type... It returns a value of type T (not *T)."; `Allocation`: "new creates a new, initialized variable and returns a pointer to it... initialized to its zero value."
- **type-embed-promote**: Effective Go `Embedding`: "The methods of embedded types come along for free"; "when they are invoked the receiver of the method is the inner type, not the outer one."; spec `Struct types`: "The unqualified type name acts as the field name" plus promotion/method-set rules.
- **type-interface-comparison**: spec `Comparison operators`: "A comparison of two interface values with identical dynamic types causes a run-time panic if that type is not comparable. This behavior applies not only to direct interface value comparisons but also when comparing arrays of interface values or structs with interface-valued fields."

## Compile / vet evidence

```
mod (44 dirs: 22 rules x Bad/Good): go build ./... exit 0; go vet ./... exit 0 (no diagnostics)
behavior module: go build ./... exit 0; go vet ./... exit 0
behavior: go test ./behavior/... -timeout 120s -> ok (8/8 packages)
```

No snippet needed `compile_exempt`. The `mod` snippets are inert declaration-level carriers by design; the module lesson is entirely in the annotated comments and was reviewed per rule (14/14 convey the artifact and the decision clearly).

## Behavior results

- **embed** (`embed`): promoted `*inner` method mutated the embedded value through `outer` (calls=1); embedded `io.Reader` satisfied `io.Reader` and `io.ReadAll` returned "hello".
- **mut** (`mut`): value receiver `IncValue` left the caller at n=0; pointer receiver `IncPtr` set n=1.
- **map copy** (`mapcopy`): discarded-copy mutation left `m["origin"].X == 1`; store-back left X == 2. Compile-fail probe: `m["o"].X++` -> "cannot assign to struct field m[\"o\"].X in map".
- **interface comparison** (`ifacecmp`): `sameAny` panicked for `[]int`, map, and func dynamic types; concrete `samePoint` returned true; `[1]any` array comparison panicked; struct with `any` field panicked - all per the spec sentence.
- **uintptr** (`uintptr`): a finalizer on a 256-byte object ran after GC while only a `uintptr` held its address (reclaimed); the finalizer did not run while an `unsafe.Pointer` struct field referenced the object (5 GC cycles). Stable across repeated runs (5x5 + 20 iterations).
- **make-for-reference** (`makeit`): `*new(map[string]int)` is nil and the first write panics; `make` map is writable; `*new([]int)` is nil while `make([]int, 0)` is non-nil.
- **named units** (`named`): pass-through and explicit conversion work. Compile-fail probe: passing a `Milliseconds` value as a `Retries` parameter -> "cannot use ms (variable of type Milliseconds) as Retries value".
- **definition vs alias** (`def`): `Alias = int64` assigns to `int64` with no conversion; `Defined int64` requires a conversion and carries a `Seconds` method. Compile-fail probes: `var i int64 = d` (defined) rejected; method on alias -> "cannot define new methods on non-local type Alias".
- **concrete comparison** probe: `same([]int{1}, []int{1})` with a `Point` signature -> "cannot use []int{...} (value of type []int) as Point value" (compiler rejects incomparable types).

## Structural, duplicates, links

- All 22: id/path match, `lang: go`, prefix `mod`/`type`, `baseline: latest`, valid severity/enforce, exact section order, exactly one `go` fence per Bad/Good, summaries <= 30 words with no hedging, `related` ids and See Also targets resolve, no banned tokens/elisions, all present in `INDEX.md` (14 + 8).
- Validator: 0 errors on batch-10 files; 1 warning (`type-named-units` "often" in a See Also clause, line 46) - non-blocking per CONTRACT section 12.
- Near-duplicates: highest significant-word Jaccard in-batch is 0.25; no textual duplicates. Conceptual overlaps reviewed and accepted: `mod-go-sum-commit` vs verified `proj-go-mod-tidy` (hand-edited checksum file vs stale requirements; both invoke tidy but the decisions differ), `type-pointer-receiver-mutation` vs `iface-receivers-consistent` (silent mutation vs one receiver kind/method-set consistency; cross-linked), `type-make-for-reference` vs `anti-nil-map-write` (make-vs-new vs nil-map init; cross-linked), `type-definition-over-alias` vs `type-named-units` (definition identity vs argument-swap safety; cross-linked), `mod-go-install-version` vs `mod-tool-directive` (one-off tool install vs module-owned tool; cross-linked and scoped).
- Formatting: snippet bodies use 4-space indentation, consistent with every other Go rule in the pack (not gofmt-tabbed); no batch-specific deviation.

## Non-blocking notes

- `mod-go-sum-commit` title says "Commit go.sum"; the cited passages establish go.sum's role and tidy regeneration, and committing is the pack-wide de facto practice, but the reference does not say "commit" explicitly. Recommend tightening if the title is re-touched.
- `mod-semver-versions` closing sentence "The repository tag and the version query syntax must match exactly" is elliptical; the sourced fact is that a tag must be a valid v-prefixed semantic version to become a module version (revision queries on other tag names yield pseudo-versions). Accepted.
- `mod-pseudo-versions` "no way for other projects to reason about upgrades" is rhetorical; the sourced fact is that a pseudo-version carries no release/compatibility signal (it still sorts in MVS). Accepted.
- `mod-retract` "can violate the module cache's immutability" is a loose gloss on deleting/moving tags breaking pinned builds and hash verification. Accepted.
- `type-pointer-receiver-mutation` paraphrases Effective Go's pointer-method-copy sentence and generalizes it to value receivers; the conclusion is true, and the page's counter example ("The receiver needs to be a pointer so the increment is visible to the caller") states the same point. Accepted.
- `type-make-for-reference` "the only one that initializes them" scopes to constructors (make vs new); composite literals also produce non-nil maps/slices. Accepted.
- `mod-retract` cites "Retracting a version" while the page section is titled "retract directive" (same URL, content matches). Cosmetic.
- `INDEX.md` verified count and `categories.md` batch status were not updated (owner reconciliation; outside verifier ownership).

## Verdicts

| rule id | verdict | evidence | notes |
|---|---|---|---|
| go-mod-go-install-version | verified | ref: go install recommended since 1.16, @version ignores local go.mod; "without affecting the dependencies of the main module". Build+vet clean. | |
| go-mod-go-sum-commit | verified | ref: go.sum holds hashes of direct/indirect deps, checked on download; tidy "will add missing hashes and will remove unnecessary hashes". Build+vet clean. | Title "commit" not verbatim in source (note). |
| go-mod-module-path-location | verified | ref: path names what/where (repo root + dir + major suffix); "must be followed so the go command can find and download the module". Layout guide uses repo-derived imports. Build+vet clean. | |
| go-mod-mvs-minimums | verified | ref: require versions are minimums "increased automatically"; MVS tracks highest minimum. Build+vet clean. | |
| go-mod-private-modules | verified | ref: GOPRIVATE/GONOSUMDB disable checksum DB; GOPRIVATE/GONOPROXY force direct source download; GOPRIVATE defaults GONOPROXY/GONOSUMDB. Build+vet clean. | |
| go-mod-pseudo-versions | verified | ref: pseudo-versions for revisions without semver tags, "used to test commits before creating version tags". Build+vet clean. | "no way to reason about upgrades" rhetorical (note). |
| go-mod-retract | verified | ref: retracted versions remain available; no auto-upgrade via go get/tidy; existing builds continue to work. Build+vet clean. | Citation section-title nit (note). |
| go-mod-semver-versions | verified | ref: version = immutable snapshot, "letter v, followed by a semantic version"; untagged revisions resolve to pseudo-versions. Build+vet clean. | Closing sentence elliptical (note). |
| go-mod-split-shared-packages | verified | layout guide: sharing-worthy server packages "best to split these off to separate modules". Build+vet clean. | |
| go-mod-toolchain-directive | verified | ref: suggested toolchain, cannot be below the go directive, effect only in the main module and only when default toolchain is older. Build+vet clean. | |
| go-mod-unstable-v0 | verified | ref: major 0 or pre-release = unstable, no compatibility requirements; v1 is a compatibility commitment. Build+vet clean. | |
| go-mod-vendor-consistency | verified | ref: modules.txt checked against go.mod; changed go.mod -> error, rerun go mod vendor. Build+vet clean. | |
| go-type-definition-over-alias | verified | spec: definition creates distinct type ("different from any other type"); alias "binds an identifier to the given type". Probe: alias = int64 with no conversion; defined needs conversion; method on alias rejected. Build+vet clean. | |
| go-type-embed-promote | verified | Effective Go: methods "come along for free", receiver is "the inner type, not the outer one"; spec: unqualified type name is the field name. Probe: promoted pointer method reached inner value. Build+vet clean. | |
| go-type-interface-comparison | verified | spec: identical dynamic types + non-comparable -> run-time panic; applies to interface arrays/struct fields. Probes: slice/map/func dynamic types panic; concrete comparison compiles only for comparable types. Build+vet clean. | |
| go-type-make-for-reference | verified | spec: make returns "a value of type T (not *T)"; new returns pointer to zero value. Probes: `*new(map)` nil + panic on write; make writable; `*new([]int)` nil vs `make([]int,0)` non-nil. Build+vet clean. | "only one that initializes" scoped to constructors (note). |
| go-type-map-element-copy | verified | spec: map index is not addressable; assignment accepts map index on LHS. Probes: discarded copy leaves map unchanged; store-back changes it; `m[k].X++` compile error. Build+vet clean. | |
| go-type-named-units | verified | spec: defined types distinct. Probe: named pass-through; passing Milliseconds as Retries is a compile error. Build+vet clean. | Validator warning: "often" in See Also (non-blocking). |
| go-type-pointer-receiver-mutation | verified | Effective Go: pointer methods modify the receiver; value invocation copies; "receiver needs to be a pointer so the increment is visible". Probes: value receiver no-op, pointer receiver mutates. Build+vet clean. | Paraphrase generalized to value receivers (note). |
| go-type-uintptr-not-pointer | verified | unsafe: "uintptr is an integer, not a reference... GC will not update... nor keep the object from being reclaimed"; uintptr->Pointer "not valid in general"; spec: conversion effect "implementation-defined". Probe: finalizer ran with only a uintptr; did not run with a live unsafe.Pointer. Build+vet clean. | |
| go-mod-workspace | **rejected** | Why: "A replace directive committed in go.mod changes the module for every consumer" is contradicted by the cited page: "replace directives only apply in the main module's go.mod file and are ignored in other modules" (and by verified `go-proj-replace-main-module-only`: "every consumer silently builds against the original requirement"). The rest of the Why is exact, snippets build+vet. | Fix: reword to "changes the build for everyone working in that module" / "is published inside the module's file"; do not claim consumer impact. |
| go-mod-tool-directive | **rejected** | Why: "hides the same information in a file that no tool reads" is contradicted by the cited page: "go mod tidy acts as if all build tags are enabled, so it will consider... files that require custom build tags" - reading the tagged tools.go file is exactly how the pattern keeps the tool dependency. No cited source supports "no tool reads". Snippets build+vet; the rest of the Why is exact. | Fix: state the real drawback (tool becomes an ordinary dependency of the build graph, indistinguishable from runtime deps) or drop the clause. |

## Counts

- Verified: 20/22 - flipped to `status: verified`
- Rejected: 2 - `go-mod-workspace`, `go-mod-tool-directive` (left `draft`)
- Blockers: the two rejected rules need a Why rewording (consumer impact; "no tool reads"), then re-verification. No compile, behavior, structural, or duplicate blockers.

## Addendum - re-verification of the two rejected rules (2026-10-05)

Both rules were reworded by the author and re-checked in the same scratch module. Both now pass every check and were flipped `draft` -> `verified`.

### Re-check evidence

- **go-mod-workspace** - new Why sentence: "A replace directive committed in go.mod applies to everyone working in the module, while a workspace file provides the same local wiring without touching any module's file." This matches the cited page: "replace directives only apply in the main module's go.mod file and are ignored in other modules" (go.dev/ref/mod, replace directive) - main-module scope only, no consumer claim; the go.work alternative is supported by the Workspaces/use/replace passages. The conflicting-replace sentence is still exact ("Conflicting replace directives across main modules are disallowed, and must be removed or overridden in a replace in the go.work file"). Snippets unchanged; build+vet clean.
- **go-mod-tool-directive** - the false "no tool reads" claim is gone. New Why: "the older pattern of blank imports behind a build tag also keeps the dependency, because go mod tidy acts as if all build tags are enabled and considers files with custom build tags" - matches the cited page ("go mod tidy acts as if all build tags are enabled, so it will consider platform-specific source files and files that require custom build tags"). The drawback is now stated accurately ("the tool then sits in the build graph as an ordinary dependency with no record that it is a tool"), and the directive's benefit is exact ("adds a package as a dependency of the current module. It also makes it available to run with go tool"). The new source `Go Modules Reference - go mod tidy` is the section supporting the build-tag sentence. Snippets unchanged; build+vet clean.

### Re-check runs

- Re-extracted both snippets from the current files (and all 22 for completeness): 44/44 dirs `go build ./...` exit 0, `go vet ./...` exit 0.
- Structural checker: all 22 pass (id/path, frontmatter, section order, fences, summaries, related/See Also resolution).
- Validator `node dist/rules/cli.js validate --lang go --json`: 0 errors and 1 warning on batch-10 files (the pre-existing `type-named-units` See Also hedging note; non-blocking).
- Duplicate scan unchanged; no new overlaps.

### Final counts

- Verified: **22/22** - all flipped to `status: verified` (20 in the original pass + these 2 in re-verification)
- Rejected: **0**
- Blockers: none.
