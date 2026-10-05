# Verification Report - Python Batch 7 (`anti` + `api`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/python/anti-*.md` (14) and `api-*.md` (13) = 27 rules; all entered as `status: draft`
- Toolchain: CPython 3.14.6 (`/opt/homebrew/bin/python3`), macOS; sources fetched live (Python 3.14.8 docs, current PEP 8 / PEP 3102, Ruff rule pages)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/python-batch7`
- Ownership: flipped `status` to `verified` on all 27 rules. No other edits; no git.

## Method

- Fetched all 21 distinct cited URLs (PEP 8, PEP 3102, tutorial controlflow/modules/classes, `abc`, `os`, `functools`, `collections.abc`, `copy`, `contextlib`, `enum`, `warnings`, `urllib.request`, Ruff UP031/B006/RET505/SIM118/F632/B008/FBT001): every one returned HTTP 200; converted to text and located the exact supporting sentences for each Why claim.
- Extracted both snippets from all 27 rules (54 files) and ran `python3 -m py_compile` on each with CPython 3.14.6. Sole output: `python-anti-is-literal.bad.py` emits the intentional `SyntaxWarning: "is" with 'str' literal` the rule is about (accepted per brief).
- Ran 27 behavioral probes with short timeouts in scratch, covering every case named in the brief: mutable defaults, None equality (including a `__eq__` override), is-literal (equal non-identical `str`), lambda naming, range/len vs enumerate, `dict.keys()` membership, percent formatting, wildcard-import namespace pollution, enum dispatch, singledispatch, keyword-only, PathLike, return-copy independence, timeout parameter (`urlopen` stubbed — no network), context manager protocol, ABC guard, deprecation `stacklevel`. `api-import-side-effects` Bad was skipped by design (an import-time file read is the anti-pattern); its Good ran as a non-`__main__` module to prove the guard keeps work out of import.
- Cross-checked frontmatter, ids, `related`/See Also resolution, summary limits, hedging tokens, and near-duplicates (Jaccard on title+summary) within the batch and against the whole Python pack.
- Ran the deterministic validator with compile enabled, before and after the flips: `node dist/rules/cli.js validate --lang python` -> 201 rules, 0 errors, 3 warnings (details under Flags).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| python-anti-bool-equality | verified | PEP 8: "Don't compare boolean values to True or False using `==`" (and `is True` shown as "Worse"). Run: Bad/Good `is_enabled(True/False)` identical. |
| python-anti-call-default | verified | Ruff B008: "Any function call that's used in a default argument will only be performed once, at definition time. The returned value will then be reused by all calls". Run: Bad froze patched `time.time` at definition; Good evaluated per call. |
| python-anti-dict-keys-membership | verified | Ruff SIM118: "`key in dict` is more readable and efficient than `key in dict.keys()`, while having the same semantics". Run: identical results for present and absent keys. |
| python-anti-else-after-return | verified | Ruff RET505: "The else statement is not needed as the return statement will always break out of the enclosing function. Removing the else will reduce nesting and make the code more readable". Run: `classify(60/40)` identical. |
| python-anti-empty-len | verified | PEP 8: "For sequences, (strings, lists, tuples), use the fact that empty sequences are false". Run: `summarize([]) == "empty"` both. |
| python-anti-is-literal | verified | Ruff F632: `is`/`is not` "operate on identity", comparisons with literals are "not guaranteed to produce the expected result", "As of Python 3.8... will produce a SyntaxWarning". Run: Bad `is_ok("".join(["o","k"]))` -> False, Good -> True; compile emits the intended SyntaxWarning only. |
| python-anti-lambda-assignment | verified | PEP 8: "Always use a def statement instead of an assignment statement that binds a lambda expression directly to an identifier"; "the name of the resulting function object is specifically 'f' instead of the generic '<lambda>'. This is more useful for tracebacks and string representations". Run: Bad lambda `co_name == "<lambda>"`; Good `double.__name__ == "double"`. |
| python-anti-mutable-class-attribute | verified | classes tutorial: "just a single list would be shared by all Dog instances", "# mistaken use of a class variable". Run: append through one `Cart` visible in another; Good per-instance. |
| python-anti-mutable-default | verified | controlflow tutorial: "The default value is evaluated only once... mutable object such as a list, dictionary"; Ruff B006: "The same mutable object is then shared across all calls". Run: Bad second call `["a","b"]`, Good `["b"]`. |
| python-anti-none-equality | verified | PEP 8: "Comparisons to singletons like None should always be done with is or is not, never the equality operators". Run: an `__eq__`-always-True object passes Bad `== None` but not Good `is None`. |
| python-anti-percent-format | verified | Ruff UP031: "printf-style string formatting has a number of quirks, and leads to less readable code than using str.format calls or f-strings... prefer the newer str.format and f-strings constructs". Run: identical output. |
| python-anti-range-len | verified | controlflow tutorial: "To iterate over the indices of a sequence, you can combine range() and len()", then "In most such cases... it is convenient to use the enumerate() function". Run: identical labels. |
| python-anti-type-equality | verified | PEP 8: "Object type comparisons should always use isinstance() instead of comparing types directly"; `abc` register example asserts `isinstance((), MyABC)` for a virtual subclass. Run: Bad rejects `True` and an `int` subclass, Good accepts both. |
| python-anti-wildcard-import | verified | PEP 8: "Wildcard imports... should be avoided, as they make it unclear which names are present in the namespace, confusing both readers and many automated tools"; modules tutorial: "This imports all names except those beginning with an underscore". Run: Bad namespace gains `sqrt`/`cos`, Good only `pi`. |
| python-api-abc-interface | verified | `abc`: "A class that has a metaclass derived from ABCMeta cannot be instantiated unless all of its abstract methods and properties are overridden". Run: Bad `MemoryStorage()` constructs, then `read()` raises `NotImplementedError`; Good `Storage()` raises `TypeError`, `MemoryStorage().read()` returns `b""`. |
| python-api-all-public | verified | PEP 8: "modules should explicitly declare the names in their public API using the `__all__` attribute". Run: Bad has no `__all__` and exposes `json`; Good `__all__ == ["parse"]`, `parse` works. |
| python-api-bool-params | verified | Ruff FBT001: boolean positional arguments are "confusing as the meaning of the boolean value is not clear", "limit the function to only two possible behaviors"; remedies include "making the argument a keyword-only argument". Run: Good positional `True` -> `TypeError`; keyword call prints identically to Bad. |
| python-api-context-manager | verified | contextlib: "Most types managing resources support the context manager protocol, which closes thing on leaving the with statement" (`closing` parameter is named `thing`), and `closing()` is "most useful for third party types that don't support context managers". Run: Bad `with` -> `TypeError`; Good prints open/close. Non-blocking annotation note below. |
| python-api-deprecation-warning | verified | warnings: DeprecationWarning is "intended for other Python developers (ignored by default, unless triggered by code in `__main__`)"; `stacklevel` "makes the warning refer to deprecated_api's caller". Run: Bad warning attributed to the snippet line, Good (stacklevel=2) to the caller. |
| python-api-enum-closed-set | verified | enum: "a set of symbolic names (members) bound to unique values", "can be iterated over to return its canonical... members in definition order", "uses call syntax to return members by value". Run: `Align("left") is Align.LEFT`, iteration order `LEFT, RIGHT`; Bad typo only fails at runtime. |
| python-api-import-side-effects | verified | modules tutorial: "These statements are intended to initialize the module. They are executed only the first time the module name is encountered in an import statement". Good ran with `run_name != "__main__"`: `load` defined, guard not executed. Bad skipped by design (import-time file read is the anti-pattern). |
| python-api-iterable-parameters | verified | `collections.abc`: "abstract base classes that can be used to test whether a class provides a particular interface". Run: Good `total` accepts a tuple and a generator; Bad's `list` annotation would reject them statically. |
| python-api-keyword-only | verified | PEP 3102: keyword-only arguments "can only be supplied by keyword and which will never be automatically filled in by a positional argument"; tutorial recap: "Use keyword-only when names have meaning and the function definition is more understandable by being explicit with names or you want to prevent users relying on the position". Run: Good defaults `5.0`/`3`; positional call -> `TypeError`. |
| python-api-pathlike | verified | `os`: `PathLike` is "An abstract base class for objects representing a file system path"; `fspath` returns the representation for `str`, `bytes`, or `__fspath__`. Run: Good reads both `pathlib.Path` and `str`; Bad accepts a `Path` at runtime despite its `str` annotation. "builtins such as open" clause verified behaviorally (note below). |
| python-api-return-copy | verified | `copy`: "Assignment statements in Python do not copy objects, they create bindings between a target and an object"; the docs name "`list.copy()`, `dict.copy()` or `set.copy()`" among shallow-copy methods. Run: Bad leaks the live list (external append visible), Good copy stays independent. |
| python-api-singledispatch | verified | `functools`: `singledispatch` will "Transform a function into a single-dispatch generic function"; "the dispatch happens on the type of the first argument"; `register` "will infer the type of the first argument automatically". Run: bytes/bytearray/int results identical to Bad; registry accepts a third-party type. |
| python-api-timeout-parameter | verified | `urllib.request`: "The optional timeout parameter specifies a timeout in seconds for blocking operations like the connection attempt (if not specified, the global default timeout setting will be used)". Run (`urlopen` stubbed, no network): Good forwards `timeout=2.5` and default `10.0`; Bad has no timeout parameter. |

## Cross-cutting checks

- Sources: 21/21 distinct cited URLs fetch HTTP 200; every Why's central claim was located in the fetched text (verbatim or faithful paraphrase). Every rule cites at least one primary source (PEP, official docs, or Ruff rule page).
- Compile: 54/54 snippets pass `python3 -m py_compile` on CPython 3.14.6; all fences tagged `python`; longest snippet 16 lines.
- Behavior: 27/27 probes pass; no network (timeout probe used a stub; the earlier failed-DNS attempt was a harness bug, fixed before the recorded run); all writes under scratch.
- Formatting: deterministic validator reports 0 errors for the pack (201 clean with compile enabled, before and after flips). Summaries <= 30 words, heading order correct, no TODO/FIXME/XXX/TBD, no hedging in summaries; frontmatter `baseline: latest`, `status: draft` before flip.
- Links/ids: all `related` ids resolve (0 unresolved); all See Also targets exist and link text matches the target id (0 mismatches).
- Duplicates: max Jaccard (title+summary) for any batch rule against the rest of the Python pack is 0.24 (`anti-lambda-assignment` ~ `type-self-return`); no within-batch pair reaches 0.4. Near-candidates checked individually and distinct: `anti-none-equality` ~ `anti-is-literal` (0.21), `anti-mutable-default` ~ `anti-mutable-class-attribute` (0.22), `api-keyword-only` ~ `api-bool-params` (0.17), `api-context-manager` ~ `err-context-manager-cleanup` (0.17), `api-deprecation-warning` ~ `obs-stacklevel-wrappers` (0.23), `api-pathlike` ~ `io-pathlib-paths`, `api-return-copy` ~ `mem-copy-shallow-default`.

## Flags assessed

- No author-flagged `compile_exempt` or preview-feature rules in this batch.
- `api-import-side-effects`: Bad intentionally skipped for execution (its import-time `load("config.json")` is the demonstrated anti-pattern and would read a file outside scratch); its Good was executed as a non-`__main__` module and defines `load` without running the guard.
- `python-anti-is-literal`: Bad's `SyntaxWarning` is the rule's subject; accepted, and all other 53 snippets compile warning-free.

## Non-blocking notes

- `api-context-manager`: the Good snippet spells `-> "Session"` as a quoted forward reference, while the pack's verified `type-forward-refs-unquoted` marks quoting as `should`-level non-idiomatic on the deferred-annotation baseline, and `type-self-return` names `__enter__` as a `Self` case. The snippet compiles and runs and the rule's decision (implement `__enter__`/`__exit__`) is unaffected; a follow-up edit to `-> Self`/unquoted would remove the cross-rule style inconsistency (outside verifier ownership).
- `anti-percent-format`: the validator's `forbidden-token "placeholder"` warning is a false positive — the word describes printf format placeholders, not placeholder text.
- `anti-is-literal`: the Why names interning as the mechanism; Ruff's text says such comparisons "often work 'by accident'". The mechanism is true, just not verbatim in the cited page.
- `anti-type-equality`: the `bool` vs `int` and virtual-subclass facts extend PEP 8's sentence; both verified behaviorally (`isinstance(True, int)`; `abc` register example).
- `api-pathlike`: the "Builtins such as open accept path-like objects" clause is not on the `os` page (which documents `PathLike`/`fspath` and os functions accepting path-like); verified behaviorally with `open(Path)`.
- `anti-wildcard-import`: the summary's "overwrites existing bindings" is true of `import *` but is not in the cited sentences; the hiding/namespace claim is sourced.
- `api-abc-interface`: the Good's bare `...` abstract body is explicitly exempt from the elision check for Python (`src/rules/validate.ts`).

## Follow-ups (outside verifier ownership)

- `INDEX.md` still reports 150 verified and labels batch 7 "in verification"; after these 27 flips the pack is 177/201. Batch 8 remains authored as drafts, as the index says.
- Optional consistency edit for `api-context-manager` noted above.

## Counts

- Verified: 27/27 (14 `anti`, 13 `api`)
- Rejected: 0
- Blockers: none
