# Verification Report - Swift `num` + `conv` + `pat` + `const` Batch 9

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/swift/num-*.md` (6), `conv-*.md` (6), `pat-*.md` (4), `const-*.md` (6); all entered as `status: draft`; **19/22 flipped to `verified`**, 3 rejected (`conv-obsoleted`, `conv-preconcurrency-import`, `const-legacy-constant`)
- Toolchain: Apple Swift 6.4 (swiftlang-6.4.0.34.1, clang-2100.3.34.1), arm64-apple-macosx26.0; macOS SDK 27.0, iOS SDK 27.0; `swiftc -typecheck` (default language mode) and `swiftc -swift-version 6 -typecheck`; SwiftLint 0.65.1 (Homebrew)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/swift-batch9` (44 extracted snippets, 88 typecheck logs, 42 runtime binaries, targeted probes, fetched source payloads)

## Method

1. Fetched all 16 distinct cited URLs (all HTTP 200): 7 TSPL chapters (Advanced Operators, The Basics, Attributes, Control Flow, Basic Operators, Properties, Enumerations), 4 Apple API pages (Decimal, FloatingPoint, OptionSet, BinaryInteger.isMultiple(of:)), 3 Swift Evolution proposals (SE-0202, SE-0337, SE-0412), 2 SwiftLint rule pages (`convenience_type`, `legacy_constant`). TSPL and Apple human pages are JavaScript shells, so prose was read through their DocC JSON payloads (`docs.swift.org/swift-book/data/...`, `developer.apple.com/tutorials/data/...`); SE proposals as raw markdown; SwiftLint pages as static HTML.
2. Extracted both fenced snippets from all 22 rules (44 files) and ran `swiftc -typecheck` in default mode and `-swift-version 6`: **88/88 exit 0**. One diagnostic anywhere in the 88 runs: `conv-obsoleted` Good emits `warning: unexpected version number for *` in both modes. No rule uses `compile_exempt`.
3. Ran all 42 non-comment snippets as bounded binaries (15 s timeout), plus targeted drivers: decimal vs binary arithmetic, `&+` wrap vs `addingReportingOverflow`, modulo-bias simulation, `% 0` / `% -1` traps and `isMultiple(of:)` edge cases, NaN comparison probes, obsoleted/renamed/availability call-site probes, and two-module `@preconcurrency` declaration/import probes (library + client under Swift 5 minimal, Swift 5 strict, and Swift 6).
4. Probed SwiftLint 0.65.1: `convenience_type` (opt-in; Bad 1 / Good 0) and `legacy_constant` (default-enabled, autocorrectable; Bad 1 / Good 0), both against the exact snippets.
5. Structural audit: frontmatter YAML parse (Psych), required fields, id/path match, severity/enforce/tool consistency, section order, one `swift` fence per Bad/Good, summary length/hedging, anti-slop tokens, `related` and `## See Also` resolution, snippet length, version-in-prose scan, global duplicate ids, cross-pack and within-batch similarity scan; INDEX/file-list consistency; deterministic validator.

## Source evidence (claim-specific)

- **TSPL Advanced Operators** (num-overflow-optin): "arithmetic operators in Swift don't overflow by default"; "Overflow behavior is trapped and reported as an error"; "To opt in to overflow behavior, use Swift's second set of arithmetic operators that overflow by default"; "All of these overflow operators begin with an ampersand".
- **Apple Decimal** (num-decimal-money): abstract - "A structure representing a base-10 number."
- **Apple FloatingPoint** (num-decimal-money, num-nan-check): "sign and a magnitude, where the magnitude is calculated using the type's radix and the instance's significand and exponent"; "the number -8.5 represented as an instance of the Double type, which defines a radix of 2"; "enforces the basic requirements of any IEEE 754 floating-point type"; "Comparing a NaN with any value, including another NaN, results in false. Because testing whether one NaN is equal to another NaN results in false, use the isNaN property to test whether a value is NaN."
- **Apple BinaryInteger.isMultiple(of:)** (num-divisibility): "Returns true if this value is a multiple of the given value"; "Zero is a multiple of everything"; "`x.isMultiple(of: 0)` is true if x is zero and false otherwise"; "`T.min.isMultiple(of: -1)` is true for signed integer T, even though the quotient T.min / -1 isn't representable in type T."
- **SE-0202** (num-random-range): "Not recommended as it introduces modulo bias"; "modulo does not correctly distribute the probability in dividing the upper bound equally within the range"; "`Int.random(in: 5 ..< 12)` which does not use modulo bias"; proposal covers FixedWidthInteger and BinaryFloatingPoint.
- **TSPL The Basics** (num-literal-readability): "Both integers and floats can be padded with extra zeros and can contain underscores to help with readability. Neither type of formatting affects the underlying value of the literal."
- **TSPL Attributes** (conv-renamed, conv-obsoleted, conv-availability-annotation, conv-preconcurrency-*): `renamed` "provides a textual message that indicates the new name for a declaration that's been renamed"; "You can apply the available attribute with the renamed and unavailable arguments to a type alias declaration ... This combination results in a compile-time error that the declaration has been renamed"; `deprecated` indicates the first version in which the declaration was deprecated; `obsoleted` "indicates the first version of the specified platform or language in which the declaration was obsoleted. When a declaration is obsoleted, it's removed from the specified platform or language and can no longer be used"; `introduced` names the first version that provides the declaration; `preconcurrency` applies to imports and to functions/classes/etc., "reduces the strictness of concurrency checking", and "The compiler warns you about any places where the preconcurrency attribute on an import no longer has an effect and should be removed"; "add the preconcurrency attribute when you add concurrency-related constraints to the declaration, if you still have clients that haven't migrated ... Remove the preconcurrency attribute after all your clients have migrated."
- **TSPL Control Flow** (conv-available-runtime, pat-*): availability condition "conditionally execute a block of code, depending on whether the APIs you want to use are available at runtime"; "The patterns you can write after `if case` are the same as the patterns you can write in a switch case"; "The fallthrough keyword doesn't check the case conditions for the switch case that it causes execution to fall into"; labeled statements "you can use a statement label with the break statement to end the execution of the labeled statement ... with the continue statement to end or continue".
- **TSPL Basic Operators** (pat-one-sided-range): "The closed range operator has an alternative form for ranges that continue as far as possible in one direction ... you can omit the value from one side of the range operator. This kind of range is called a one-sided range".
- **TSPL Properties** (const-static-let): "Global constants and variables are always computed lazily"; "Stored type properties are lazily initialized on their first access. They're guaranteed to be initialized only once".
- **TSPL Enumerations** (const-enum-raw, const-case-iterable): "Raw values can be strings, characters, or any of the integer or floating-point number types. Each raw value must be unique within its enumeration declaration"; "The raw value for a particular enumeration case is always the same"; "You enable this by writing : CaseIterable after the enumeration's name. Swift exposes a collection of all the cases as an allCases property".
- **SE-0337** (conv-preconcurrency-*): "a fix-it will suggest using a special kind of import, @preconcurrency import, which silences or downgrades these warnings"; "you will see a warning telling you that the @preconcurrency import is unnecessary"; nominal declarations can be annotated; strict-context diagnostics are downgraded to warnings (line 139: "At use sites whose enclosing scope uses Strict concurrency checking ... the compiler will downgrade any such diagnostics from errors to warnings").
- **SE-0412** (const-static-let): "require every global variable to either be isolated to a global actor or be both: 1. immutable 2. of Sendable type"; "Global variables that are immutable and Sendable can be safely accessed from any context, and otherwise, isolation is required."
- **Apple OptionSet** (const-option-set): "You use the OptionSet protocol to represent bitset types, where individual bits represent members of a set. Adopting this protocol in your custom types lets you perform set-related operations such as membership tests, unions, and intersections on those types. What's more, when implemented using specific criteria, adoption of this protocol requires no extra work on your part"; rawValue "must be of a type that conforms to the FixedWidthInteger protocol"; "create unique options as static properties ... using unique powers of two (1, 2, 4, 8, 16, and so forth)".
- **SwiftLint convenience_type** (const-namespace-enum): "Types used for hosting only static members should be implemented as a caseless enum to avoid instantiation"; "Enabled by default: No" (opt-in); non-triggering example is a caseless `enum Math` with static members.
- **SwiftLint legacy_constant** (const-legacy-constant): "Struct-scoped constants are preferred over legacy global constants"; "Enabled by default: Yes"; "Supports autocorrection: Yes"; triggering examples include `CGPointZero`, `CGRectZero`, `CGSizeZero`, `CGRectNull`, `CGFloat(M_PI)`, `Float(M_PI)`.

## Compile results

- `swiftc -typecheck` default and `-swift-version 6`: **88/88 exit 0** (44 snippets x 2 modes). The only diagnostic is the `conv-obsoleted` Good warning (see Rejections).
- `conv-preconcurrency-import` Bad/Good are comment-only translation units; they parse/typecheck trivially (see Rejections).

## SwiftLint probes (0.65.1, per-file, `--only-rule`)

| rule id | opt-in | correctable | Bad violations | Good violations | notes |
|---|---|---|---|---|---|
| `convenience_type` | yes | no | 1 | 0 | `struct Math { static let pi }` triggers; caseless `enum Math` does not |
| `legacy_constant` | no | yes | 1 | 0 | `CGPointZero` triggers; `CGPoint.zero` does not |

## Harness results (bounded, timeouts)

- **Decimal**: Bad prints `false` (`0.1 + 0.2 == 0.3`), Good prints `true` (`Decimal(1)/Decimal(10) + Decimal(2)/Decimal(10) == Decimal(3)/Decimal(10)`).
- **Overflow**: Bad prints `-9223372036854775808`; Good prints `-9223372036854775808 true` from `addingReportingOverflow`; a plain `Int.max + 1` traps at runtime.
- **Random**: Bad runs (value in 1...6); Good runs. Bias driver `Int.random(in: 0...9) % 3` over 300k samples: `[120535, 89805, 89660]` (expected bias); `Int.random(in: 1...6)` over 300k samples uniform within bounds.
- **Divisibility**: `(0).isMultiple(of: 0)` true, `(5).isMultiple(of: 0)` false, `Int.min.isMultiple(of: -1)` true; `x % 0` traps ("Fatal error: Division by zero in remainder operation", exit 133); `Int.min % -1` traps ("Division results in an overflow in remainder operation", exit 133) and is a compile-time error when constant-folded.
- **NaN**: `v == v` false, `v == .nan` false (compiler itself warns "comparison with '.nan' using '==' is always false, use 'v.isNaN'"), `v.isNaN` true.
- **Literals**: Bad and Good produce identical values (`1000000 1e-09`).
- **Renamed**: using `UserLoading` is an error - "'UserLoading' has been renamed to 'AccountLoading'".
- **Obsoleted**: `@available(swift, obsoleted: 1.0)` and `@available(macOS, obsoleted: 11.0)` both turn calls into errors; `@available(*, unavailable)` also errors. The Good's `@available(*, obsoleted: 1.0)` does **not** (see Rejections).
- **Availability annotation**: `@available(iOS 14, *)` called from an iOS 13 deployment target is an error - "'makeWidget()' is only available in iOS 14 or newer" (with notes to add `@available` or `#available`); no error at iOS 15 target.
- **Availability runtime**: both Bad and Good print `widgets available` on macOS.
- **Preconcurrency declaration** (two-module probe): without `@preconcurrency`, a Swift 6 client passing a non-Sendable closure to the `@Sendable` parameter is an **error**; with `@preconcurrency` on the function: 0 diagnostics in minimal mode, **warning** (downgraded) in Swift 5 strict and in Swift 6 - exactly the documented migration behavior.
- **Preconcurrency import** (two-module probe): `requireSendable(LegacyThing())` under Swift 6 errors ("type 'LegacyThing' does not conform to the 'Sendable' protocol") with a plain import and produces 0 diagnostics with `@preconcurrency import`; a real `@preconcurrency import Foundation` file typechecks clean in both modes.
- **Control flow**: if-case Bad/Good both print `heading north`; fallthrough Bad prints `one|two` (unconditional fall-in) vs Good `one or two`; labeled-loop driver prints `true` (equivalent exit); one-sided range Bad/Good both print `["Brian"]`.
- **Constants**: namespace enum, static let, option set (Bad prints `5`, Good `contains(.priority)` true), raw enum (`GET`), legacy constant (both print `(0.0, 0.0)`), case iterable (`[light, dark]`) - all compile and run.

## Formatting, validator, duplicates, links

- All 22: frontmatter parses (Psych), id/path match, required fields present, `lang: swift`, `baseline: latest`, valid severity/enforce values, `tool` id present wherever `enforce` is `tool`/`both`, exact section order (`Why`, `Bad`, `Good`, `See Also`), exactly one `swift` fence per Bad/Good, summaries <= 30 words with no hedging, no TODO/elision/Unicode-ellipsis, no version numbers in prose, no snippet over 25 lines.
- `related` ids all resolve; all `## See Also` targets resolve and labels are the target ids, per CONTRACT section 4; no duplicate ids anywhere in `catalog/rules/**`.
- Cross-pack similarity scan (normalized Why+body, difflib): highest match for any batch-9 rule is 0.20 (`const-static-let` vs `anti-nonisolated-unsafe`); within-batch max 0.13. Closest pairs read manually and confirmed distinct decisions: `num-nan-check` vs `anti-identical-operands` (NaN semantics vs typo self-comparison), `conv-obsoleted` vs `proj-unavailable`/`api-deprecation` (lifecycle stages vs always-wrong API), `const-static-let` vs `type-let-over-var` (shared/global values vs local bindings), `conv-availability-annotation` vs `conv-available-runtime` (declare on API vs runtime check).
- INDEX.md: all 242 rule files match index entries exactly; all 22 batch-9 entries present.
- Validator (`node dist/rules/cli.js validate --lang swift --json`): **0 errors / 0 warnings**, checkedCount 242.

## Rejections

- **`swift-conv-obsoleted`** - the Good snippet's annotation is not a working `obsoleted` form and emits a compiler warning. `@available(*, obsoleted: 1.0, message: ...)` produces `warning: unexpected version number for *` in both language modes, and a call to the declaration is **not** an error (probe exit 0, warning only) - the rule's own claim that "`obsoleted` turns the same call into an error" is not achieved. Working forms, all verified by probe: `@available(swift, obsoleted: 1.0)` -> "'fetchUser(id:)' is unavailable: ... was obsoleted in Swift 1.0"; `@available(macOS, obsoleted: 11.0)` -> "'fetchUser(id:)' is unavailable in macOS"; `@available(*, unavailable)` -> error. Fix: use a platform (or `swift`) with the version, or show `unavailable` for the platform-agnostic case; drop the `*` + version combination. Stays `draft`.
- **`swift-conv-preconcurrency-import`** - the Bad/Good blocks are comment-only prose, not code: the recommended form `@preconcurrency import LegacyKit` is never shown as code, and the commented line is written in the wrong order (`// import @preconcurrency LegacyKit`), which fails with "error: expected identifier in import declaration" if uncommented. A self-contained snippet was feasible: `@preconcurrency import Foundation` typechecks clean in default and Swift 6 modes. The rule's mechanism is correct (two-module probe: plain import errors under Swift 6 in a Sendable context, `@preconcurrency import` suppresses), but CONTRACT sections 4 and 12 require a compilable snippet showing the decision, not a placeholder. Fix: replace both blocks with real code (e.g. Bad `import Foundation`-based Sendable-context use, Good the same with `@preconcurrency import`). Stays `draft`.
- **`swift-const-legacy-constant`** - the Why's final sentence is false on the baseline: "The global names also disappear from the module in newer SDKs, leaving the member form as the only stable spelling." Under macOS SDK 27.0 and iOS SDK 27.0, `CGPointZero`, `CGRectZero`, `CGSizeZero`, `CGRectNull` and `CGRectInfinite` all typecheck with no diagnostics (headers show plain `API_AVAILABLE`, no deprecation or Swift-unavailable attribute); only `M_PI` is deprecated ("Please use 'Double.pi' or '.pi' to get the value of correct type and avoid casting"). The cited SwiftLint page says nothing about SDK removal. Everything else passes (page quotes, Bad 1 / Good 0 probe, both modes typecheck). Fix: replace the disappearance claim with the compiler-verified deprecation fact (e.g. `M_PI` is deprecated in favor of `Double.pi`). Stays `draft`.

## Non-blocking notes

- `num-nan-check`: with `value = Double.nan`, Bad and Good produce the same output (no print); the defect shown is intent-revealing readability ("reads as a tautology"), and the `value == .nan` case named in the Why is not in the snippet. The compiler itself warns on `== .nan`, which supports the rule. Worth sharpening the Bad later (e.g. non-NaN value where the two forms diverge is impossible by construction; the current pair is acceptable).
- `const-static-let`: "invites mutation from any context" is loose for the shown `@MainActor static var` (mutation is confined to the main actor); the immutable-value decision and the SE-0412/TSPL quotes are exact. Wording tweak later.
- `num-random-range`: the modulo-bias magnitude in the Bad is immeasurable with `0...Int.max` (2^63 mod 6 = 2); the bias principle was demonstrated separately with a small range (`[120535, 89805, 89660]`).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| swift-num-decimal-money | verified | Decimal "base-10" + FloatingPoint radix/IEEE 754 quotes; Bad false / Good true; both modes |
| swift-num-overflow-optin | verified | Advanced Operators overflow/ampersand quotes; wrap vs `addingReportingOverflow` probes; both modes |
| swift-num-random-range | verified | SE-0202 modulo-bias quotes; bias simulation; Good uniform in range; both modes |
| swift-num-divisibility | verified | isMultiple doc incl. both edge cases; `% 0` / `% -1` traps; both modes |
| swift-num-nan-check | verified | FloatingPoint NaN/isNaN quotes; `==` false / `isNaN` true probe; both modes (note) |
| swift-num-literal-readability | verified | The Basics underscore/formatting quote; equal values at runtime; both modes |
| swift-conv-renamed | verified | Attributes `renamed` + typealias quote; probe error "has been renamed to 'AccountLoading'"; both modes |
| swift-conv-obsoleted | **rejected** | Good warns "unexpected version number for *" and does not error on call; working forms need `swift`/platform; see Rejections |
| swift-conv-availability-annotation | verified | Attributes `introduced`; iOS 13 call-site error; no error at iOS 15; both modes |
| swift-conv-available-runtime | verified | Control Flow availability-condition quotes; runs; both modes |
| swift-conv-preconcurrency-import | **rejected** | comment-only snippets; commented line uses invalid `import @preconcurrency` order; real `@preconcurrency import Foundation` typechecks; see Rejections |
| swift-conv-preconcurrency-declaration | verified | Attributes + SE-0337 quotes; module probe: minimal suppresses, strict/Swift 6 downgrades vs error without; both modes |
| swift-pat-if-case | verified | Control Flow `if case` quote; equivalent runtime output; both modes |
| swift-pat-fallthrough | verified | Control Flow "doesn't check the case conditions" quote; `one|two` vs `one or two`; both modes |
| swift-pat-labeled-loop | verified | Control Flow labeled-statement quotes; equivalence driver prints `true`; both modes |
| swift-pat-one-sided-range | verified | Basic Operators one-sided-range quotes; identical output; both modes |
| swift-const-namespace-enum | verified | SwiftLint page quote (opt-in); probe Bad 1 / Good 0; both modes |
| swift-const-static-let | verified | SE-0412 immutable/Sendable quotes + Properties lazy-init quote; both modes (note) |
| swift-const-option-set | verified | OptionSet bitset/membership/FixedWidthInteger/powers-of-two quotes; runs; both modes |
| swift-const-enum-raw | verified | Enumerations raw-value/uniqueness quotes; runs; both modes |
| swift-const-legacy-constant | **rejected** | SDK 27 probes: `CGPointZero`/`CGRectZero`/`CGRectNull` still present, no deprecation; Why's disappearance sentence false; see Rejections |
| swift-const-case-iterable | verified | Enumerations CaseIterable/allCases quote; runs; both modes |

## Counts

- Verified: **19/22** (`num` 6/6, `conv` 4/6, `pat` 4/4, `const` 5/6)
- Rejected: **3/22** (`conv-obsoleted`, `conv-preconcurrency-import`, `const-legacy-constant`; left `draft`)
- Blockers: none

Only the 19 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched. No git operations were performed. `INDEX.md` counts will need the batch owner's update after the flips.

## Addendum - Re-verification of the three rejected rules (2026-10-05)

The batch author fixed the three rejections; all three were re-checked with the same toolchain (Apple Swift 6.4, SwiftLint 0.65.1) and are now **verified**.

- **`swift-conv-obsoleted` - verified.** The Good now uses `@available(swift, obsoleted: 1.0, message: "Use fetchAccount(id:)")`. The snippet typechecks with 0 diagnostics in default and Swift 6 modes (the previous `warning: unexpected version number for *` is gone), and a call probe now genuinely errors: `error: 'fetchUser(id:)' is unavailable: Use fetchAccount(id:)` with note `'fetchUser(id:)' was obsoleted in Swift 1.0` (exit 1). The Why's claim is demonstrated.
- **`swift-conv-preconcurrency-import` - verified.** Both blocks are now real code (`import Foundation` vs `@preconcurrency import Foundation`, each with a `@MainActor` body). Both typecheck with 0 diagnostics in default mode, Swift 6, Swift 5 `-strict-concurrency=complete`, and Swift 5 `-warn-concurrency`. The attribute is in the valid `@preconcurrency import` position; the earlier comment-only/placeholder defect and the mis-ordered commented syntax are resolved. The mechanism remains verified by the two-module probe in the main report (plain import errors under Swift 6 in a Sendable context; `@preconcurrency import` suppresses).
- **`swift-const-legacy-constant` - verified.** The false "disappear from newer SDKs" sentence is removed. The Why now rests on SwiftLint's default-enabled + autocorrect behavior (page: "Enabled by default: Yes", "Supports autocorrection: Yes"; installed 0.65.1: opt-in no, correctable yes). Snippets unchanged, both modes typecheck, SwiftLint probe unchanged: Bad 1 / Good 0.

Structural re-audit of the three: section order, one `swift` fence per Bad/Good, summary lengths, `related` and `## See Also` all resolve. Duplicate scan unchanged (no new overlap).

**Final counts: verified 22/22, rejected 0** (`num` 6/6, `conv` 6/6, `pat` 4/4, `const` 6/6).
