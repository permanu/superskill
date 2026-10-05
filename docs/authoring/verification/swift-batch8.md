# Verification Report - Swift `lint` + `anti` + `data` Batch 8

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/swift/lint-*.md` (12), `anti-*.md` (12), `data-*.md` (12); all entered as `status: draft`; **35/36 flipped to `verified`**, 1 rejected (`anti-unchecked-sendable`)
- Toolchain: Apple Swift 6.4 (swiftlang-6.4.0.34.1, clang-2100.3.34.1), arm64-apple-macosx26.0; `swiftc -typecheck` (default language mode) and `swiftc -swift-version 6 -typecheck`; SwiftLint 0.65.1 (Homebrew); toolchain `swift format` present (`swift format --version` -> `main`)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/swift-batch8` (72 extracted snippets, typecheck logs, SwiftLint probe outputs, 40+ runtime executables, fetch evidence)

## Method

1. Fetched all 27 distinct cited URLs (all HTTP 200): 10 SwiftLint rule pages + SwiftLint README + swift-format README + SE-0412 + SE-0302 + 2 TSPL chapters + 12 Apple API/article pages. TSPL and Apple human pages are JavaScript shells, so prose was read through their DocC JSON payloads (`docs.swift.org/swift-book/data/...`, `developer.apple.com/tutorials/data/...`); SwiftLint pages were read from static HTML and cross-checked against installed SwiftLint 0.65.1.
2. Extracted both fenced snippets from all 36 rules (72 files) and ran `swiftc -typecheck` in default mode and `-swift-version 6`: **144/144 exit 0, no diagnostics**. No rule uses `compile_exempt`.
3. Probed all 10 SwiftLint rule ids in the installed 0.65.1 (`swiftlint rules`): every id exists with the claimed opt-in/default/correctable status; ran per-file `--only-rule` probes on every Bad/Good pair (table below).
4. Ran bounded runtime harnesses (timeout 30-60 s) for every self-contained `anti` and `data` pair plus targeted drivers: IUO trap, weak-on-non-class-bound-protocol compile error, `assert` vs `precondition` under `-O`, opt-out-removed variants under `-swift-version 6`, atomic write/read-back, snake_case and ISO 8601 decode, sorted-key output, directory resolution, and driver checks for the control-flow pairs.
5. Ran the deterministic validator and a structural audit: frontmatter, id/path match, section order, one `swift` fence per Bad/Good, summary word counts, anti-slop tokens, `related` resolution, `## See Also` resolution, version-string scan, and a duplicate/near-duplicate scan (within the batch and against all 205 Swift rules).

## Source evidence (claim-specific)

- **SwiftLint README** (lint-analyze, baseline, custom-rules, nested-config, plugin-pin, swiftlint-adopt, swiftlint-strict): analyzer rules are "an entirely separate list of rules that are only run by the `analyze` command"; "The `swiftlint analyze` command can lint Swift files using the full type-checked AST. The compiler log path containing the clean `swiftc` build command invocation (incremental builds will fail) must be passed to `analyze` via the `--compiler-log-path` flag"; "Analyzer rules tend to be considerably slower than lint rules"; baseline: "The path to a baseline file, which will be used to filter out detected violations" / write_baseline: "The path to save detected violations to as a new baseline"; `custom_rules` example includes `included`/`excluded`, `regex`, `message`, `severity`; nested configs: "SwiftLint walks up from that file's directory towards the root configuration and uses the first nested `.swiftlint.yml` it finds as a child config. That nested config applies only to files in its directory subtree"; "So if you want to use nested configurations, you can't use the `--config` parameter"; SwiftPM `.package(url: ..., exact: "<version>")`; "Installing via Cocoapods also enables pinning to a specific version of SwiftLint rather than simply the latest (which is the case with Homebrew)"; "Configure SwiftLint by adding a `.swiftlint.yml` file from the directory you'll run SwiftLint from" with `disabled_rules`/`opt_in_rules` and per-rule severity; `strict: false # If true, SwiftLint will treat all warnings as errors`; pre-commit example `entry: swiftlint --fix --strict`.
- **SwiftLint rule pages**: `blanket_disable_command` - "swiftlint:disable commands should use `next`, `this` or `previous` to disable rules for a single line, or `swiftlint:enable` to re-enable the rules immediately after the violations to be ignored, instead of disabling the rule for the rest of the file"; `superfluous_disable_command` - "SwiftLint 'disable' commands are superfluous when the disabled rule would not have triggered a violation in the disabled region. Use ' - ' if you wish to document a command"; `force_cast` - "Force casts should be avoided" (default enabled, severity error); `implicitly_unwrapped_optional` - "Implicitly unwrapped optionals should be avoided when possible" (opt-in, default mode `all_except_iboutlets`); `class_delegate_protocol` - "Delegate protocols should be class-only so they can be weakly referenced" (default enabled; rationale: weak is class-only, avoid retain cycles); `discouraged_optional_boolean` - "Prefer non-optional booleans over optional booleans" (opt-in); `discouraged_optional_collection` - "Prefer empty collection over optional collection" (opt-in); `legacy_constructor` - "Swift constructors are preferred over legacy convenience functions" (default enabled, autocorrect); `identical_operands` - "Comparing two identical operands is likely a mistake" (opt-in); `superfluous_else` - "Else branches should be avoided when the previous if-block exits the current scope" (opt-in, autocorrect).
- **swift-format README**: "`swift-format` provides the formatting technology for [SourceKit-LSP]"; config search - "looks for a JSON-formatted file named `.swift-format` in the same directory ... then it looks in the parent directory, and so on ... a default configuration is used"; lint - "checks one or more Swift source files ... for style violations and prints diagnostics to standard error"; `-s/--strict` - "lint warnings will cause the tool to exit with a non-zero exit code"; `-i/--in-place` - "Overwrites the input files ... No backup of the original file is made"; `-r/--recursive` documented.
- **TSPL The Basics**: "Assertions are checked only in debug builds, but preconditions are checked in both debug and production builds. In production builds, the condition inside an assertion isn't evaluated."
- **TSPL Basic Operators**: "Use the ternary conditional operator with care, however. Its conciseness can lead to hard-to-read code if overused. Avoid combining multiple instances of the ternary conditional operator into one compound statement."
- **SE-0412**: requires every global to be "either be isolated to a global actor or be both: 1. immutable 2. of `Sendable` type"; "`nonisolated(unsafe)` ... will disable static checking of data isolation ... without correct implementation of a synchronization mechanism ... exclusivity enforcement or tools such as Thread Sanitizer could still identify failures."
- **SE-0302**: "`@unchecked` ... indicates that the type can safely be passed across concurrency domains, but requires the author of the type to ensure that this is safe"; "This is appropriate for classes that use access control and internal synchronization to provide memory safety."
- **Apple "Encoding and Decoding Custom Types"**: "Adopting these protocols lets implementations of the `Encoder` and `Decoder` protocols take your data and encode or decode it to and from an external representation such as JSON or property list"; "Adding `Codable` ... triggers an automatic conformance that satisfies all of the protocol requirements"; CodingKeys cases "serve as the authoritative list of properties that must be included"; "Declare conformance to `Encodable` if you only need to support the encoding of data. Conversely, declare conformance to `Decodable` if you only need to read data"; "If the structure of your Swift type differs from the structure of its encoded form, you can provide a custom implementation"; `Landmark` "can be encoded using both the `PropertyListEncoder` and `JSONEncoder` classes, even though `Landmark` itself contains no code to specifically handle property lists or JSON".
- **Apple API pages**: `KeyDecodingStrategy` - "The values that determine how to decode a type's coding keys from JSON keys"; `convertFromSnakeCase` - "A key decoding strategy that converts snake-case keys to camel-case keys"; "Key decoding strategies other than `useDefaultKeys` may have a noticeable performance cost because those strategies may inspect and transform each key"; `DateDecodingStrategy` - "strategies available for formatting dates when decoding them from JSON" with `iso8601` ("The strategy that formats dates according to the ISO 8601 standard") and epoch formats; `NSData.WritingOptions.atomic` - "An option to write data to an auxiliary file first and then replace the original file with the auxiliary file when the write completes"; `Data.write(to:options:)` exists; file-system article - Application Support "stores data like configuration files, templates, and modified versions of default files from your bundle. The system also includes the contents of this folder as part of regular backups"; caches - "store files the app doesn't require to operate, but that improve performance, such as database cache files and transient, downloadable content"; "the system may purge this directory when your app isn't running. Your app needs to either be able to operate without these files, or regenerate them as needed"; "The system doesn't back up either the temporary directory or the caches directory"; "Use these APIs whenever possible. Don't hard-code paths to what appear to be common directories, since apps like Finder may localize directory names"; `PropertyListEncoder` - "An object that encodes instances of data types to a property list"; `sortedKeys` - "The output formatting option that sorts keys in lexicographic order"; `OutputFormatting` - options "determine the readability, size, and element order of an encoded JSON object"; `url(for:in:appropriateFor:create:)` - "Locates and optionally creates the specified common directory in a domain."

## Compile results

- `swiftc -typecheck` default and `-swift-version 6`: **144/144 exit 0** (72 snippets x 2 modes), no warnings observed. No rule uses `compile_exempt`.
- The deterministic validator's Swift harness only runs `swiftc -parse`; the `-typecheck` pass above is the stronger check.
- The nine `lint` rules whose Bad/Good blocks are comment-embedded CI commands (`lint-analyze`, `lint-baseline`, `lint-custom-rules`, `lint-nested-config`, `lint-plugin-pin`, `lint-swift-format-adopt`, `lint-swift-format-lint-ci`, `lint-swiftlint-adopt`, `lint-swiftlint-strict`) parse and typecheck as empty translation units; their content is tooling configuration, not Swift code, and the commands were checked against the fetched docs.

## SwiftLint probes (0.65.1, per-file, `--only-rule`)

| rule id probed | Bad violations | Good violations | notes |
|---|---|---|---|
| `force_cast` | 1 | 0 | default-enabled, error severity |
| `implicitly_unwrapped_optional` | 1 | 0 | opt-in, default `all_except_iboutlets` |
| `class_delegate_protocol` | 1 | 0 | `AnyObject` accepted as class-bound |
| `discouraged_optional_boolean` | 1 | 0 | opt-in |
| `discouraged_optional_collection` | 1 | 0 | opt-in |
| `legacy_constructor` | 1 | 0 | default-enabled, autocorrect |
| `identical_operands` | 1 | 0 | opt-in |
| `superfluous_else` | 1 | 0 | opt-in |
| `blanket_disable_command` | 1 | 0 | `:next` form passes |
| `superfluous_disable_command` | 1 | 0 | Bad needs the disabled rule in the enabled set; with default config or `--only-rule force_cast --only-rule superfluous_disable_command` it fires exactly once, with `--only-rule superfluous_disable_command` alone it does not (probe artifact, not a rule defect) |
| `force_cast` on `lint-disable-reason` Bad/Good | 0 | 0 | ` - reason` suffix parses and still suppresses the cast |

## Harness results (bounded, timeouts)

- **IUO**: Bad variant reading `v.subtitle!` traps (exit 133); Good reads `?? "none"` (exit 0).
- **Class delegate**: `weak` on the non-class-bound Bad protocol is a compile error ("'weak' must not be applied to non-class-bound 'any DownloadDelegate'"); the Good protocol + weak property compiles.
- **assert vs precondition**: `-O` build, `withdraw(amount: 0, ...)` - assert version exits 0 with the check skipped (`balance=100`); precondition version traps (exit 133).
- **nonisolated(unsafe) / @unchecked Sendable**: opt-out-removed variants fail under `-swift-version 6` with `#MutableGlobalVariable` and "stored property 'value' of 'Sendable'-conforming class 'Counter' is mutable"; the opt-out forms (the rules' Bads) compile - i.e., the annotations are exactly what silences the diagnostics.
- **Data**: atomic write/read-back returns `payload`; snake_case decode maps `first_name`/`last_name` to `Ada Lovelace`; ISO 8601 decode yields `launch 1704164645.0`; Application Support/Caches/Documents drivers resolve to the correct directories; `PropertyListEncoder` and `JSONEncoder` pairs encode; all Bad/Good pairs for the runnable rules compile and exit 0.
- **Control flow**: superfluous-else Good and nested-ternary Bad/Good drivers produce identical results (`pass fail`, `B F`).

## Formatting, validator, duplicates, links

- All 36: id/path match, required frontmatter present, `lang: swift`, `baseline: latest`, valid severity/enforce values, exact section order (`Why`, `Bad`, `Good`, `See Also`), exactly one `swift` fence per Bad/Good, summaries <= 30 words with no hedging, no TODO/elision/Unicode-ellipsis, no version strings.
- `related` ids and all `## See Also` targets resolve; no duplicate ids.
- Within the batch: closest pairs read and confirmed distinct (`lint-disable-scope` vs `lint-disable-reason` vs `lint-superfluous-disable`; `data-application-support` vs `data-caches` vs `data-directory-api`; `anti-optional-boolean` vs `anti-optional-collection`; `anti-superfluous-else` vs `style-guard-early-exit`; `data-coding-keys` vs `data-key-strategy` vs `data-manual-coding`).
- Cross-pack duplicate scan: one near-duplicate found - see rejection below.
- Validator (`node dist/rules/cli.js validate --lang swift --json`): **0 errors / 0 warnings** (checkedCount 205).

## Rejection

- **`swift-anti-unchecked-sendable`** - near-duplicate of the already-verified `swift-conc-actor-state`. Both prescribe the same decision for the same anti-pattern: conc-actor-state - "Protect shared mutable state with an actor instead of unchecked sendability", Bad `final class Counter: @unchecked Sendable { private var value = 0 ... }`, Good `actor Counter`; anti-unchecked-sendable - "Do not claim `Sendable` for an unsynchronized mutable class", Bad `final class Counter: @unchecked Sendable { var value = 0 }`, Good `actor Counter`. Same `must` severity, same rationale (the annotation disables checking while the race remains), same remedy. The immutable-value-type alternative is already covered by `swift-conc-sendable-values`. Per CONTRACT.md section 12 ("near-duplicates are merged or one is deleted") the rule stays `draft`; the author should merge it into `swift-conc-actor-state` or delete it. Its `related` list omits `swift-conc-actor-state`, which supports the finding.

## Non-blocking notes

- `lint-plugin-pin`: the README documents exact pinning as an option ("to consume the latest release of SwiftLint automatically or pin the dependency to a specific version"), so "recommends" in the Why is slightly stronger than the source; the mechanism and the CocoaPods/Homebrew contrast are verbatim-supported. Worth a wording tweak later.
- `data-sorted-keys`: on this Foundation, a 4-key probe produced lexicographic output with and without `.sortedKeys`; the guarantee still comes only from the documented option, so the pair stands as written.
- `anti-force-cast`: the Bad's sample value is an `Int`, so it does not trap at runtime; SwiftLint flags it and the Why's trap claim concerns mismatched values.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| swift-lint-analyze | verified | README: analyzer rules only run under `analyze`, full type-checked AST + `--compiler-log-path`, slower; both modes typecheck |
| swift-lint-baseline | verified | README `baseline`/`write_baseline` config quotes; both modes typecheck |
| swift-lint-custom-rules | verified | README `custom_rules` block with `included`/`excluded`/`regex`/`message`/`severity`; both modes |
| swift-lint-disable-reason | verified | `superfluous_disable_command` page: "Use ' - ' if you wish to document a command"; ` - reason` probe keeps suppression working |
| swift-lint-disable-scope | verified | `blanket_disable_command` page quote; probe Bad 1 / Good 0; both modes |
| swift-lint-nested-config | verified | README nested-config walk-up quote + `--config` override caveat; both modes |
| swift-lint-plugin-pin | verified | README `.package(..., exact:)` + CocoaPods/Homebrew pinning sentence (see note); both modes |
| swift-lint-superfluous-disable | verified | page quote; default-config probe Bad 1 / Good 0; both modes |
| swift-lint-swift-format-adopt | verified | README SourceKit-LSP + `.swift-format` search; `swift format` present in toolchain; both modes |
| swift-lint-swift-format-lint-ci | verified | README lint/strict/in-place quotes; `-r/--recursive` documented; both modes |
| swift-lint-swiftlint-adopt | verified | README config-file/dir + `disabled_rules`/`opt_in_rules`/severity quotes; both modes |
| swift-lint-swiftlint-strict | verified | README `strict: true # treat all warnings as errors` + pre-commit `swiftlint --fix --strict`; both modes |
| swift-anti-force-cast | verified | page "Force casts should be avoided", default error; probe 1/0; both modes |
| swift-anti-implicitly-unwrapped | verified | page opt-in + `all_except_iboutlets`; probe 1/0; IUO read traps vs optional read exits 0; both modes |
| swift-anti-class-delegate-protocol | verified | page class-only/weak rationale; probe 1/0; weak-on-non-class-bound compile error; both modes |
| swift-anti-optional-boolean | verified | page "Prefer non-optional booleans" (opt-in); probe 1/0; both modes |
| swift-anti-optional-collection | verified | page "Prefer empty collection over optional collection" (opt-in); probe 1/0; both modes |
| swift-anti-legacy-constructor | verified | page "Swift constructors are preferred..." (default, autocorrect); probe 1/0; runs; both modes |
| swift-anti-identical-operands | verified | page "Comparing two identical operands is likely a mistake" (opt-in); probe 1/0; both modes |
| swift-anti-superfluous-else | verified | page "Else branches should be avoided when the previous if-block exits the current scope" (opt-in); probe 1/0; driver outputs equal; both modes |
| swift-anti-nested-ternary | verified | TSPL Basic Operators quote; drivers `B F`; both modes |
| swift-anti-assert-for-contracts | verified | TSPL The Basics quote; `-O` harness: assert skipped, precondition traps; both modes |
| swift-anti-nonisolated-unsafe | verified | SE-0412 requirement + nonisolated(unsafe) warning quote; no-opt-out variant errors under Swift 6; both modes |
| swift-anti-unchecked-sendable | **rejected** | near-duplicate of verified `swift-conc-actor-state` (same Bad `@unchecked Sendable` mutable class, same Good `actor Counter`, same `must` remedy); stays `draft` |
| swift-data-codable | verified | article Encoder/Decoder + external representation quotes; both modes; runs |
| swift-data-coding-keys | verified | article automatic-conformance + CodingKeys "authoritative list" quotes; both modes |
| swift-data-encode-direction | verified | article "Declare conformance to Encodable if you only need..." quote; both modes |
| swift-data-key-strategy | verified | enum abstract + `convertFromSnakeCase` + performance-cost quote; harness decodes `Ada Lovelace`; both modes |
| swift-data-date-strategy | verified | enum abstract + `iso8601` page + epoch formats; harness decodes ISO 8601; both modes |
| swift-data-manual-coding | verified | article "structure differs ... custom implementation" + nested-container example; both modes |
| swift-data-atomic-write | verified | `NSData.WritingOptions.atomic` abstract verbatim; `Data.write(to:options:)` exists; harness writes/reads back; both modes |
| swift-data-application-support | verified | article support-files/config/templates/backups quote; drivers resolve Application Support vs Documents; both modes |
| swift-data-caches | verified | article purgeable/regenerate/not-backed-up quote; drivers resolve Caches vs Application Support; both modes |
| swift-data-property-list | verified | `PropertyListEncoder` abstract + article both-encoders quote; both modes; runs |
| swift-data-sorted-keys | verified | `sortedKeys` "lexicographic order" + `OutputFormatting` "readability, size, and element order" quotes; both modes |
| swift-data-directory-api | verified | article "Use these APIs whenever possible. Don't hard-code paths..." + `url(for:in:appropriateFor:create:)` "Locates and optionally creates"; both modes |

## Counts

- Verified: **35/36** (`lint` 12/12, `anti` 11/12, `data` 12/12)
- Rejected: **1/36** (`swift-anti-unchecked-sendable`; near-duplicate - leave draft for merge/delete)
- Blockers: none

Only the 35 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched. No git operations were performed.

## Addendum - Dedup follow-up (2026-10-05)

The rejection in this report was resolved by dedup rather than rewrite:

- `anti-unchecked-sendable` was **deleted**; its unique SE-0302 rationale was merged into `swift-conc-actor-state` (SE-0302 added as a third source; the Why now carries the `@unchecked` definition and appropriateness condition). `swift-conc-actor-state` was reset to `status: draft` for the merge, and `anti-nonisolated-unsafe`'s `related`/`## See Also` were updated to `swift-conc-actor-state` + `swift-conc-sendable-values`. The INDEX `anti` section now lists 11 entries.

Re-check of `swift-conc-actor-state` (independent, fresh context):

- **Source support (SE-0302, raw fetched)**: "any type can override this checking behavior by annotating the conformance to `Sendable` with `@unchecked`. This indicates that the type can safely be passed across concurrency domains, but requires the author of the type to ensure that this is safe." and "This is appropriate for classes that use access control and internal synchronization to provide memory safety — these mechanisms cannot generally be checked by the compiler." The merged Why sentence matches both claims.
- **Type-check**: Bad and Good snippets both `swiftc -typecheck` exit 0 in default mode and `-swift-version 6` (4/4), no diagnostics.
- **Structural audit**: clean - id/path match, required frontmatter, section order, one `swift` fence per Bad/Good, summary <= 30 words with no hedging, no elision/TODO/version strings, `related` and all `## See Also` targets resolve.
- **Dangling references**: no rule, index, or catalog link references `swift-anti-unchecked-sendable`; only historical notes in `categories.md` (batch log) and `swift-batch2.md` (harness description) mention the old name. `anti-nonisolated-unsafe` now points at `swift-conc-actor-state`.
- **Validator** (`node dist/rules/cli.js validate --lang swift --json`): 0 errors / 0 warnings at re-check time (checkedCount 226) and in the final run after the flip (checkedCount 242; concurrent batch work grew the pack between the two runs).

Verdict: `swift-conc-actor-state` **verified** (`status: draft` -> `verified`).

Final counts (snapshot at addendum time; concurrent batch work continues to grow the pack):

- Batch 8 surviving rules: **35/35 verified** (the 36th was deduped into `conc-actor-state` and deleted, resolving the original rejection).
- `swift-conc-actor-state`: **verified** (re-checked above).
- Pack: 242 rules total, **verified 204**, draft 38; the INDEX header matches this snapshot ("Rules: 242 (verified: 204)").
