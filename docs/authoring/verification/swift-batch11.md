# Verification Report - Swift `ui` + `ffi` + `macro` + `test` Batch 11

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/swift/ui-*.md` (17), `ffi-*.md` (8), `macro-*.md` (6), `test-*.md` (6) = 37; all entered as `status: draft`; **37/37 flipped to `verified`**
- Toolchain: Apple Swift 6.4 (swiftlang-6.4.0.34.1, clang-2100.3.34.1), arm64-apple-macosx26.0; `swiftc -typecheck` (default) and `swiftc -typecheck -swift-version 6`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/batch11` (74 extracted snippets, 148 typecheck runs, 9 probes, 27 fetched DocC payloads)

## Method

1. Fetched all 26 distinct cited URLs (all HTTP 200) through their DocC JSON payloads (`developer.apple.com/tutorials/data/...`, `docs.swift.org/swift-book/data/...`) because the human pages are JavaScript shells; read abstract/discussion/parameter text and checked it against each rule's Why. Also fetched `NavigationView` to confirm the deprecation summary.
2. Extracted both fenced snippets from all 37 rules (74 files) and ran `swiftc -typecheck` in default mode and `-swift-version 6`: **148/148 exit 0**. Macro rules emit the expected "external macro implementation type ... could not be found" warning (plugin modules absent locally); no rule uses `compile_exempt`.
3. Test rules use comment-only snippets: confirmed locally that `import Testing` and `import XCTest` both fail with `no such module`; performed a manual semantic pass on every snippet and confirmed each Swift Testing API claim against the fetched migration guide.
4. Ran bounded runtime/compile probes (`timeout`/`gtimeout`, 60 s) for the ffi and macro attribute effects and the cstring behavior; UI rules are typecheck-level per batch instructions.
5. Structural audit: frontmatter, id/path match, section order, one `swift` fence per Bad/Good, summary word counts, anti-slop tokens, version-string scan, `related` / `## See Also` resolution; duplicate symbol scan across the whole Swift pack; deterministic validator (`node dist/rules/cli.js validate --lang swift --no-compile`).

## Source evidence (claim-specific)

- **accessibilityLabel(_:)** (ui-accessibility-label): "Adds a label to the view that describes its contents."; discussion "Use this method to provide an accessibility label for a view that doesn't display text, like an icon."
- **animation(_:value:) / animation(_:)** (ui-animation-value): "Applies the given animation to this view when the specified value changes." vs "Applies the given animation to this view when this view changes."
- **AppStorage** (ui-appstorage): "A property wrapper type that reflects a value from `UserDefaults` and invalidates a view on a change in value in that user default."
- **State / Binding** (ui-binding-child, ui-state-ownership, ui-observable): "If you pass a state property to a subview, SwiftUI updates the subview any time the value changes in the container view, but the subview can't modify the value. To enable the subview to modify the state's stored value, pass a `Binding` instead."; "Get the binding ... by prefixing the property name with a dollar sign"; "Declare state as private ... Use state only for storage that's local to a view and its subviews."; "It's possible to store an object that conforms to the `ObservableObject` protocol in a `State` property. However the view will only update when the reference to the object changes ... The view will not update if any of the object's published properties change. To track changes ... use `StateObject` instead."
- **accessibilityHidden(_:)** (ui-decorative-image): "Specifies whether to hide this view from system accessibility features."
- **Environment** (ui-environment): "Use the `Environment` property wrapper to read a value stored in a view's environment. Indicate the value to read using an `EnvironmentValues` key path."
- **ForEach** (ui-foreach-constant-count, ui-list-id): "A structure that computes views on demand from an underlying collection of identified data."; "Some containers like `List` or `LazyVStack` will query the elements within a for each lazily. To obtain maximal performance, ensure that the view created from each element in the collection represents a constant number of views. For example ... an if statement ... either 1 or 0 views, a non-constant number ... wrapping the condition in a `Group`."
- **LazyVStack** (ui-lazy-stack): "A view that arranges its children in a line that grows vertically, creating items only as needed."
- **NavigationStack / migration article** (ui-navigationstack): "A view that displays a root view and enables you to present additional views over the root view."; "Improve navigation behavior in your app by replacing navigation views with navigation stacks and navigation split views."; NavigationView page carries deprecation summary "Use NavigationStack and NavigationSplitView ...".
- **Observable()** (ui-observable): "This macro adds observation support to a custom type and conforms the type to the `Observable` protocol."
- **Color** (ui-semantic-color): "A representation of a color that adapts to a given context."; "SwiftUI only resolves a color to a concrete value just before using it in a given environment. This enables a context-dependent appearance for system defined colors, or those that you load from an Asset Catalog."
- **Font** (ui-semantic-font): "An environment-dependent font."; "The system resolves a font's value at the time it uses the font in a given environment because `Font` is a late-binding token."
- **View.task(...)** (ui-task-modifier): "A closure that SwiftUI calls as an asynchronous task before the view appears. SwiftUI will automatically cancel the task at some point after the view disappears before the action completes."; "If the task doesn't finish before SwiftUI removes the view or the view changes identity, SwiftUI cancels the task."
- **View.transition(_:)** (ui-transition): "When this view appears or disappears, the transition will be applied to it, allowing for animating it in and out."
- **withAnimation(_:_:)** (ui-with-animation): "Returns the result of recomputing the view's body with the provided animation."; "This function sets the given animation as the animation property of the thread's current Transaction."
- **TSPL Attributes** (ffi-convention-block, ffi-convention-c, ffi-nonobjc, ffi-objc-members, ffi-objc-name): block argument "indicates an Objective-C compatible block reference. The function value is represented as a reference to the block object, which is an id-compatible Objective-C object ... The invocation function uses the C calling convention."; "A function with the Objective-C block calling convention can't be converted to the C calling convention."; c argument "indicates a C function reference. The function value carries no context and uses the C calling convention. ... A nongeneric global function, a local function that doesn't capture any local variables, or a closure that doesn't capture any local variables can be converted ... Other Swift functions can't be converted."; nonobjc "tells the compiler to make the declaration unavailable in Objective-C code"; "Applying this attribute to an extension has the same effect as applying it to every member ... not explicitly marked"; "resolve circularity for bridging methods ... allow overloading"; objcMembers "implicitly apply the objc [attribute] to all Objective-C compatible members of the class, its extensions, its subclasses, and all of the extensions of its subclasses. Most code should use the objc attribute instead, to expose only the declarations that are needed ... can increase your binary size and adversely affect performance."; "If you specify the Objective-C name for a class, protocol, or enumeration, include a three-letter prefix on the name."
- **String.init(cString:)** (ffi-cstring): "Creates a new string by copying the null-terminated UTF-8 data referenced by the given pointer." (CChar); the UInt8 overload "is identical to [the CChar one] but operates on an unsigned sequence of bytes."
- **NSSecureCoding** (ffi-nssecurecoding): "A protocol that enables encoding and decoding in a manner that is robust against object substitution attacks."; "by the time you can verify the class type, the object has already been constructed, and if this is part of a collection class, potentially inserted into an object graph"; an overriding class "must decode any enclosed objects using the decodeObjectOfClass:forKey: method" and "must override the getter for its supportsSecureCoding property to return true."
- **OpaquePointer** (ffi-opaque-pointer): "A wrapper around an opaque C pointer. Opaque pointers are used to represent C pointers to types that cannot be represented in Swift, such as incomplete struct types."
- **TSPL Macros** (macro-*): attached names upper camel case, freestanding lower camel case; "Macros are always declared as public. Because the code that declares a macro is in a different module from code that uses that macro, there isn't anywhere you could apply a nonpublic macro."; "@attached(extension, conformances: OptionSet)" second role "tells you that OptionSet adds conformance to the OptionSet [protocol]"; names list "guaranteed to produce only declarations that use those names", `@OptionSet` lists RawValue/rawValue/init plus `arbitrary`; "A macro declaration defines the macro's roles — the places in source code where that macro can be called, and the kinds of code the macro can generate."; `#function` "replaces [the macro] with the name of the current function."
- **Migrating a test from XCTest / Swift Testing** (test-*): "In XCTest, a test method must be a member of a test class and its name must start with test. The testing library doesn't require a test function to have any particular name. Instead, it identifies a test function by the presence of the @Test attribute."; overview "Define test functions almost anywhere with a single attribute."; "XCTest uses a family of approximately 40 functions ... collectively referred to as XCTAssert ... two replacements ... except that #require throws an error if its condition isn't met."; "XCTest also has a function, XCTUnwrap ... When using the testing library, you can use #require with optional expressions to unwrap them."; "By default, the testing library runs all tests in a suite in parallel. The default behavior of XCTest is to run each test in a suite sequentially. ... Annotate your test suite with .serialized to run tests within that suite serially."; "implement init() and/or deinit instead ... If teardown is needed, declare your test suite as a class or as an actor rather than as a structure"; "The testing library refers to such a type as a suite. These types do not need to be classes, and they don't inherit from XCTestCase ... generally recommended that a Swift structure or actor be used instead of a class because it allows the Swift compiler to better-enforce concurrency safety."

## Compile results

- `swiftc -typecheck` default and `-swift-version 6`: **148/148 exit 0** (74 snippets x 2 modes). Macro rules emit only the expected plugin-absent warning; no other diagnostics, no deprecation warnings.
- Validator harness (`swiftc -parse`, comment-only test snippets parse cleanly): see validator section.

## Probe results (bounded)

| probe | result | claim confirmed |
|---|---|---|
| cstring byte-walk vs `String(cString:)` | `bad=[hÃ©llo â...] good=[héllo — 日本] equal=false` | hand-walked bytes drift on multi-byte UTF-8; initializer decodes correctly |
| `@convention(c)` non-capturing closure | runs, `sorted=1` | documented convertible forms |
| `@convention(c)` capturing closure | full compile error: "a C function pointer cannot be formed from a closure that captures context" (note: `-typecheck` alone misses this diagnostic) | "Other Swift functions can't be converted" |
| `@convention(block)` to `@convention(c)` assignment | error: "a C function pointer can only be formed from a reference to a 'func' or a literal closure" | block convention cannot convert to C |
| `@convention(block)` bridging | stored in `NSArray`, invoked via `unsafeBitCast`: `blockBridge=42 class=__NSMallocBlock__` | block is an id-compatible object |
| NSSecureCoding round trip | Good: `secure=true roundtrip=Ada`; NSCoding-only class rejected by `archivedData(requiringSecureCoding: true)` | secure archive round trip requires NSSecureCoding |
| `@objc(name)` | `named=ACMTracking` vs unprefixed `p5.Unprefixed` | name argument sets the Objective-C runtime name |
| `@objcMembers` vs per-member `@objc` vs `@nonobjc` | unmarked helper exposed=true (Bad) / false (Good); marked `deposit:` exposed; `@nonobjc update` not exposed while `balance` is | exposure scope differs as the rule claims |
| `#function` after rename | hard-coded prints `report`; `#function` prints `send()` | rename tracking |
| internal vs public macro across modules | internal: importer error "no macro named 'myLine'"; public: visible, fails only on missing plugin "external macro implementation type 'M.T' could not be found" | nonpublic macro cannot serve other modules |
| `import Testing` / `import XCTest` | both `no such module` | comment-only test snippets are the only local option |

## Formatting, validator, duplicates, links

- All 37: id/path match, required frontmatter present, `lang`/`prefix`/`severity`/`enforce`/`baseline` valid, exact section order (`Why`, `Bad`, `Good`, `See Also`), exactly one `swift` fence per Bad/Good, summaries <= 30 words with no hedging, no TODO/elision/Unicode-ellipsis/version strings.
- `related` ids and all `## See Also` targets resolve; ids globally unique; INDEX.md lists all 37 batch files exactly once; categories.md progress rows still say "batch 11, draft" (counts files are outside this batch's ownership and were left untouched).
- Duplicate scan: no repeated titles in the pack; none of the batch symbols (`withAnimation`, `NavigationStack`, `AppStorage`, `@Observable`, `accessibilityLabel`, `LazyVStack`, `ForEach`, `@Binding`, `@convention`, `NSSecureCoding`, `OpaquePointer`, `String(cString:`, `#expect`, `#require`, `@Test`) appears in any non-batch rule. Closest pairs are the deliberate cross-referenced sets (ui-animation-value / ui-with-animation / ui-transition; ffi-convention-block / ffi-convention-c; ffi-nonobjc / ffi-objc-members; macro-names-list / macro-extension-conformances; test-expect / test-require) — distinct decisions, cross-linked.
- Deterministic validator: `validate --lang swift --no-compile` and the full run with snippet compilation (`validate --lang swift`, `swiftc -parse` harness): **279 rules, 0 errors, 0 warnings**, before and after the status flip.

## Non-blocking notes

- `swift-ffi-convention-block`: Swift implicitly bridges closure literals when passing them directly to an Objective-C block parameter; the rule's decision concerns a declared function value whose type must be the block type. The snippet and the book's block-argument description support the rule as written.
- `swift-ui-task-modifier`: "The modifier also runs the action when the view's identity changes" is implied by the documented run-before-appearance plus cancellation on removal/identity change; it is not a verbatim sentence on the cited page. Core lifetime/cancellation claim is verbatim.
- `swift-ui-appstorage`: the "State storage is tied to the view's lifetime" sentence is background knowledge; the AppStorage claim itself is verbatim on the cited page.
- Macro snippets typecheck with a plugin-absent warning locally (implementation modules do not exist in this checkout); the validator harness passes and the declarations are well-formed.
- `test-*` rules: comment-only snippets by batch design (Testing/XCTest unavailable locally); API usage (`@Test`, `#expect`, `try #require`, `@Suite(.serialized)`, `init`/`deinit`) matches the migration guide, including the throwing test signature for `#require`.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| swift-ui-accessibility-label | verified | label/icon discussion quote; 2/2 typecheck |
| swift-ui-animation-value | verified | value-change vs view-change abstracts on both overloads; 2/2 typecheck |
| swift-ui-appstorage | verified | AppStorage abstract verbatim; 2/2 typecheck |
| swift-ui-binding-child | verified | State sharing + `$` binding quotes; 2/2 typecheck |
| swift-ui-decorative-image | verified | accessibilityHidden abstract verbatim; 2/2 typecheck |
| swift-ui-environment | verified | Environment wrapper + key-path quote; 2/2 typecheck |
| swift-ui-foreach-constant-count | verified | ForEach constant-number/Group passage verbatim; 2/2 typecheck |
| swift-ui-lazy-stack | verified | LazyVStack "creating items only as needed"; 2/2 typecheck |
| swift-ui-list-id | verified | ForEach identified-data + Identifiable/id quote; 2/2 typecheck |
| swift-ui-navigationstack | verified | migration article + NavigationStack abstract + NavigationView deprecation summary; 2/2 typecheck |
| swift-ui-observable | verified | Observable() macro + State ObservableObject/StateObject passage; 2/2 typecheck |
| swift-ui-semantic-color | verified | Color context-adaptation passage verbatim; 2/2 typecheck |
| swift-ui-semantic-font | verified | Font environment-dependent/late-binding quotes; 2/2 typecheck |
| swift-ui-state-ownership | verified | State private/local-storage quotes; 2/2 typecheck |
| swift-ui-task-modifier | verified | task lifetime/cancellation quotes; 2/2 typecheck; see note |
| swift-ui-transition | verified | transition(_:) "appears or disappears" discussion; 2/2 typecheck |
| swift-ui-with-animation | verified | withAnimation recompute + transaction quotes; 2/2 typecheck |
| swift-ffi-convention-block | verified | book block-argument quote; block→c conversion probe rejected; 2/2 typecheck |
| swift-ffi-convention-c | verified | book c-argument quote; capture probe rejected at compile; 2/2 typecheck |
| swift-ffi-cstring | verified | both init(cString:) pages; mojibake-vs-correct probe; 2/2 typecheck |
| swift-ffi-nonobjc | verified | book nonobjc quotes; `@nonobjc` member absent from runtime selector list; 2/2 typecheck |
| swift-ffi-nssecurecoding | verified | substitution/object-graph/decodeObjectOfClass quotes; secure round-trip probe; 2/2 typecheck |
| swift-ffi-objc-members | verified | objcMembers "most code should use objc" + binary-size quote; exposure-scope probe; 2/2 typecheck |
| swift-ffi-objc-name | verified | three-letter-prefix quote; runtime name probe `ACMTracking`; 2/2 typecheck |
| swift-ffi-opaque-pointer | verified | OpaquePointer abstract/overview verbatim; 2/2 typecheck |
| swift-macro-call-site-function | verified | #function "name of the current function" quote; rename probe; 2/2 typecheck |
| swift-macro-declaration-public | verified | "always declared as public" + different-module quote; internal-vs-public cross-module probe; 2/2 typecheck |
| swift-macro-extension-conformances | verified | second-role "adds conformance" quote; 2/2 typecheck |
| swift-macro-names-list | verified | names-guarantee quote + RawValue/rawValue/init/arbitrary listing; 2/2 typecheck |
| swift-macro-naming | verified | upper/lower camel case sentence verbatim; 2/2 typecheck |
| swift-macro-role-match | verified | roles definition + freestanding attribute + expression-macro quote; 2/2 typecheck |
| swift-test-define-with-attribute | verified | migration-guide @Test quote + overview "single attribute"; manual pass |
| swift-test-expect | verified | ~40 XCTAssert family + two replacements quote; manual pass |
| swift-test-require | verified | XCTUnwrap + "#require with optional expressions" quote; manual pass |
| swift-test-serialized | verified | parallel-default/shared-state/.serialized passage verbatim; manual pass |
| swift-test-setup-teardown | verified | setUp/tearDown -> init/deinit + class-or-actor-for-teardown quote; manual pass |
| swift-test-suite-types | verified | suite/XCTestCase/remove-conformance/structure-or-actor quotes; manual pass |

## Counts

- Verified: **37/37** (ui 17/17, ffi 8/8, macro 6/6, test 6/6)
- Rejected: **0/37**
- Blockers: none

Only the 37 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched. No git operations were performed.
