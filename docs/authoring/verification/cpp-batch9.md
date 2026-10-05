# Verification Report — C++ Batch 9 (coll + const)

**Verifier:** adversarial (separate context; did not author these rules)
**Date:** 2026-10-05
**Scope:** 24 draft rules — 12 `catalog/rules/cpp/coll-*.md`, 12 `catalog/rules/cpp/const-*.md`
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), arm64-apple-darwin25.6.0; `-std=c++23`

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; applied the five checks per rule.
2. Fetched all 18 distinct cited URLs (all HTTP 200) and grepped each for the specific claim; fetched the `map::operator[]` subpage as supporting evidence. Core Guidelines rule texts were read from the published page (Con.1–5, ES.50, ES.71, SL.con.1/2/4).
3. Extracted all 48 fenced snippets and compiled each independently with `clang++ -fsyntax-only -std=c++23 -Wall`.
4. Ran all 48 snippets under ASan/UBSan (`-fsanitize=address,undefined -fno-sanitize-recover=all`, `detect_stack_use_after_return=1`) plus five compile-time probes and one vector-bool reallocation probe.
5. Mechanical checks: frontmatter fields, id/path match, section order, one `cpp` fence per Bad/Good, summary ≤ 30 words, snippets ≤ 25 lines, `related`/See Also links resolve and agree, no TODO/bare elisions/hedges/linter claims, categories/INDEX coverage.
6. Duplicate review within the batch and against the rest of `catalog/rules/cpp/` (pairwise title+summary Jaccard; semantic review), plus the deterministic validator (`node dist/rules/cli.js validate --lang cpp --json`).

## Source verification (evidence quotes)

- **cppreference `array`** — "same semantics as a struct holding a C-style array T[N]"; "Unlike a C-style array, it doesn't decay to T* automatically."; "combines the performance and accessibility of a C-style array with the benefits of a standard container, such as knowing its own size, supporting assignment, random access iterators, etc."; Core Guidelines SL.con.1: "does not degenerate to a pointer when passed to a function and does know its size." (`coll-array-over-carray`)
- **cppreference `remove`** — "typically followed by a call to a container's erase member function … These two invocations together constitute a so-called erase-remove idiom."; "Removing is done by partitioning the elements in the target range."; "Exactly N comparisons using operator =="; Return value: "The iterator result mentioned above." (`coll-erase-remove`)
- **cppreference `algorithm`** — search operations list "all_of any_of none_of … count count_if … find find_if"; "Binary search operations (on partitioned ranges)"; "The behavior is undefined if the requirement is not met." (`coll-find`, `coll-lower-bound`, `coll-sort-strict-weak`)
- **cppreference `vector`** — invalidation table: `push_back`/`emplace_back` "If the vector changed capacity, all of them. If not, only end()."; `insert`/`emplace` "… all elements at or after the insertion point"; `erase` "Erased elements and all elements after them (including end())"; `cbegin`/`cend` provided alongside `begin`/`end`. (`coll-invalidation`, `const-cbegin`)
- **cppreference `lower_bound`** — "At most log2(N)+O(1) comparisons"; "Notably, std::map, std::multimap, std::set, and std::multiset iterators are not random access, and so their member lower_bound functions should be preferred." (`coll-lower-bound`)
- **cppreference `map`** — `operator[]` is "access or insert specified element"; example comment "using operator[] with a non-existent key always performs an insert"; subpage: "If an insertion is performed, the mapped value is value-initialized … and a reference to it is returned." (`coll-map-find`)
- **cppreference `sort`** — "comp — comparison function object (i.e. an object that satisfies the requirements of Compare) which returns true if the first argument is less than (i.e. is ordered before) the second." (`coll-sort-strict-weak`)
- **cppreference `transform`** — "Applies the given function to the elements of the given source range(s), and stores the result in the destination range"; "Exactly N applications of unary_op." (`coll-transform`)
- **cppreference `vector<bool>`** — "not necessarily store its elements as a contiguous array"; "does not necessarily meet all Container or SequenceContainer requirements"; iterator "is implementation-defined, it may not satisfy the LegacyForwardIterator requirement"; `reference` is a "proxy class representing a reference to a single bool"; "objects of this class are returned by operator[] by value." (`coll-vector-bool`)
- **Core Guidelines** — Con.1 "By default, make objects immutable"; Con.2 "By default, make member functions const"; Con.3 "By default, pass pointers and references to consts"; Con.4 "Use const to define objects with values that do not change after construction"; ES.50 "Don't cast away const"; ES.71 "Prefer a range-for-statement to a for-statement when there is a choice"; SL.con.2 "Prefer using STL vector by default unless you have a reason to use a different container"; SL.con.4 "don't use memset or memcpy for arguments that are not trivially-copyable". (`const-immutable-by-default`, `const-member-functions`, `const-ref-params`, `const-no-cast-away`, `coll-range-for`, `coll-vector-default`, `coll-no-memset-nontrivial`)
- **cppreference `cv`** — const object "cannot be modified: attempt to do so directly is a compile-time error, and attempt to do so indirectly … results in undefined behavior"; `mutable` "does not affect the externally visible state of the class (as often used for mutexes, memo caches, lazy evaluation, and access instrumentation)" and the example comment "The \"M&M rule\": mutable and mutex go together"; "References and pointers to cv-qualified types can be implicitly converted to references and pointers to more cv-qualified types … To convert … to a less cv-qualified type, const_cast must be used." (`const-immutable-by-default`, `const-mutable`, `const-ref-params`)
- **cppreference `const_cast`** — "modifying a const object through a non-const access path … results in undefined behavior"; example `const_cast<type*>(this)->i = v; // OK as long as the type object isn't const`; "if this was const type t, then t.f(4) would be undefined behavior." (`const-no-cast-away`, `const-no-cast-this`)
- **cppreference `consteval`** — "every potentially-evaluated call to the function must (directly or indirectly) produce a compile time constant expression"; "a consteval specifier implies inline"; "may not also specify constexpr." (`const-consteval`)
- **cppreference `constinit`** — "asserts that a variable has static initialization … otherwise the program is ill-formed"; "If a variable declared with constinit has dynamic initialization … the program is ill-formed"; "constinit does not mandate constant destruction and const-qualification"; example mutates `sq` at run time. (`const-constinit`)
- **cppreference `as_const`** — "Forms lvalue reference to const type of t."; "const rvalue reference overload is deleted to disallow rvalue arguments." (`const-as-const`)
- **cppreference `reference_initialization`** — "a temporary bound to a return value of a function in a return statement is not extended … Such return statement always returns a dangling reference"; "a temporary bound to a reference parameter in a function call exists until the end of the full expression … it becomes a dangling reference"; "the lifetime of a temporary cannot be further extended by \"passing it on\"." (`const-ref-lifetime`)
- **cppreference `constexpr`** — "A constexpr specifier used in an object declaration or non-static member function **(until C++14)** implies const." — basis of the `const-constexpr-members` rejection below.

## Compile results (`-fsyntax-only -std=c++23 -Wall`)

- 48/48 snippets: exit 0.
- Intended/documented diagnostics: `coll-no-memset-nontrivial` Bad → `-Wnontrivial-memcall` ("first argument in call to 'memset' is a pointer to non-trivially copyable type 'std::string'"); `const-ref-lifetime` Bad → `-Wreturn-stack-address` ("returning reference to local temporary object"). Accepted.
- Compile probes: consteval runtime call → error "call to consteval function 'mix' is not a constant expression"; constinit dynamic initializer → error "variable does not have a constant initializer"; `static_assert` on a non-constexpr accessor → error; `as_const` on an rvalue → error "call to deleted function 'as_const'".

## Behavior results (ASan/UBSan, timeouts applied)

- **coll-invalidation:** Bad → ASan `heap-use-after-free` (`main`, line 7) after `push_back` reallocation; Good rc=0.
- **coll-map-find:** Bad rc=1 (lookup inserted `"gpu"`, size check fails); Good rc=0.
- **coll-sort-strict-weak:** both rc=0 — the `<=` UB is not observable on 3 elements on this libc++; rule rests on the documented Compare/UB requirement.
- **coll-vector-bool:** Bad rc=0 as written (2-element vector's bit capacity is a full word, no reallocation); mechanism confirmed by probe: proxy copied from a 64-bit vector, then `resize(1000)` → ASan `heap-use-after-free` in `__bit_reference::operator bool`.
- **coll-no-memset-nontrivial:** Bad rc=0 (libc++ short string survives the zeroing) — UB nevertheless; the compiler diagnostic is the evidence.
- **const-as-const:** Bad rc=1 (non-const overload selected, check fails); Good rc=0.
- **const-consteval / const-constinit / const-constexpr-members:** Bad and Good rc=0; the compile-time guarantees confirmed by the probes above.
- **const-no-cast-away:** Bad rc=1 at `-O1` (the write to a const object is not visible to the folded comparison); Good rc=0.
- **const-no-cast-this:** Bad rc=0 (defined here because the object is not const; UB only when invoked on a const object, as the page states); Good rc=0.
- **const-ref-lifetime:** Bad → ASan `stack-use-after-scope` (in `basic_string::__is_long` when comparing through the dangling reference); Good rc=0.
- All remaining snippets: rc=0 and matching the intended semantics (range-for sums, find position, lower_bound equality check, transform output, erase-remove leaves 3 elements, map find, cbegin, as_const, immutable objects, const accessors, mutable, ref params).

## Assessment of `const-constexpr-members` vs `perf-constexpr` (check 4)

The API-capability framing (constructors/accessors usable inside `static_assert`, array bounds, template arguments) is a genuinely different decision from `perf-constexpr`'s "move computation to compile time": different triggers, different snippets, and both cite the constexpr page for different clauses. **Not a duplicate** — the pair passes the distinctness review. However, the rule is rejected on its own prose (below): its summary and one Why sentence state an implication that the cited source restricts to `(until C++14)` and that the compiler refutes for the baseline.

## Duplicates / consistency

- No duplicate or near-duplicate rules: max pairwise title+summary Jaccard inside the batch is 0.29 (`const-member-functions` vs `const-no-cast-this`; `const-no-cast-away` vs `const-no-cast-this`), no cross-pack pair reaches 0.4.
- Semantic review: `const-no-cast-away` / `const-no-cast-this` is a deliberate general/specialized pair (any const object vs `this` in a const member function; distinct triggers, scenarios, and See Also cross-links); `coll-find` / `coll-lower-bound` / `coll-transform` are distinct search/mapping decisions; `const-immutable-by-default` / `const-member-functions` / `const-ref-params` cover objects/members/parameters separately.
- All `related` IDs and See Also links resolve and agree; `INDEX.md` lists all 24 files with matching summaries; `categories.md` declares the `coll` extension and the shared `const` prefix; all summaries ≤ 30 words; no TODO, bare elision, hedging, or linter claim without `enforce: tool`.
- Deterministic validator: one hard `fm-parse` error (`coll-map-find`) and two non-blocking `comment-elision` warnings (`const-constexpr-members`, `...` inside comments, contract §12).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| cpp-coll-array-over-carray | verified | array page same-semantics/no-decay/benefits + SL.con.1 "does not degenerate to a pointer … does know its size"; both rc=0. Note: "lists exactly those gains" slightly overstates the benefits sentence (comparison is documented as non-member operators) — non-blocking. |
| cpp-coll-erase-remove | verified | remove page erase-remove idiom + partitioning + "Exactly N comparisons"; both rc=0, both leave 3 elements |
| cpp-coll-find | verified | algorithms page search-operations list (find/find_if/count/count_if/all_of/any_of/none_of); both rc=0 |
| cpp-coll-invalidation | verified | vector invalidation table (push_back/insert/erase rows); Bad ASan heap-use-after-free, Good rc=0 |
| cpp-coll-lower-bound | verified | "At most log2(N)+O(1) comparisons" + member-lower_bound preference quote; both rc=0. Its `related` to `cpp-coll-map-find` resolves as soon as that file's YAML is fixed (see blockers; batch-6 precedent: dependents of a rejected file were verified). |
| cpp-coll-map-find | **rejected** | Invalid YAML frontmatter: unquoted `operator[]` in `keywords: [map, operator[], …]` → validator `fm-parse` "missed comma between flow collection entries at line 11, column 27"; the rule cannot load. Content otherwise verified (48/48 compile; Bad rc=1 shows the lookup insertion, Good rc=0). Fix: `"operator[]"`. |
| cpp-coll-no-memset-nontrivial | verified | SL.con.4 title; documented `-Wnontrivial-memcall` on Bad; Good rc=0 (Bad survives on libc++ SSO but is UB) |
| cpp-coll-range-for | verified | ES.71 title; both rc=0 |
| cpp-coll-sort-strict-weak | verified | sort Compare quote ("first argument is less than (i.e. is ordered before) the second") + algorithms "behavior is undefined if the requirement is not met"; both rc=0 |
| cpp-coll-transform | verified | transform "applies … stores the result" + "Exactly N applications"; both rc=0 |
| cpp-coll-vector-bool | verified | vector_bool non-contiguous/proxy/Container-requirement/implementation-defined-iterator quotes; proxy-dangle probe → ASan heap-use-after-free. Note: the 2-element Bad snippet does not reallocate on libc++ — non-blocking. |
| cpp-coll-vector-default | verified | SL.con.2 title; both rc=0 |
| cpp-const-as-const | verified | as_const "Forms lvalue reference to const type" + deleted rvalue overload; rvalue probe fails to compile; Bad rc=1 (wrong overload), Good rc=0 |
| cpp-const-cbegin | verified | vector page cbegin/cend member rows and const_iterator member type; both rc=0 |
| cpp-const-consteval | verified | consteval "every … call must … produce a compile time constant", "implies inline", "may not also specify constexpr"; runtime-call probe fails to compile; both rc=0 |
| cpp-const-constexpr-members | **rejected** | Summary "A constexpr member is also const" and Why "it also notes that constexpr on a non-static member function implies const" are false for the baseline: the cited page says "**(until C++14)** implies const", and clang 21 C++23 probe errors — "'this' argument to member function 'f' has type 'const S', but function is not marked const". Title also says constructors while the snippets show only an accessor. Good snippet itself is correct (`constexpr int sum() const`). Fix: reword summary/Why (drop or qualify the implication) and align the title or add a constexpr-constructor example. |
| cpp-const-constinit | verified | constinit "asserts … static initialization", "ill-formed" on dynamic initialization, "does not mandate … const-qualification"; dynamic-init probe fails to compile; both rc=0 |
| cpp-const-immutable-by-default | verified | Con.1 + Con.4 titles; cv "cannot be modified … indirectly … undefined behavior"; both rc=0 |
| cpp-const-member-functions | verified | Con.2 title; non-const accessor probe not callable on a const object; both rc=0 |
| cpp-const-mutable | verified | cv mutable purpose quote incl. the "M&M rule" comment; Bad rc=0 demonstrates observable state changed through a const method; Good rc=0 |
| cpp-const-no-cast-away | verified | ES.50 + const_cast "modifying a const object through a non-const access path … undefined behavior"; Bad rc=1 at -O1, Good rc=0 |
| cpp-const-no-cast-this | verified | const_cast "OK as long as the type object isn't const" + "if this was const type t, then t.f(4) would be undefined behavior"; both rc=0 |
| cpp-const-ref-lifetime | verified | reference_initialization return-statement/function-call/"passing it on" exceptions; Bad → `-Wreturn-stack-address` and ASan stack-use-after-scope, Good rc=0. Note: the return case is marked "(until C++26)" (becomes ill-formed) — rule advice unaffected. |
| cpp-const-ref-params | verified | Con.3 title + cv qualification-conversion quote; both rc=0 |

**Counts: verified 22/24, rejected 2.** The 22 passing rules had `status: draft` → `status: verified` flipped; the 2 rejected rules remain `draft`.

## Blockers / follow-ups (outside verifier scope)

- **`coll-map-find`:** quote `"operator[]"` in `keywords` (line 11), re-run the validator, then it can be flipped (content already passes compile/behavior/source checks).
- **`const-constexpr-members`:** reword the summary and the implies-const sentence (the source's "(until C++14)" qualifier; C++23 probe error) and align the title with the snippets (or add a constexpr constructor example); re-verify after edits.
- `catalog/rules/cpp/INDEX.md` header reads "Rules: 235 (verified: 187)"; this batch adds 22 verified (batches 7–8 also in flight) — the owning agent must update it.
- Non-blocking notes: `coll-array-over-carray`'s "lists exactly those gains" overstates the page's benefits sentence; `coll-invalidation` and `coll-no-memset-nontrivial` carry a surplus `std::string` citation; `const-ref-lifetime` cites `const_cast` although the Why never mentions casts; `coll-map-find`'s value-initialization detail is on the `operator[]` subpage while the cited `map` page shows the insert in its example.

---

## Addendum — re-verification of the two rejected rules (2026-10-05)

Both rejects were fixed and re-verified with the same checks (fresh snippet extraction, `clang++ -fsyntax-only -std=c++23 -Wall` plus ASan/UBSan runs, source re-check, gray-matter parse, validator). This addendum supersedes their `rejected` verdicts in the table above.

- **cpp-coll-map-find** — `keywords: [map, "operator[]", …]` now quoted; gray-matter parses and the validator `fm-parse` error is gone (batch errors: none). Both snippets compile clean; Bad rc=1 (the lookup inserted `"gpu"` and the size check fails), Good rc=0. `related` (`cpp-coll-lower-bound`, `cpp-coll-vector-default`) and See Also agree and resolve — this also repairs `coll-lower-bound`'s link target. Source quotes unchanged and re-confirmed (`operator[]` "access or insert specified element"; example "always performs an insert"; subpage "value-initialized"). **verified.**
- **cpp-const-constexpr-members** — title now "Mark accessors constexpr so the type works in constant expressions" (matches the snippets; no constructors claim); summary now "A constexpr accessor keeps the type usable where constant expressions are required."; the Why now states "Since C++14, constexpr on a member function no longer implies const, so an accessor that does not modify the object marks itself `const`." — consistent with the cited page's "**(until C++14)** implies const" and with the clang 21 C++23 probe ("'this' argument … has type 'const S', but function is not marked const"). Both snippets compile clean and run rc=0; the Good `static_assert(p.sum() == 3)` holds only because the accessor is `constexpr`, and the Bad `static_assert` probe without it fails as documented. Remaining two `comment-elision` warnings are `...` inside comments (non-blocking, contract §12). **verified.**

Validator re-run (`node dist/rules/cli.js validate --lang cpp --no-compile --json`): no errors and no warnings touching the batch except the two non-blocking comment-elision warnings on `const-constexpr-members`.

**Final counts after addendum: verified 24/24, rejected 0.** All 24 batch-9 rules are now `status: verified`. `catalog/rules/cpp/INDEX.md` verified count should be updated 187 → 211 (22 flips before the addendum + 2 after).
