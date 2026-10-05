# Verification Report — C++ Batch 12 (tmpl + trait)

**Verifier:** adversarial subagent (separate context; did not author these rules)
**Date:** 2026-10-05
**Scope:** 19 draft rules — 10 `catalog/rules/cpp/tmpl-*.md`, 9 `catalog/rules/cpp/trait-*.md`
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), arm64-apple-darwin25.6.0; `-std=c++23 -Wall`; 10 s timeouts on runs
**Pre-state:** all 19 files `status: draft`

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; applied all four checks per rule.
2. Fetched all 15 distinct cited URLs (cppreference Templates, template argument deduction, alias templates, fold expressions, dependent names, explicit specialization, CTAD, SFINAE, constraints/concepts, concepts library, requires expression, enable_if, declval, is_integral; Core Guidelines) and confirmed each claim against the page text.
3. Extracted all 38 fenced snippets and compiled each independently with `clang++ -fsyntax-only -std=c++23 -Wall`, then linked and ran each with a 10 s timeout.
4. Ran focused probes (snippets unmodified; probes replicate rule logic) for the traps: instantiated dependent-name Bad, function-specialization vs overload, empty folds, tag dispatch on a list iterator, over- vs minimally-constrained concepts, hand-rolled vs standard concepts, declval on a non-default-constructible type, CTAD type identity, forwarding value category, concept assertion failure, and constrained-call rejection.
5. Mechanical checks: frontmatter fields, id/path match, baseline literal, section order, one `cpp` fence per Bad/Good, summary ≤ 30 words and hedge-free, snippets ≤ 25 lines, `related` IDs and See Also links resolve, INDEX file lists match (tmpl 10 / trait 9), no TODO/elisions/Unicode ellipsis/YAML null traps, no linter claims without `enforce: tool`; duplicate review within the batch and against the rest of the pack; deterministic validator (`node dist/rules/cli.js validate --lang cpp --json`).

## Source verification (evidence quotes)

- **CTAD** — "the compiler will deduce the template arguments from the type of the initializer … `std::pair p(2, 4.5); // deduces to std::pair<int, double>`"; T.44 note: "C++17 will make this rule redundant by allowing the template arguments to be deduced directly from constructor arguments". (`tmpl-ctad`)
- **Explicit specialization** — "Allows customizing the template code for a given set of template arguments"; "`template <>` declaration"; "Specialization must be declared before the first use that would cause implicit instantiation"; "A function with the same name and the same argument list as a specialization is not a specialization"; T.144: "function template specializations don't participate in overloading". (`tmpl-specialization`, `tmpl-specialize-function`)
- **Dependent names** — "a name that is not a member of the current instantiation and is dependent on a template parameter is not considered to be a type unless the keyword `typename` is used"; "a dependent name that is not a member of the current instantiation is not considered to be a template name unless the disambiguation keyword `template` is used"; the page's own example (`int p = 1;`, `std::vector<T>::const_iterator* p;` "parsed as multiplication … this template definition compiles") mirrors the rule's Bad. (`tmpl-dependent-names`)
- **Template argument deduction** — "If `P` is an rvalue reference to a cv-unqualified template parameter (so-called forwarding references), and the corresponding function call argument is an lvalue, the type lvalue reference to `A` is used in place of `A` for deduction (Note: this is the basis for the action of `std::forward`)". T.47: "An unconstrained template argument is a perfect match for anything so such a template can be preferred over more specific types that require minor conversions." (`tmpl-forwarding-reference`, `tmpl-forwarding-greedy`)
- **Templates** — "A template is a C++ entity that defines one of the following: a family of classes …, a family of functions …"; T.2 title. (`tmpl-generic-algorithm`)
- **Fold expressions** — four forms (unary/binary, left/right); "When a unary fold is used with a pack expansion of length zero, only … `&&` (value `true`), `||` (value `false`), comma (value `void()`)". (`tmpl-variadic-fold`)
- **SFINAE** — "Where applicable, tag dispatch, if constexpr, and concepts are usually preferred over use of SFINAE"; T.65 title. (`tmpl-tag-dispatch`)
- **Type alias** — "Alias template is a name that refers to a family of types"; specialization "equivalent to the result of substituting the template arguments … for the template parameters"; T.42 title. (`tmpl-alias`)
- **declval** — "converts any type `T` (which may be an incomplete type) to an expression of that type, making it possible to use member functions of T without the need to go through constructors"; "commonly used in templates where acceptable template parameters may have no constructor in common, but have the same member function whose return type is needed". (`trait-declval`)
- **requires expression** — "Yields a prvalue expression of type `bool` that describes the constraints"; simple requirement "asserts that expression is valid"; type/compound/nested requirements defined. (`trait-requires-expression`)
- **Constraints and concepts** — "Violations of constraints are detected at compile time, early in the template instantiation process" with the `std::sort` diagnostic example; "A conjunction of two constraints is satisfied only if both constraints are satisfied"; subsumption via identical atomic constraints; constrained placeholder in abbreviated function templates; T.10/T.11/T.13 titles. (`trait-constrain-templates`, `trait-minimal-requirements`, `trait-standard-concepts`, `trait-shorthand`)
- **Concepts library** — "compile-time validation of template arguments and perform function dispatch based on properties of types"; `same_as`, `derived_from`, `convertible_to`, `integral`, `floating_point`, `constructible_from`, `default_initializable`, `equality_comparable`, `totally_ordered`, `movable`, `copyable`, `semiregular`, `regular`, `invocable`, `predicate` listed; T.150 title. (`trait-standard-concepts`, `trait-check-class`)
- **is_integral** — class template with member `value` plus "Helper variable template `template<class T> constexpr bool is_integral_v = is_integral<T>::value;`"; page example uses `std::is_integral_v<float> == false`. (`trait-v-suffix`)
- **enable_if** — "a convenient way to leverage SFINAE prior to C++20's concepts, in particular for conditionally removing functions from the candidate set"; "otherwise, there is no member typedef"; T.48 title. (`trait-enable-if-legacy`)

## Compile results (`-fsyntax-only -std=c++23 -Wall`)

- **38/38 snippets exit 0 with zero output** — no warnings, no errors.
- All 38 also link; all run within timeout.

## Behavior results (snippets unmodified; exit codes and probes)

- **tmpl-forwarding-greedy:** Bad rc=1 — the unconstrained `T&&` template is selected for `describe(std::string{"x"})` (comment "picks the template" confirmed); Good rc=0 (constrained template stands aside).
- **tmpl-specialization:** Good rc=0; Bad rc=0 by construction — its shown check compares the object-size result against `sizeof(std::string)`. Probe: `WireSize<std::string>::of(std::string{"abc"})` equals `sizeof(std::string)` and is not 3, so the "wrong for strings" comment is accurate.
- **tmpl-specialize-function:** probe with primary `f(T)`, specialization of it for `int*`, and overload `f(T*)` prints "overload #3" — the specialization does not participate in overload resolution, matching the function_template quote.
- **tmpl-dependent-names:** instantiating the Bad-style `fill` fails with "missing 'typename' prior to dependent type name 'std::vector<int>::const_iterator'"; Good compiles and runs rc=0.
- **tmpl-variadic-fold:** probe — `(... && pack)` on an empty pack is `true`, `(... || pack)` is `false`; rc=0.
- **tmpl-tag-dispatch:** Good-style tag dispatch over `std::list` compiles and advances (rc=0); Bad-style runtime branch with `it += n` fails for a list iterator ("no viable overloaded '+='"), confirming "both branches must compile for every iterator".
- **trait-minimal-requirements:** probe — a move-only comparable type is rejected by `std::copyable<T> && comparable` and accepted by the minimal comparison concept.
- **trait-standard-concepts:** probe — the hand-rolled `integral_like` accepts `std::string` (`value + value` is valid) while `std::integral<std::string>` is false.
- **trait-declval:** probe — `decltype(std::declval<T>() + …)` works for a non-default-constructible type; the `T{}`-based alias fails with "call to deleted constructor".
- **tmpl-ctad:** probe — `decltype(std::pair(1, 2.5))` is `std::pair<int, double>`.
- **tmpl-forwarding-reference:** probe — lvalue argument yields one copy and zero moves; rvalue argument yields a move.
- **trait-check-class:** probe — an `operator==` that loses `const` makes `static_assert(std::equality_comparable<Widget>)` fail.
- **trait-constrain-templates:** probe — `half("abc")` fails with "no matching function for call to 'half'" (constraint rejects it).
- All remaining rules (tmpl-alias, tmpl-generic-algorithm, trait-requires-expression, trait-shorthand, trait-v-suffix, trait-enable-if-legacy) run rc=0 on the shown inputs; their claims are carried by the source quotes above.

## Duplicates / formatting / links

- Mechanical script over all 19: ids match paths, `lang`/`prefix` correct, `severity`/`enforce` in enum, `baseline: latest`, ≥ 1 https source, all `related` IDs resolve, one `## Why`/`## Bad`/`## Good`/`## See Also` each, exactly one `cpp` fence per Bad/Good, snippets ≤ 25 lines, summaries ≤ 30 words and hedge-free, no TODO/FIXME/XXX/TBD, no bare `...` lines, no Unicode ellipsis, no YAML null trap, no linter claims without `enforce: tool`, all See Also files exist, INDEX lists all 19 with matching file lists (tmpl 10, trait 9) — **no issues**.
- Deterministic validator: **0 errors**; 13 pack-wide warnings, 1 touching this batch (`trait-shorthand`: "forbidden token 'placeholder'" — the legitimate cppreference term "constrained auto placeholder"; warning-level, non-blocking per CONTRACT §12).
- No duplicate IDs or decisions within the batch; pairwise splits reviewed: `tmpl-specialization` vs `tmpl-specialize-function` (class vs function), `tmpl-forwarding-reference` vs `tmpl-forwarding-greedy` (use `T&&` vs constrain it), `tmpl-ctad` vs `tmpl-alias` (deduce arguments vs name families), `trait-constrain-templates` vs `trait-shorthand` vs `trait-requires-expression` (requires-clause vs abbreviated form vs ad-hoc requirements), `trait-standard-concepts` vs `trait-minimal-requirements` vs `trait-enable-if-legacy` (which concepts vs how much vs legacy alternative), `trait-v-suffix` vs `trait-enable-if-legacy` (helper forms vs the metafunction itself).
- Cross-pack: only `macro-no-variadic-c` mentions fold expressions (its Good snippet uses one; cross-linked from `tmpl-variadic-fold`, distinct rule). `test-static-assert` vs `trait-check-class` distinct (runtime-vs-compile invariant vs T.150 class-models-concept assertion); `perf-sink-move` vs `tmpl-forwarding-reference` distinct (constructor sink vs generic forwarding), cross-linked.

## Verdicts

| rule id | verdict | evidence | notes |
|---|---|---|---|
| cpp-tmpl-alias | verified | type_alias "family of types" + substitution semantics; T.42; 2/2 compile+run | — |
| cpp-tmpl-ctad | verified | CTAD page initializer-deduction quote; T.44 note that C++17 makes it redundant; type-identity probe | — |
| cpp-tmpl-dependent-names | verified | dependent_name typename/template quotes; page example mirrors Bad; instantiation probe | — |
| cpp-tmpl-forwarding-greedy | verified | deduction forwarding-ref rule; T.47 "preferred over more specific types"; Bad rc=1 | Overload-preference detail lives in overload-resolution rules (T.47 carries the outcome; behavior probed) |
| cpp-tmpl-forwarding-reference | verified | deduction forwarding-ref quote incl. `std::forward` basis; copy/move probe | — |
| cpp-tmpl-generic-algorithm | verified | templates "family of classes/functions"; T.2; 2/2 compile+run | — |
| cpp-tmpl-specialization | verified | template_specialization syntax + declare-before-use quote; T.64; Good rc=0 | Bad's shown check returns 0 by design (asserts the wrong object-size result); wrongness pinned by probe (≠ 3) |
| cpp-tmpl-specialize-function | verified | template_specialization "not a specialization"; T.144 "don't participate in overloading"; overload probe | One Why clause ("used only after overload resolution selects the primary") is stated on the function_template page, not the cited page; fact and behavior verified |
| cpp-tmpl-tag-dispatch | verified | SFINAE "tag dispatch … preferred"; T.65; list-iterator probes (Good rc=0, Bad compile-fail) | — |
| cpp-tmpl-variadic-fold | verified | fold four forms + empty-pack values; empty-fold probe | — |
| cpp-trait-check-class | verified | concepts library compile-time-validation quote; T.150; non-const `==` probe fails as intended | — |
| cpp-trait-constrain-templates | verified | constraints "checked early … easy to follow error messages"; T.10; `half("abc")` rejection probe | — |
| cpp-trait-declval | verified | declval incomplete-type/no-constructor quotes; non-default-constructible probes | — |
| cpp-trait-enable-if-legacy | verified | enable_if "prior to C++20's concepts" + no-member-typedef quote; T.48; 2/2 compile+run | — |
| cpp-trait-minimal-requirements | verified | conjunction satisfaction rule; T.41; move-only probe | — |
| cpp-trait-requires-expression | verified | requires simple/type/compound/nested definitions; constraints early-check quote; 2/2 compile+run | — |
| cpp-trait-shorthand | verified | constraints abbreviated-function-template rule; function_template `f2(C1 auto)` equivalence; T.13; 2/2 compile+run | Validator warns on "placeholder" (technical term, warning-level, non-blocking) |
| cpp-trait-standard-concepts | verified | concepts library concept list; T.11; `integral_like<std::string>` vs `std::integral` probe | — |
| cpp-trait-v-suffix | verified | is_integral helper variable template + page example; 2/2 compile+run | — |

**Counts: verified 19/19, rejected 0.** All 19 `status: draft` → `status: verified` flipped; no other edits; batch 11 `unsafe`/`ptr` untouched.

## Blockers / follow-ups (outside verifier ownership)

- `catalog/rules/cpp/INDEX.md` header still reads `Rules: 276 (verified: 235)`; after these 19 flips the verified count should be 254. `categories.md` batch status still says batch 12 is `status: draft`. Both updates are outside verifier ownership.
- Non-blocking citation notes (kept as-is; each fact behavior-verified): `tmpl-specialize-function` draws one clause from the function_template page; `tmpl-forwarding-greedy` draws the overload-preference outcome from overload resolution (T.47 cited). `trait-shorthand` triggers the validator's warning-only "placeholder" token check.
