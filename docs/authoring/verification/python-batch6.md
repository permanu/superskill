# Verification Report - Python Batch 6 (`mem` + `io`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/python/mem-*.md` (12) and `io-*.md` (12) = 24 rules; all entered as `status: draft`
- Toolchain: CPython 3.14.6 (`/opt/homebrew/bin/python3`), macOS; docs fetched as live 3.14.8 pages
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/batch6`
- Ownership: flipped `status` to `verified` on all 24 rules. No other edits; no git.

## Method

- Fetched all 17 distinct cited URLs (`gc`, `weakref`, `tracemalloc`, `devmode`, `array`, `copy`, `collections`, `io`, `shutil`, `os`, `urllib.request`, `contextlib`, `pathlib`, `subprocess`, `hashlib`, `tempfile`, `warnings`): every one returned HTTP 200; converted to text and located the exact supporting sentences for each Why claim.
- Extracted both snippets from all 24 rules (48 files) and ran `python3 -m py_compile` on each with CPython 3.14.6.
- Ran 24 behavioral probes with short timeouts in scratch, including the cases named in the brief: finalizer idempotence, weakref cache discard, cycle breaking, ExitStack unwind, bounded deque, atomic replace, scandir, subprocess communicate (deadlock reproduced), glob, copytree/move, walk prune, file digest, pathlib, line iteration, binary mode, copy file. `io-response-close` ran without network against a local `file://` URL.
- Assessed the two author-flagged rules (`mem-resource-warning`, `mem-gc-freeze-fork`) with dedicated runs (below).
- Cross-checked frontmatter, ids, `related`/See Also resolution, summary limits, hedging tokens, near-duplicates (Jaccard) within the batch and against the whole Python pack.
- Ran the deterministic validator with compile enabled: `node dist/rules/cli.js validate --lang python` -> 150 rules, 0 errors, 2 warnings (both the pre-existing contract-allowed in-comment ellipses in `obs-perf-counter-durations`, outside this batch).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| python-mem-array-compact | verified | array docs: "compactly represent an array of basic values", "type of objects stored in them is constrained", `itemsize` exposed. Run: `load_samples(b"1.5,2.5,3")` -> `array('d')` = [1.5, 2.5, 3.0], itemsize 8; Bad list works but boxed. |
| python-mem-bounded-deque | verified | collections: "the deque is bounded to the specified maximum length... a corresponding number of items are discarded from the opposite end". Run: 1500 records -> len 1000, first "e500"; Bad list len 1500. |
| python-mem-break-cycles | verified | gc: "the collector supplements the reference counting already used in Python"; weakref: "not enough to keep the object alive". Run: weak-edge node dies on `del` without `gc.collect()`; strong cycle stays alive until `gc.collect()`. |
| python-mem-copy-shallow-default | verified | copy docs: shallow holds references, deep "inserts copies... recursively"; "Recursive objects... may cause a recursive loop"; "it may copy too much, such as data which is intended to be shared". Run: Good shares nested list; Bad deepcopy isolates. `prefer` rule; Why states deepcopy is required when nested objects must not be shared. |
| python-mem-exit-stack | verified | contextlib: ExitStack exists to "programmatically combine other context managers"; "All opened files will automatically be closed at the end of the with statement, even if attempts to open files later in the list raise an exception". Run: with a missing second path, the first file is closed by the stack (spy). Note: CPython refcounting also reclaims the Bad's partially-built handle when no traceback is retained; the "no owner" fragility and the docs' guarantee stand. |
| python-mem-finalize-not-del | verified | weakref: finalize is a "straight forward way to register a cleanup function"; `__del__` handling is "notoriously implementation specific, since it depends on internal details of the interpreter's garbage collector"; "func, args and kwargs do not own any references to obj... otherwise obj will never be garbage collected". Run: callback runs exactly once on collection, and once on explicit call. |
| python-mem-finalizer-call | verified | weakref: "alive until it is called (either explicitly or at garbage collection), and after that it is dead"; "the finalizer will invoke the callback at most once"; TempDir's `remove()` is `self._finalizer()`. Run: Good cleanup runs 1x, Bad 2x (direct call + collection). |
| python-mem-gc-freeze-fork | verified | gc: freeze "move[s] them to a permanent generation and ignore[s] them in all the future collections"; recipe "call gc.disable() early in the parent process, gc.freeze() right before fork(), and gc.enable() early in child processes" (quoted accurately in Why). Run: freeze + fork Pool maps [-1,2,-3] -> [1,2,3], freeze count 12595; post-freeze allocation not added to the permanent generation. Scope check: Good shows the pre-fork freeze step the rule is about; Why carries the full docs recipe (see Flags). |
| python-mem-resource-warning | verified | devmode: ResourceWarning is among warnings "shown" by the mode; example names the unclosed file; "Not closing a resource explicitly can leave a resource open for way longer than expected; it can cause severe issues upon exiting Python". warnings: action `"error"` turns matching warnings into exceptions. Run: after `simplefilter("error", ResourceWarning)`, an unclosed file emits `ResourceWarning: unclosed file <_io.TextIOWrapper ...>` as an error; the with-block path emits nothing (see Flags). |
| python-mem-tracemalloc-snapshot | verified | tracemalloc: "debug tool to trace memory blocks allocated by Python"; "Compute the differences between two snapshots to detect memory leaks"; "Statistics on allocated memory blocks per filename and per line number". Run: `leak_report()` prints `good.py:7: size=104 KiB (+104 KiB), count=201...` and `tracemalloc.stop()` leaves tracing off. |
| python-mem-weakref-cache | verified | weakref: "A primary use for weak references is to implement caches or mappings holding large objects, where it's desired that a large object not be kept alive solely because it appears in a cache or mapping"; WeakValueDictionary and WeakSet named. Run: cache entry vanishes with the last strong ref; Bad dict pins the value. |
| python-mem-weakref-slots | verified | weakref: "When `__slots__` are defined for a given type, weak reference support is disabled unless a `'__weakref__'` string is also present in the sequence of strings in the `__slots__` declaration". Run: Bad Token -> `TypeError: cannot create weak reference...`; Good works. |
| python-io-atomic-replace | verified | os.replace: "If successful, the renaming will be an atomic operation (this is a POSIX requirement)"; tempfile: NamedTemporaryFile guarantees a visible name with `dir`/`delete` parameters. Run: two saves replace content; directory afterwards contains only the destination file (no scratch leftovers). |
| python-io-binary-mode | verified | io: binary I/O "expects bytes-like objects and produces bytes objects. No encoding, decoding, or newline translation is performed"; text I/O applies "encoding and decoding... as well as optional translation of platform-specific newline characters". hashlib: "fileobj must be a file-like object opened for reading in binary mode". Run: Good digest equals SHA-256 of raw bytes; Bad raises UnicodeDecodeError on non-UTF-8 payload. |
| python-io-communicate-pipes | verified | subprocess: wait "will deadlock when using stdout=PIPE... and the child process generates enough output... Use Popen.communicate()"; run passes `timeout`/`check` through to communicate. Run: Good drains 200 KB; Bad wait-then-read hangs and is killed at the 5 s probe timeout (deadlock reproduced). |
| python-io-copy-file | verified | shutil: "fast-copy means that the copying operation occurs within the kernel, avoiding the use of userspace buffers in Python as in outfd.write(infd.read())"; "If src and dst specify the same file, SameFileError is raised"; follow_symlinks documented. Run: bytes copied; same-file raises SameFileError. |
| python-io-copytree | verified | shutil: copytree "Recursively copy an entire directory tree"; "Permissions and times of directories are copied with copystat()... individual files are copied using copy2()"; "All intermediate directories needed to contain dst will also be created"; failures collected as "an Error... with a list of reasons". Run: nested tree + file mode 0o640 copied. Note: the Bad loop does recurse and preserves file modes via shutil.copy; what it lacks is directory metadata and Error collection — the summary's "nested directories" is a general hand-rolled-loop rationale, non-blocking. |
| python-io-glob-patterns | verified | pathlib: glob yields "all matching files (of any kind)"; rglob is the recursive form; documented wildcard pattern language. Run: `glob('*.md')` -> [a.md]; `rglob('*.md')` reaches nested c.md. Note: neither snippet recurses; "miss nested matches" is motivation for using the library matcher. |
| python-io-iterate-lines | verified | io: "IOBase (and its subclasses) supports the iterator protocol, meaning that an IOBase object can be iterated over yielding the lines in a stream"; readlines note: "it's already possible to iterate on file objects using `for line in file:`... without calling file.readlines()". Run: both versions count 2; Good streams from the file iterator. |
| python-io-move-cross-device | verified | shutil: "os.rename() is preferably used internally when src and the destination are on the same filesystem. In case os.rename() fails due to OSError... falls back to using copy_function, in which case src is copied... and then removed"; os.rename: "may fail if src and dst are on different filesystems. Use shutil.move()". Run: same-fs move works; with os.rename patched to raise EXDEV, shutil.move copies+unlinks while Bad raises. |
| python-io-pathlib-paths | verified | pathlib: "classes representing filesystem paths with semantics appropriate for different operating systems", split pure/concrete; "The slash operator helps create child paths, like os.path.join()". Run: `report_path(Path('/tmp/base'), 'q3')` == `Path('/tmp/base/reports/q3.txt')`. |
| python-io-response-close | verified | urllib.request: urlopen "always returns an object which can work as a context manager and has the properties url, headers, and status"; contextlib: `closing(urlopen(...))` example and "urlopen() would normally be used in a context manager". Run (no network, local `file://` URL): with-block reads `b"hello"` and `response.closed` is True after exit. |
| python-io-scandir-walk | verified | os: "Using scandir() instead of listdir() can significantly increase the performance of code that also needs file type or file attribute information, because os.DirEntry objects expose this information if the operating system provides it"; iterator "supports the context manager protocol... advisable to call it explicitly or use the with statement". Run: DirEntry.stat().st_size total equals listdir+getsize result. |
| python-io-walk-prune | verified | os.walk: "When topdown is True, the caller can modify the dirnames list in-place... walk() will only recurse into the subdirectories whose names remain in dirnames; this can be used to prune the search". Run: an os.scandir spy shows `.git`/`node_modules` are never scanned; results contain only `src/a.py`. |

## Flags assessed

- `mem-resource-warning` (promotes ResourceWarning via `warnings.simplefilter("error", ResourceWarning)`): accurate. The warnings docs define action `"error"` as "turn matching warnings into exceptions" and `simplefilter` as the in-process filter entry point; devmode lists ResourceWarning as shown by the mode and names the unclosed file in its example. Run confirms the unclosed file surfaces as `ResourceWarning: unclosed file <_io.TextIOWrapper ...>` while the with-block path is silent. Scope is development-time only, as the title states.
- `mem-gc-freeze-fork` (Good shows only the pre-fork `gc.freeze()`): accurate and adequately scoped. The gc docs' full recipe ("disable early in the parent, freeze right before fork, enable early in each child") is quoted correctly in the Why, which labels freeze as "the pre-fork step"; the snippet demonstrates exactly that one step. The rule does not claim freeze alone is the complete recipe, so the atomic decision stands.

## Cross-cutting checks

- Sources: 17/17 distinct cited URLs fetch HTTP 200; every Why's central claim was located in the fetched text (verbatim or near-verbatim). All 24 rules cite at least one primary source and all cited URLs are in the fetched set.
- Compile: 48/48 snippets pass `python3 -m py_compile` on CPython 3.14.6; all fences tagged `python`.
- Behavior: 24/24 probes pass. No network; `io-response-close` used a local `file://` URL only; all writes under scratch.
- Formatting: deterministic validator reports 0 errors for the pack (150 clean with compile enabled); the only warnings are the two pre-existing in-comment ellipses outside this batch. Summaries <= 30 words, no hedging tokens outside fences, heading order correct, frontmatter `baseline: latest` and `status: draft` before flip.
- Links/ids: all `related` ids resolve (0 unresolved); all See Also targets exist and link text matches the target id (0 mismatches).
- Duplicates: max within-batch Jaccard (title+summary) is 0.25 for `io-copy-file` ~ `io-copytree` (distinct decisions, cross-referenced); no batch rule exceeds 0.25 against the rest of the Python pack. Near-candidates checked individually: `perf-deque-endpoints`, `perf-cache-pure`, `err-context-manager-cleanup`, `sec-tempfile-secure`, `data-encoding-explicit`, `perf-generator-stream`, and the `urlopen` examples in `api-timeout-parameter`/`err-retry-idempotent` are distinct decisions.

## Non-blocking notes

- `mem-exit-stack`: on CPython the Bad's partially-acquired handle is closed by refcounting when the failing comprehension unwinds and no traceback is retained; the rule's point is that nothing owns it explicitly and the docs' close guarantee belongs to the ExitStack form.
- `io-copytree`: the Bad loop recurses and preserves file modes via `shutil.copy`; its demonstrable gaps are directory metadata/permissions and `shutil.Error` collection. Summary wording is a general rationale, not a false claim about copytree.
- `io-glob-patterns`: neither snippet is recursive; "miss nested matches" motivates `rglob`/`**` from the same pattern language.
- `mem-copy-shallow-default`: `prefer`-level; deepcopy remains correct when nested isolation is required, as the Why states.

## Follow-ups (outside verifier ownership)

- `INDEX.md` still says batch 6 is authored as drafts and reports 126 verified; stale after these 24 flips (now 150/150).

## Counts

- Verified: 24/24 (12 `mem`, 12 `io`)
- Rejected: 0
- Blockers: none
