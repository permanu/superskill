# Verification Report - Python Batch 8 (`lint` + `doc`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/python/lint-*.md` (12) and `doc-*.md` (12) = 24 rules; all entered as `status: draft`
- Toolchain: CPython 3.14.6 (`/opt/homebrew/bin/python3`), macOS; Ruff 0.16.10 and mypy 2.4.0 installed into a scratch venv for probing only; sources fetched live (Python 3.14.8 docs, current PEP 8 / PEP 257 / PEP 561, Ruff docs, Google Python Style Guide, mypy docs)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/py-batch8`
- Ownership: flipped `status` to `verified` on all 24 rules. No other edits; no git.

## Method

- Fetched all 13 distinct cited URLs (Ruff F401, Ruff F841, Ruff linter, Ruff configuration, `compileall`, PEP 561, `typing`, mypy getting started, PEP 257, PEP 8, tutorial controlflow, Google Python Style Guide, `argparse`): every one resolved, and the exact supporting sentences for each Why claim were located in the fetched text.
- Extracted both snippets from all 24 rules (48 files) and ran `python3 -m py_compile` on each with CPython 3.14.6: 48/48 pass, no warnings.
- Probed every rule's behavior where observable: `compileall` on a scratch package with a deliberate syntax error, `argparse --help` output, `__doc__` placement/content for the docstring rules, unused-import / unused-local detection via AST, and the `py.typed` marker check against marked and unmarked packages. Ruff/mypy probes were run against the actual snippets and purpose-built fixtures (F401, F841 fix safety, bare vs coded `noqa`, file-level vs line-level suppression, RUF100 stale suppression + `--fix`, `ruff format --check` exit codes, mypy static checking, py.typed consumption).
- Cross-checked frontmatter, ids, `baseline: latest`, `related`/See Also resolution, summary limits, hedging tokens, snippet line counts, and duplicates (exact title/summary collisions plus semantic near-candidates) within the batch and against the whole Python pack.
- Ran the deterministic validator (`node dist/rules/cli.js validate --lang python --no-compile`) before and after the flips: 0 errors; the only 3 warnings are outside this batch (`anti-percent-format`, `obs-perf-counter-durations`). No `lint-*`/`doc-*` finding.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| python-lint-unused-imports | verified | F401 page: "Unused imports add a performance overhead at runtime, and risk creating import cycles. They also increase the cognitive load of reading the code"; redundant alias / `__all__` re-export advice and `importlib.util.find_spec` availability advice match the Why. Probe: `ruff check --select F401` flags `os` in Bad (exit 1), Good clean (exit 0); cleanup preserves `parse` output. |
| python-lint-compileall-ci | verified | `compileall` docs: "compile Python source files in a directory tree"; usable as `python -m compileall`; `compile_dir` "Return a true value if all the files compiled successfully, and a false value otherwise". Probe: dirty tree exits 1 and names `broken.py`; clean tree exits 0; `compile_file` returns `True`. |
| python-lint-noqa-coded | verified | Linter docs line-level suppression: `# noqa: F841` ignores one named rule, bare `# noqa` "Ignore _all_ violations". Probe: `l = 1  # noqa: E741` leaves F841 reported; bare `# noqa` suppresses both E741 and F841. |
| python-lint-unused-noqa | verified | Linter docs: RUF100 enforces suppressions are "valid", i.e. violations "actually being triggered and suppressed"; `--extend-select RUF100` shown verbatim; fix removes unused suppressions. Probe: stale `# noqa: F401` -> RUF100 flagged (exit 1), `--fix` removed the directive. |
| python-lint-fix-safe | verified | Linter docs: safe fixes retain meaning and intent; unsafe fixes "could lead to a change in runtime behavior, the removal of comments, or both"; RUF015 exception-type change is the given example; "Ruff only enables safe fixes by default", `--unsafe-fixes` required. Probe: default `--fix` leaves F841 ("No fixes available (1 hidden fix...)"), `--fix --unsafe-fixes` removes the assignment. |
| python-lint-suppress-line | verified | Linter docs file-level section: `# ruff: noqa: {code}` "anywhere in the file" suppresses that rule across the file; line-level trailing `# noqa: {code}` covers one line. Probe: file-level suppressed both `os` and a second unused `sys`; line-level left the second import reported. |
| python-lint-py-typed | verified | PEP 561: maintainers "MUST add a marker file named `py.typed`"; "This marker applies recursively"; module resolution uses packages that opt in; `package_data` ships the file. Probe (mypy 2.4.0): marked package -> inline types used (revealed `int`, arg-type error on `f("a")`); unmarked -> "Skipping analyzing ... missing library stubs or py.typed marker", revealed `Any`. |
| python-lint-unused-variables | verified | F841 page: a variable "defined but not used is likely a mistake, and should be removed to avoid confusion"; underscore prefix or `lint.dummy-variable-rgx` for intentional cases; fix "marked as unsafe because removing an unused variable assignment may delete comments". Probe: F841 flags `count`; Good clean; unsafe-fix behavior confirmed (see lint-fix-safe). |
| python-lint-select-explicit | verified | Linter docs recommended guidelines: "Prefer `lint.select` over `lint.extend-select` to make your rule set explicit"; "Enabling `ALL` will implicitly enable new rules whenever you upgrade"; "Start with a small set of rules ... and add a group at-a-time". |
| python-lint-format-check | verified | Linter docs: formatting-category rules are "generally redundant with a code formatter"; "If you use a code formatter, you will likely want to leave this category off". Configuration reference: `ruff format --check` exits non-zero if files would be modified, without writing. Probe: unformatted exit 1 / formatted exit 0; `--preview --select formatting` selects E501, confirming the Bad example is a formatting-category rule. |
| python-lint-config-committed | verified | Configuration docs: "Ruff can be configured through a `pyproject.toml`, `ruff.toml`, or `.ruff.toml` file"; "Any config-file-supported settings that are provided on the command-line ... will override the settings in every resolved configuration file". |
| python-lint-type-check-ci | verified | `typing` docs note: "The Python runtime does not enforce function and variable type annotations. They can be used by third party tools such as type checkers"; mypy getting started: "Mypy will type check your code statically: this means that it will check for errors without ever running your code". Probe: mypy flags `add("x", 1)` [arg-type] with no execution. |
| python-doc-docstring-public | verified | PEP 257: "All modules should normally have docstrings, and all functions and classes exported by a module should also have docstrings"; PEP 8: "Write docstrings for all public modules, functions, classes, and methods." The help()/pydoc clause is not verbatim in these two PEPs; verified behaviorally (`pydoc.render_doc(parse)` contains the Good docstring). |
| python-doc-comments-current | verified | PEP 8: "Comments that contradict the code are worse than no comments. Always make a priority of keeping the comments up-to-date when the code changes!" Bad/Good demonstrate the contradiction/agreement pair; both compile. |
| python-doc-comments-sentences | verified | PEP 8: "Comments should be complete sentences. The first word should be capitalized, unless it is an identifier..."; "Block comments generally consist of one or more paragraphs built out of complete sentences, with each sentence ending in a period." |
| python-doc-summary-imperative | verified | PEP 257: "The docstring is a phrase ending in a period. It prescribes the function or method's effect as a command ('Do this', 'Return that'), not as a description; e.g. don't write 'Returns the pathname'"; tutorial: "The first line should always be a short, concise summary ... begin with a capital letter and end with a period." Probe: Good `__doc__ == "Retry the request."`. |
| python-doc-blank-after-summary | verified | PEP 257: "Multi-line docstrings consist of a summary line ... followed by a blank line, followed by a more elaborate description"; "it is important that it fits on one line and is separated from the rest of the docstring by a blank line"; tutorial: "the second line should be blank". Probe: Good `__doc__` contains `\n\n`, Bad does not. |
| python-doc-docstring-first-statement | verified | PEP 257: "A docstring is a string literal that occurs as the first statement in a module, function, class, or method definition. Such a docstring becomes the `__doc__` special attribute"; Google: "A docstring is a string that is the first statement in a package, module, class or function." Probe: late string -> `__doc__ is None`; first string -> `__doc__` set. |
| python-doc-why-not-what | verified | PEP 8 inline comments: "Inline comments are unnecessary and in fact distracting if they state the obvious. Don't do this: `x = x + 1 # Increment x`. But sometimes, this is useful: `x = x + 1 # Compensate for border`"; "Use inline comments sparingly." |
| python-doc-raises-section | verified | Google guide: "List all exceptions that are relevant to the interface followed by a description. Use a similar exception name + colon + space or newline and hanging indent style as described in *Args:*"; "You should not document exceptions that get raised if the API specified in the docstring is violated". |
| python-doc-cli-help | verified | `argparse`: "makes it easy to write user-friendly command-line interfaces ... also automatically generates help and usage messages"; description "gives a brief description of what the program does and how it works"; help is "A brief description of what the argument does." Probe: Good `--help` prints description and help text; Bad prints neither. |
| python-doc-module-docstring | verified | PEP 257: "The docstring for a module should generally list the classes, exceptions and functions ... that are exported by the module, with a one-line summary of each"; Google: "Files should start with a docstring describing the contents and usage of the module." Probe: Good module `__doc__` starts with the summary; Bad module `__doc__ is None`. |
| python-doc-closing-quotes | verified | PEP 257: "Unless the entire docstring fits on a line, place the closing quotes on a line by themselves."; PEP 8: the `"""` ending a multiline docstring "should be on a line by itself" and one-liners keep it on the same line. Probe: Good `__doc__` ends with a newline, Bad does not. |
| python-doc-args-section | verified | Google guide: "A docstring should give enough information to write a call to the function without reading the function's code"; "List each parameter by name. A description should follow the name, and be separated by a colon followed by either a space or newline." |

## Cross-cutting checks

- Sources: 13/13 distinct cited URLs fetch successfully; every Why's central claim was located in the fetched text (verbatim or faithful paraphrase). Every rule cites at least one primary source.
- Compile: 48/48 snippets pass `python3 -m py_compile` on CPython 3.14.6; all fences tagged `python`; longest snippet is 8 lines; no elisions or placeholders.
- Behavior: all named cases probed in scratch with short timeouts; all pass. Ruff/mypy were absent system-wide, so both were installed into a scratch venv and the cited rules were probed directly (F401, F841, F841 unsafe fix, noqa scope, RUF100, `ruff format --check`, mypy static check, py.typed).
- Formatting: deterministic validator reports 0 errors for the pack before and after the flips; no `lint-*`/`doc-*` finding. Summaries <= 30 words, heading order correct, no TODO/FIXME/XXX/TBD, no hedging in summaries; `baseline: latest` everywhere.
- Links/ids: all `related` ids resolve (0 unresolved); all See Also targets exist (0 mismatches); ids match paths.
- Duplicates: no exact title or summary collisions within the batch or against the whole Python pack; near-candidates reviewed individually and distinct (`lint-unused-imports` vs `lint-unused-variables`; `lint-noqa-coded` vs `lint-suppress-line` vs `lint-unused-noqa`; `doc-comments-sentences` vs `doc-comments-current` vs `doc-why-not-what`; `doc-blank-after-summary` vs `doc-closing-quotes`; `doc-docstring-public` vs `doc-module-docstring`; `lint-select-explicit` vs `lint-config-committed`; `doc-cli-help` vs `proj-console-scripts`).

## Flags assessed

- No author-flagged `compile_exempt` rules in this batch; no preview/experimental features are the default in any snippet.
- `lint-format-check`: the Bad example's E501 is a `formatting`-category rule, confirmed by `ruff check --preview --select formatting` selecting `line-too-long`; the Why's "formatting category is redundant with a formatter" sentence is quoted from the linter docs.

## Non-blocking notes

- `doc-docstring-public`: the "what help() and pydoc surface" clause is not verbatim in the two cited PEPs (they define docstrings as `__doc__`); the clause is true and was verified behaviorally via `pydoc.render_doc`. The rule's central claims are sourced.
- `doc-args-section`: "units, defaults, and accepted ranges" is author rationale, not verbatim Google text; the guide's name+colon format and "enough information to write a call" sentence are verbatim.
- `INDEX.md` lists three of these rules with lightly paraphrased one-liners (`doc-args-section`, `doc-raises-section`, `doc-summary-imperative`); each index line is accurate and the validator is clean. The index header (`Rules: 229 (verified: 177)`) is now stale after these 24 flips (expected 201 verified); updating it is outside verifier ownership.

## Counts

- Verified: 24/24 (12 `lint`, 12 `doc`)
- Rejected: 0
- Blockers: none
