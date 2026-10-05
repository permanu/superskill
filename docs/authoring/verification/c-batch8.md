# Verification Report - C Batch 8 (`pat` + `macro`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules); re-verification from the current on-disk state after a prior verifier was interrupted
- Date: 2026-10-05
- Scope: 12 `pat-*.md` + 12 `macro-*.md` (24 files, all entered as `status: draft`)
- Toolchain: Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0; deterministic validator `node dist/rules/cli.js validate --lang c --json`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/c-batch8` (fetched pages, extracted snippets, compile matrix, ASan/UBSan harnesses)

## Method

1. Fetched every cited URL (kernel coding style §5/§11/§12/§18; CERT PRE31-C, MEM00-C, ERR05-C, STR32-C; cppreference initialization, replace, conditional, constexpr, pointer, union, realloc; GCC Concatenation) and confirmed each claim against the page text quoted below.
2. Extracted both fenced snippets from each rule (48 snippets) and compiled each with `clang -fsyntax-only -std=c23 -Wall`: 48/48 exit 0 with zero diagnostics, no wrapping needed.
3. Built and ran bounded, offline harnesses under `-fsanitize=address,undefined` for every rule with a runtime claim (22 binaries): tagged union, designated init, init/destroy, dispatch table, dynarray, refcount, length-prefixed, array-size, callback context, vtable, error context, macro parens (body + params), do-while, single-eval, va-opt, related constants, no-control-flow, no-lvalue-args, no-magic-names, constexpr. Also ran negative demos proving each Bad anti-pattern actually fails (strcmp on an unterminated buffer, GNU `##__VA_ARGS__` under `-pedantic-errors`, `#if FEATURE_X` with `FEATURE_X=0`, token-paste identifier capture, per-push realloc growth).
4. Ran the deterministic validator and mechanically re-checked frontmatter, section order, one `c` fence per Bad/Good, summary word counts, banned tokens, `related`/See Also/INDEX links, and duplicate concepts.
5. Flip policy: only rules passing every check were flipped to `status: verified`.

## Compile results

`clang -fsyntax-only -std=c23 -Wall` - 48/48 snippets exit 0 with zero diagnostics. No rule uses `compile_exempt`. `macro-va-opt`'s Bad compiles by default (clang accepts the GNU comma-paste as an extension) but fails `-pedantic-errors` with `token pasting of ',' and __VA_ARGS__ is a GNU extension`, while its Good passes `-pedantic-errors` clean - exactly the standard-vs-extension distinction the rule claims.

## Source evidence (claim-specific)

- **Kernel coding style** - §18 `Don't re-invent the kernel macros`: `#define ARRAY_SIZE(x) (sizeof(x) / sizeof((x)[0]))` (`pat-array-size`); §5 `Typedefs`: useful only for "totally opaque objects (where the typedef is actively used to hide what the object is) ... opaque objects that you can only access using the proper accessor functions" (`pat-opaque-type`); §11 `Data structures`: "Data structures that have visibility outside the single-threaded environment they are created and destroyed in should always have reference counts" (`pat-refcount`); §12 `Macros, Enums and RTL`: "Enums are preferred when defining several related constants" (`macro-related-constants`), "Macros with multiple statements should be enclosed in a do - while block" (`macro-do-while`), control-flow macros "is a very bad idea. It looks like a function call but exits the calling function" (`macro-no-control-flow`), "macros that depend on having a local variable with a magic name ... confusing as hell ... prone to breakage" (`macro-no-magic-names`), "macros with arguments that are used as l-values: FOO(x) = y; will bite you if somebody e.g. turns FOO into an inline function" (`macro-no-lvalue-args`), "macros defining constants using expressions must enclose the expression in parentheses. Beware of similar issues with macros using parameters" (`macro-constant-parens`, `macro-param-parens`).
- **CERT PRE31-C** (`macro-single-eval`): "An unsafe function-like macro is one whose expansion results in evaluating one of its parameters more than once or not at all"; the `ABS(++n)` example "causes n to be incremented twice rather than once"; compliant solution performs the increment before the call.
- **CERT MEM00-C** (`pat-init-destroy`): "memory should be allocated and freed at the same level of abstraction and, ideally, in the same code module"; the noncompliant example frees in a subroutine of the allocator (`verify_size`) causing a double free.
- **CERT ERR05-C** (`pat-error-context`): error reporting forms are "A return value ... An argument passed by address ... Some combination of the above"; the address-argument compliant solution is the caller-provided pointer the rule generalizes to a detail struct.
- **CERT STR32-C** (`pat-length-prefixed`): "Do not pass a character sequence or wide character sequence that is not null-terminated to a library function that expects a string"; the rule's span keeps the bound instead of fabricating a terminator.
- **cppreference Initialization** (`pat-designated-init`): `designator-list = initializer` form "(since C99)"; aggregate zero-fill of unmentioned members verified at runtime.
- **cppreference constexpr** (`macro-constexpr`, C23): a scalar `constexpr` object "is a constant. It must be fully and explicitly initialized"; "the constant expression that is used for the initializer of such a constant is checked at compile time".
- **cppreference Conditional inclusion** (`macro-defined-test`): "Any identifier, which is not literal, non defined using #define directive, evaluates to 0"; `defined` returns "1 if the identifier was defined ... and 0 otherwise".
- **cppreference Replacing text macros** (`macro-va-opt`): `__VA_OPT__(content)` "is replaced by content if __VA_ARGS__ is non-empty, and expands to nothing otherwise" (since C23); "Some compilers offer an extension that allows ## to appear after a comma and before __VA_ARGS__".
- **cppreference Pointer declaration** (`pat-callback-context`, `pat-dispatch-table`, `pat-vtable`): "Unlike functions, pointers to functions are objects and thus can be stored in arrays, copied, assigned, passed to other functions as arguments, etc."; "pthread_create expects a user-provided callback that accepts and returns void*. In all cases, it is the caller's responsibility to convert the pointer to the correct type before use."
- **cppreference union** (`pat-tagged-union`): "The value of at most one of the members can be stored in a union at any one time"; reading a different member reinterprets the stored object representation.
- **cppreference realloc** (`pat-dynarray`): "If there is not enough memory, the old memory block is not freed and null pointer is returned"; "The original pointer ptr remains valid" on failure - the temp-pointer discipline the grow step uses.
- **GCC Concatenation** (`macro-token-paste`): "If either of the tokens next to an '##' is a parameter name, it is replaced by its actual argument before '##' executes. As with stringizing, the actual argument is not macro-expanded first."

## Behavior harness results (ASan/UBSan, all rc=0 unless noted)

- `pat-tagged-union`: tagged read returns 0.0 for the int variant and 2.5 for the double variant; no UB.
- `pat-designated-init`: values 3/1000/0 correct; a fourth unmentioned field is zero-initialized (`flags == 0`), confirming the aggregate-fill claim.
- `pat-init-destroy`: `module_start` allocates, `module_stop` frees and nulls; ASan leak check clean.
- `pat-dispatch-table`: `apply(0)=5`, `apply(1)=-1`, `apply(2)=0`, `apply(-1)=0` - out-of-range codes handled by the bounds check.
- `pat-dynarray`: 100 pushes, all values in order, `cap >= 100`, ASan leak-free. Bad variant measured **100 reallocs for 100 pushes** (quadratic growth), confirming the anti-pattern.
- `pat-refcount`: get twice / put three times frees exactly once; ASan clean; `refs` remains readable until the final put.
- `pat-length-prefixed`: span over a deliberately unterminated `char raw[3]` matches "abc" via bounded `memcmp`; mismatched length returns 0. Bad `strcmp` demo on the same buffer: **ASan stack-buffer-overflow** (exit 134), proving the hazard.
- `pat-array-size`: `ARRAY_SIZE(table) == 4`, `table_sum() == 10`.
- `pat-callback-context`: context accumulates 5+7=12 through the `void *` parameter.
- `pat-vtable`: square and circle implementations dispatch through the object's function pointer.
- `pat-error-context`: failure returns -1 with line/message set; success returns 0.
- `macro-constant-parens`: Good `scaled(2) == 32`; Bad `scaled(2) == 31` (`2 * 0x0F + 1`).
- `macro-param-parens`: Good `f(2) == 6`; Bad `f(2) == 4` (`2 + 1 * 2`).
- `macro-do-while`: in an unbraced `if (0)` the Bad macro still increments (`bad == 1`); the Good macro does not (`good == 0`).
- `macro-single-eval`: Bad `ABS((*value)++)` increments twice (`-3 -> -1`) and returns 2; Good returns 3 and increments once (`-3 -> -2`).
- `macro-va-opt`: Good runs with and without varargs, passes `-pedantic-errors`; Bad is rejected by `-pedantic-errors` ("token pasting of ',' and __VA_ARGS__ is a GNU extension").
- `macro-defined-test`: with `-DFEATURE_X=0`, `#if FEATURE_X` disables (exit 1) while `#if defined(FEATURE_X)` enables (exit 0); both agree when undefined.
- `macro-token-paste`: preprocessing shows Bad defines `int PREFIX_id` (captured, unexpanded) and Good defines `int user_id`; both compile.
- `macro-constexpr`: `static_assert(MAX_ITEMS == 64)` passes and `int arr[MAX_ITEMS]` compiles - the constant is usable in constant expressions.
- `macro-related-constants`, `macro-no-control-flow`, `macro-no-lvalue-args`, `macro-no-magic-names`: runtime checks pass.

## Notes assessment

- **Three callback-related `pat` rules are deliberately distinct.** `pat-vtable` = per-object table of operations (behavior belongs to the object); `pat-dispatch-table` = static table indexed by operation code with a bounds check (op selected by index); `pat-callback-context` = a `void *` user-context passed alongside a callback. Different decisions, snippets, and citations; no duplicate or near-duplicate pair. Their `related` cross-links form a coherent cluster, not redundancy.
- **`macro-no-lvalue-args` is `prefer`** - matches the kernel's forward-compatibility warning ("will bite you if somebody ... turns FOO into an inline function"), a taste-level future-proofing rule. Frontmatter, title, and body agree.
- **`pat-refcount` is single-threaded by scope.** The Good uses a plain `int refs` with no atomics; the rule's decision is ownership (get/put, last one frees), and it never advertises thread-safe counting. The Why's "any other thread may still hold a pointer" is the kernel's multi-user rationale for why counts exist, not a claim that the snippet is atomic. Verified as an ownership rule; a thread-safe variant would be a separate rule if needed. Non-blocking.
- `pat-error-context`'s Good does not write its `value` out-parameter (the snippet only demonstrates the error path); compiles clean, non-blocking.
- `pat-dynarray`'s Bad already uses the correct temp-pointer realloc discipline; its defect is growth-by-one (capacity recomputed every push), which is what the Why and the inline comment claim - confirmed at runtime.

## Formatting, validator, duplicates, links

- All 24: id matches path, required frontmatter present (`lang: c`, `baseline: latest`), exact section order, exactly one `c` fence per Bad/Good, summaries <= 30 words, no TODO/elision/trailing whitespace, all `related` ids and See Also targets resolve, and `INDEX.md` lists all 24 with matching summaries.
- Deterministic validator (`--lang c --json`): 0 errors for the 24 batch files. Pack-level errors exist only outside this batch (`lint-suppression-scope.md` fm-parse; `conc-*`/`data-*` index-missing, compile-failed, and one related-unresolved). The pack was still being populated by another author during verification (rule count grew 218 -> 236 between runs); none of those files are in this batch or were touched by this verifier.
- Two validator warnings on `macro-va-opt` ("elision inside a comment"): the `...` occurrences are variadic macro syntax `(fmt, ...)` on lines that also carry comments; they are not elisions. Warning-level only, non-blocking per CONTRACT §12.
- Duplicates: no duplicate or near-duplicate found in the pack. Closest siblings read and confirmed distinct: `pat-array-size` vs `ptr-count-explicit` (declaration-site `ARRAY_SIZE` vs count passed across function boundaries - each references the other), `pat-refcount` vs `mem-single-owner` (shared vs sole ownership), `pat-opaque-type` vs `anti-typedef-struct-pointer` (the opaque-typedef exception), `pat-error-context` vs `err-out-params` (detail carrier vs write timing), `pat-dynarray` vs `mem-flex-array`/`err-alloc-failure` (growable vs fixed tail; failure discipline), `pat-tagged-union` vs `unsafe-union-active` (positive pattern vs UB warning), `pat-vtable`/`pat-dispatch-table`/`pat-callback-context` (above), `macro-constant-parens` vs `macro-param-parens` (constant body vs parameter uses - the two halves kernel §12 lists together), `macro-do-while` vs `macro-no-control-flow` (wrapper vs what must not go inside), `macro-constexpr` vs `macro-related-constants` (single typed constant vs related set -> enum).

## Verdicts

| rule id | verdict | evidence | notes |
|---|---|---|---|
| c-pat-array-size | verified | kernel §18 `ARRAY_SIZE` definition; both rc=0; harness ARRAY_SIZE=4, sum=10 | distinct from ptr-count-explicit |
| c-pat-callback-context | verified | cppreference pointer: pthread_create callback + `void *`, caller converts; harness ctx=12 | cluster: state-passing |
| c-pat-designated-init | verified | cppreference initialization: designator form (C99); harness fields + unmentioned field zeroed | - |
| c-pat-dispatch-table | verified | cppreference pointer: fn pointers stored in arrays/copied; harness bounds cases | cluster: index-selected |
| c-pat-dynarray | verified | cppreference realloc failure keeps old block; 100 pushes ASan clean; Bad 100 reallocs/100 pushes | - |
| c-pat-error-context | verified | ERR05-C: address argument is a reporting form; harness detail on failure | Good ignores `value`; non-blocking |
| c-pat-init-destroy | verified | MEM00-C same module/level; ASan leak-free start/stop | - |
| c-pat-length-prefixed | verified | STR32-C; bounded span match on unterminated buffer; Bad strcmp -> ASan overflow | - |
| c-pat-opaque-type | verified | kernel §5 opaque typedefs/accessors; header snippets rc=0 | pairs with anti-typedef-struct-pointer |
| c-pat-refcount | verified | kernel §11 refcounts for shared structures; get/put frees once, ASan clean | single-threaded by scope; non-atomic snippet, no thread claim |
| c-pat-tagged-union | verified | cppreference union: one member at a time; harness tag dispatch | - |
| c-pat-vtable | verified | cppreference pointer: fn pointers are objects, stored/passed; harness two impls | cluster: per-object |
| c-macro-constant-parens | verified | kernel §12 expression constants parenthesized; harness 32 vs 31 | - |
| c-macro-constexpr | verified | cppreference constexpr (C23) constant + compile-time check; static_assert/array bound pass | - |
| c-macro-defined-test | verified | cppreference conditional: undefined -> 0; harness FEATURE_X=0 difference | - |
| c-macro-do-while | verified | kernel §12 do-while wrapper; harness unbraced-if Bad=1 vs Good=0 | - |
| c-macro-no-control-flow | verified | kernel §12 control-flow macros "very bad idea"; harness visible exit | - |
| c-macro-no-lvalue-args | verified | kernel §12 item 3 lvalue macros bite on inline conversion; harness explicit assignment | severity `prefer` appropriate |
| c-macro-no-magic-names | verified | kernel §12 magic local names break on innocent changes; harness function replacement | - |
| c-macro-param-parens | verified | kernel §12 parameter precedence warning; harness 6 vs 4 | - |
| c-macro-related-constants | verified | kernel §12 "Enums are preferred when defining several related constants"; harness values | - |
| c-macro-single-eval | verified | PRE31-C "evaluated more than once"; harness Bad increments twice vs Good once | - |
| c-macro-token-paste | verified | GCC Concatenation: argument not expanded before `##`; preprocess Bad `PREFIX_id` vs Good `user_id` | - |
| c-macro-va-opt | verified | cppreference replace: `__VA_OPT__` standard vs `##` GNU extension; Bad fails -pedantic-errors, Good passes | validator warning is macro syntax, not elision |

## Counts

- Verified: **24/24** (12 `pat`, 12 `macro`)
- Rejected: **0/24**
- Blockers: none for this batch. Out-of-batch notes: `lint-suppression-scope.md` has a pre-existing `fm-parse` error (invalid YAML frontmatter at line 17) and the concurrently added `conc-*`/`data-*` files have index/compile errors - all outside this batch and left untouched; `INDEX.md`'s pack verified count (167) will be stale after these 24 flips (owner update; verifier does not edit INDEX per ownership).

Only the 24 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched. No git operations were performed.
