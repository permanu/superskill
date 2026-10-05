# Verification Report — C++ Batch 6 (sec + io)

**Verifier:** adversarial (separate context; did not author these rules)
**Date:** 2026-10-05
**Scope:** 24 draft rules — 12 `catalog/rules/cpp/sec-*.md`, 12 `catalog/rules/cpp/io-*.md`
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), arm64-apple-darwin25.6.0; `-std=c++23`

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; applied the five checks per rule.
2. Fetched all 33 distinct cited URLs (all HTTP 200) and grepped each for the specific claim (CWE descriptions/mitigations and cppreference article text).
3. Extracted all 48 fenced snippets and compiled each independently with `clang++ -fsyntax-only -std=c++23 -Wall`.
4. Ran safe behavior cases and focused harnesses under timeouts: bounds-checked access under ASan, overflow wrap/refusal, command injection, format-string read, path-traversal confinement, secure temp files (`tmpfile` visibility + `tmpnam` persistence), `random_device` vs `rand` determinism, `O_CLOEXEC` across `fork`+`exec`, stream state/RAII, whole-file reads, error-code overloads, chmod modes, `flush` failure (`pubsync` → `badbit`), istringstream parsing, sync/stdio byte-equality.
5. Mechanical checks: frontmatter fields, id/path match, section order, one `cpp` fence per Bad/Good, summary ≤ 30 words, snippets ≤ 25 lines, `related` IDs and See Also links resolve and agree, no TODO/elisions/hedges, no linter claims without `enforce: tool`.
6. Duplicate review within the batch and against the rest of `catalog/rules/cpp/` (pairwise summary Jaccard < 0.5; semantic cross-link review), plus the deterministic validator (`node dist/rules/cli.js validate --lang cpp --json`).

## Source verification (evidence quotes)

- **CWE-125** — "reads data past the end, or before the beginning, of the intended buffer." (`sec-bounds-checked`)
- **CWE-190** — "performs a calculation that can produce an integer overflow or wraparound … the value may become a very small or negative number." (`sec-integer-overflow`)
- **CWE-120** — "copies an input buffer to an output buffer without verifying that the size of the input buffer is less than the size of the output buffer." (`sec-safe-string-functions`)
- **CWE-78** — "constructs all or part of an OS command using externally-influenced input … but it does not neutralize … special elements." (`sec-no-command-injection`)
- **CWE-134** — page's example is `printf(string);` and explains `%x` reads stack and `%n` writes to the stack. (`sec-no-format-string`)
- **CWE-377** — tmpnam-group race described exactly ("no mechanism to prevent another process or an attacker from creating a file with the same name after it is selected"); mkstemp "is a reasonably safe way create temporary files … opened using mode 0600". (`sec-secure-temp-files`, `sec-fd-cloexec`)
- **CWE-798** — "hard-coded password is the same for each installation … usually cannot be changed or disabled … without manually modifying the program." (`sec-no-hardcoded-secrets`)
- **CWE-209** — "person making the request should not know what the full pathname of the configuration directory is"; "select the proper number of '..' sequences to navigate to the targeted file." (`sec-error-message-leakage`)
- **CWE-338** — "session ID or a seed for generating a cryptographic key, then an attacker may be able to easily guess the ID or cryptographic key"; mitigation: "cryptographically strong". (`sec-crypto-random`)
- **CWE-843** — "a memory location is interpreted as a different object than intended." (`sec-no-type-punning`)
- **CWE-403** — "A process does not close sensitive file descriptors before invoking a child process … the child process inherits any open file descriptors"; "child process has fewer privileges than the parent". (`sec-fd-cloexec`)
- **CWE-367** — "state can change between the check and the use"; "The most basic advice … is to not perform a check before the use." (`io-no-toctou`)
- **CWE-276** — "permissions are set to allow anyone to modify those files"; mitigation: "access and modification attributes for files to only those users who actually require those actions." (`io-file-permissions`)
- **cppreference `vector`** — `at` is "access specified element with bounds checking"; `operator[]` is "access specified element" (no check; UB documented on the subpage). (`sec-bounds-checked`)
- **cppreference `bit_cast`** — "Obtain a value of type To by reinterpreting the object representation of From"; "participates … only if sizeof(To) == sizeof(From) and both … are TriviallyCopyable"; note: `reinterpret_cast` "shall not be used to reinterpret object representation … because of the type aliasing rule." (`sec-no-type-punning`)
- **cppreference `random_device`** — "produces non-deterministic random numbers." (`sec-crypto-random`)
- **cppreference `basic_string`** — "stores and manipulates sequences of character-like objects"; "stored contiguously". (`sec-safe-string-functions`)
- **cppreference `format`** — "std::format does a compile-time check on the format string." (`sec-no-format-string`)
- **cppreference `getenv`** — "environment list provided by the host environment." (`sec-no-hardcoded-secrets`)
- **cppreference `path`** — "behaves as if it stores a pathname in the native format"; directory-separator definition. (`sec-path-traversal`, `io-path-type`)
- **cppreference `rename`** — "existing non-directory file: new_p is first deleted, then, without allowing other processes to observe new_p as deleted, the pathname new_p is linked … and old_p is unlinked." (`io-atomic-replace`)
- **cppreference `basic_fstream`** — destructor "destructs the basic_fstream and the associated buffer, closes the file." (`io-raii-streams`, `io-atomic-replace`)
- **cppreference `openmode`** — `binary` = "open in binary mode." (`io-binary-mode`)
- **cppreference `basic_ios`** — `failbit` = "input/output operation failed"; `operator bool` = "checks if no error has occurred (synonym of !fail())". (`io-check-state`)
- **cppreference `basic_istringstream`** — "implements input operations on string based streams." (`io-istringstream-parse`)
- **cppreference `istreambuf_iterator`** — "reads successive characters from the std::basic_streambuf"; default-constructed = "end-of-stream iterator." (`io-read-whole-file`)
- **cppreference `flush`** — "calls rdbuf()->pubsync(). If the call returns -1, calls setstate(badbit)." (`io-flush-check`)
- **cppreference `sync_with_stdio`** — "synchronized C++ streams are unbuffered … immediately applied to the corresponding C stream's buffer"; off: "allowed to buffer their I/O independently"; after I/O: "implementation-defined." (`io-sync-with-stdio`)
- **cppreference `filesystem`** — "provides facilities for performing operations on file systems"; "behavior is undefined if the calls … introduce a file system race." (`io-no-toctou`, `io-error-code-overloads`)
- **cppreference `remove`** (fetched to check the error-code rule's premise) — "If p did not exist, this function returns false and does not report an error."

## Compile results (`-fsyntax-only -std=c++23 -Wall`)

- 48/48 snippets: exit 0.
- Intended/documented diagnostics: `sec-no-format-string` Bad → `-Wformat-security` ("format string is not a string literal (potentially insecure)"); `sec-secure-temp-files` Bad → `tmpnam` deprecation ("Due to security concerns inherent in the design of tmpnam(3), it is highly recommended that you use mkstemp(3) instead"). Accepted.
- Benign extra: `sec-no-command-injection` Good → `-Wunused-variable` on `entry` (non-blocking).

## Behavior results (timeouts applied)

- **bounds-checked:** Good `at()` throws `out_of_range` (rc=1); Bad under ASan → heap-buffer-overflow.
- **integer-overflow:** harness 2^63 × 2 → Bad allocates size 0 (silent wrap); Good refuses with `length_error`. Snippet's own `max(), 2` call: both paths terminate with `length_error` (Bad from `vector`'s `max_size` check, Good from the guard) — see notes.
- **no-command-injection:** Bad prints `ls: dir: No such file or directory` + `pwned` (shell re-parse); Good counts directory entries via the library (rc=0 in a non-empty dir).
- **no-format-string:** Bad reads stack values (`value: fffffff0 67c4e8`); Good prints the literal `value: %x %x`.
- **path-traversal:** scratch-root harness: `../secret.txt` and `/etc/passwd` rejected with `invalid_argument`; `ok.txt` opens; unchecked concatenation opens `../secret.txt`.
- **safe-string-functions:** Bad under ASan → stack-buffer-overflow; Good clean.
- **secure-temp-files:** Good rc=0; `tmpfile` produced no visible file in `/tmp` while open and none after close (unnamed/removed, verified on macOS). Bad `tmpnam` → `/var/tmp/tmp.0.QNyaYq` persists after close (removed by the verifier).
- **crypto-random:** Bad `rand()` = 16807 on every run (reproducible); Good `random_device` differs across runs (3 samples).
- **no-hardcoded-secrets:** Good with env set → rc=0; without → `runtime_error`.
- **fd-cloexec:** fork+exec harness: without `O_CLOEXEC`, child `fcntl(3)` = 0 (inherited); with `O_CLOEXEC`, `fcntl(3)` = -1 (closed at exec); `FD_CLOEXEC` bit set on the parent fd.
- **error-message-leakage:** Bad writes `/srv/config/db.ini: permission denied` to stdout (user-visible); Good writes detail to stderr, generic text to stdout.
- **atomic-replace:** Good replaces a pre-existing `state.txt` with the temp contents and leaves no `.tmp`; Bad truncates the target directly.
- **binary-mode:** both write `1a0d0a` byte-for-byte on macOS (text==binary on POSIX; Windows is where translation differs).
- **check-state:** Bad with no file → rc=1 (empty line, no error); Good → `runtime_error`; with the file present both rc=0.
- **flush-check:** both produce the correct file; harness with `sync()` returning -1 sets `badbit` on `flush()` (mechanism confirmed; no `/dev/full` on macOS).
- **istringstream-parse:** see rejection below.
- **no-toctou:** identical rc with and without `config.ini` (race itself not reproducible, sources back the rule).
- **path-type:** `root / "config.ini"` opens the existing scratch file; Bad concatenation also opens it here (type/separator claim is the point).
- **raii-streams:** both write `hello\n`; Good closes via destructor.
- **read-whole-file:** Bad and Good read the same 12 bytes including NUL and `\xff`; missing file → empty in both.
- **sync-with-stdio:** both emit 1000 lines, byte-identical output.

## POSIX scoping assessment (check 4)

`sec-fd-cloexec` (`O_CLOEXEC`) and `io-file-permissions` (`chmod`) use POSIX APIs; both compile and behave correctly on the verified toolchain. The catalog already carries POSIX-scoped rules (the C pack: `c-sec-close-on-exec`, `c-sec-file-mode`, `c-err-eintr-retry`, `c-io-epipe`, etc.), so this scoping is consistent with the pack. **Accepted.** Recommended (non-blocking) future improvement: a platform clause for Windows (`O_CLOEXEC` ↔ `SetHandleInformation(..., HANDLE_FLAG_INHERIT, 0)`; `chmod` ↔ `std::filesystem::permissions`).

## Duplicates / consistency

- No duplicate or near-duplicate summaries within the batch or against the rest of `catalog/rules/cpp/` (pairwise Jaccard < 0.5; semantic review of cross-links: bounds vs string-copy vs size-arithmetic; TOCTOU vs temp files; check-state vs flush; path building vs confinement; error-code overloads vs general error codes — all distinct and correctly cross-linked).
- All `related` IDs and See Also links resolve and agree; `INDEX.md` lists exactly these 12 sec + 12 io files with matching one-line summaries.
- Deterministic validator: the only diagnostics touching this batch are one hard `fm-parse` error on `sec-bounds-checked` (below) and two warning-level `comment-elision` hits on `io-no-toctou` (comment-only `...`, explicitly non-blocking per contract §12).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| cpp-sec-bounds-checked | **rejected** | Invalid YAML frontmatter: unquoted `operator[]` in `symbols: [std::vector, operator[]]` → gray-matter/validator `fm-parse`: "missed comma between flow collection entries at line 13, column 34". Fix: quote `"operator[]"` (as `mem-no-smartptr-subscript` does). Content otherwise verified (Good `at()` throws, rc=1; Bad ASan heap-buffer-overflow). |
| cpp-sec-crypto-random | verified | CWE-338 session/key quote + cppref `random_device` "non-deterministic"; `rand`=16807 each run vs varying `random_device`; both rc=0 |
| cpp-sec-error-message-leakage | verified | CWE-209 pathname/`..`-sequence quotes; Bad leaks to stdout, Good splits stderr/stdout; both rc=0 |
| cpp-sec-fd-cloexec | verified | CWE-403 inheritance/less-privileged-child quotes; fork+exec: child fd open without flag, closed with `O_CLOEXEC`; both rc=0 |
| cpp-sec-integer-overflow | verified | CWE-190 small-value quote; 2^63×2 wraps to 0 without guard, guard refuses; both rc=0 (note: shown `max(),2` wraps large and both throw `length_error`) |
| cpp-sec-no-command-injection | verified | CWE-78 quote; Bad executes `echo pwned` via `system`; Good uses `directory_iterator`; both rc=0 (Good emits benign `-Wunused-variable`) |
| cpp-sec-no-format-string | verified | CWE-134 `printf(string)`/`%x`/`%n` example; Bad reads stack, Good prints literal; documented `-Wformat-security` on Bad |
| cpp-sec-no-hardcoded-secrets | verified | CWE-798 same-for-each-installation quote; Good reads `getenv` (rc=0 with env, throws without); both compile |
| cpp-sec-no-type-punning | verified | CWE-843 incompatible-type + cppref `bit_cast` representation/trivially-copyable/aliasing quotes; both rc=0 |
| cpp-sec-path-traversal | verified | CWE-22 restricted-directory quote + cppref `path`; harness rejects `../secret` and `/etc/passwd`, opens `ok.txt`; both rc=0 |
| cpp-sec-safe-string-functions | verified | CWE-120 exact quote + cppref `basic_string`; Bad ASan stack-buffer-overflow; Good rc=0 |
| cpp-sec-secure-temp-files | verified | CWE-377 tmpnam race + mkstemp 0600 quotes; `tmpfile` invisible while open and removed on close on macOS; documented `tmpnam` deprecation on Bad |
| cpp-io-atomic-replace | verified | cppref `rename` exact "first deleted … without allowing other processes to observe new_p as deleted"; Good swaps content, no `.tmp` left; both rc=0 |
| cpp-io-binary-mode | verified | cppref `openmode` `binary` + `basic_fstream`; both write `1a0d0a` byte-identical; both rc=0 |
| cpp-io-check-state | verified | cppref `basic_ios` `failbit`/`operator bool` + `basic_istream`; Bad rc=1 on missing file, Good throws; both rc=0 when present |
| cpp-io-error-code-overloads | **rejected** | Premise false: cppref `remove` — "If p did not exist, this function returns false and does not report an error"; Bad with missing file → rc=0, catch never entered (no output); Good also silent. Contrast appears only for real errors (non-empty dir: Bad prints `filesystem_error`, Good prints `ec.message()`). Fix: use an operation that throws on absence (e.g. `file_size`) or reword around `remove`'s false return. |
| cpp-io-file-permissions | verified | CWE-276 mitigation quote; modes 644 (Bad) vs 600 (Good) via `stat`; both rc=0 |
| cpp-io-flush-check | verified | cppref `flush` "pubsync() … returns -1, calls setstate(badbit)"; harness confirms badbit on failing sync; both rc=0 with correct file |
| cpp-io-istringstream-parse | **rejected** | Good throws on its own main input: `parse_port("host:8080")` → `>> host` consumes the whole token, `>> colon` hits EOF → `invalid_argument` (rc=134); Bad returns 8080 (rc=144). Harness: `"host:8080"` ok=0, `"host : 8080"` ok=1. Fix: read the colon explicitly (`std::getline(input, host, ':')` then `input >> port`). |
| cpp-io-no-toctou | verified | CWE-367 "not to perform a check before the use" + cppref filesystem race UB quote; rc identical with/without file; both rc=0 (comment-elision warnings only) |
| cpp-io-path-type | verified | cppref `path` native-format/directory-separator quotes; `root / name` opens existing scratch file; both rc=0 |
| cpp-io-raii-streams | verified | cppref `basic_fstream` destructor "closes the file"; both write `hello\n`; Good closes via destructor; both rc=0 |
| cpp-io-read-whole-file | verified | cppref `istreambuf_iterator` successive-characters/end-of-stream quotes; Bad and Good read identical 12 bytes incl. NUL/`\xff`; both rc=0 |
| cpp-io-sync-with-stdio | verified | cppref `sync_with_stdio` unbuffered/independent-buffering/implementation-defined quotes; outputs byte-identical (1000 lines); both rc=0 |

**Counts: verified 21/24, rejected 3.** The 21 passing rules had `status: draft` → `status: verified` flipped; the 3 rejected rules remain `draft`.

## Blockers / follow-ups (outside verifier scope)

- **Fixes for the 3 rejects** (see table): quote `"operator[]"`; fix the istringstream Good to split on the colon; fix or replace the `remove`-based error-code example. Re-verify after edits.
- `catalog/rules/cpp/INDEX.md` header reads "Rules: 139 (verified: 91)" and its batch-status line; the owning agent must update it to 112 verified after these flips.
- Non-blocking notes: surplus second citations that do not support the rule's claim (`sec-fd-cloexec` → CWE-377; `sec-secure-temp-files` → Filesystem; `io-sync-with-stdio` → `clog`); `sec-secure-temp-files`'s `tmpfile` remedy is POSIX-accurate (verified unnamed on macOS) while CWE-377 warns about implementations that truncate pre-created files; `sec-integer-overflow`'s shown `max(), 2` operands wrap to `2^64-2` (not small) and both paths throw `length_error`, though the wrap-to-zero failure mode is real (verified with 2^63×2); `sec-path-traversal` Good requires the root to exist (`canonical` throws otherwise); `io-binary-mode` behavior cannot differ locally on POSIX (text==binary), the claim is Windows-relevant.

---

## Addendum — re-verification of the three rejected rules (2026-10-05)

The three rules rejected above were fixed and re-verified with the same checks (fresh snippet extraction, `clang++ -fsyntax-only -std=c++23 -Wall`, runtime cases, source re-check, validator). This addendum supersedes their `rejected` verdicts in the table above.

- **cpp-sec-bounds-checked** — `"operator[]"` now quoted; gray-matter parses (`symbols = ["std::vector","operator[]"]`); the validator `fm-parse` error is gone; both snippets compile clean; Good rc=1 (`at()` throws `out_of_range`); Bad unchanged (ASan heap-buffer-overflow). **verified.**
- **cpp-io-istringstream-parse** — Good now uses `std::getline(input, host, ':')` then `input >> port`; `parse_port("host:8080")` returns 8080 (rc=144); `"host"`, `"host:"`, `":8080"`, `"host:notanumber"` all throw `invalid_argument`; whitespace variants `"host: 8080"` / `"host : 8080"` parse; Why updated to match; both snippets compile clean. Note (non-blocking): `"host:8080x"` still yields 8080 (trailing bytes unchecked, same as Bad; not a rule claim). **verified.**
- **cpp-io-error-code-overloads** — switched to `std::filesystem::file_size`; absent file: Bad throws and catches (`skip: filesystem error: in file_size: No such file or directory`, rc=0), Good sets `ec` (`skip: No such file or directory`, rc=0); present file: both print `5`; both compile clean. cppreference `file_size` documents "If p does not exist, reports an error" and both overloads, and the cited `rename` page backs the general overload/throw convention. Notes (non-blocking): frontmatter `triggers.symbols`/`keywords` still say `remove` although the body now demonstrates `file_size` — recommend updating to `std::filesystem::file_size`; the `rename` citation is now representative rather than exact (the `file_size` page would be the precise source). **verified.**

Validator re-run (`node dist/rules/cli.js validate --lang cpp --json`): no `fm-parse` error; the only diagnostics touching this batch are the two pre-existing non-blocking `comment-elision` warnings on `io-no-toctou`.

**Final counts after addendum: verified 24/24, rejected 0.** All 24 rules are now `status: verified`. `catalog/rules/cpp/INDEX.md` verified count should be updated 91 → 115 (the follow-up note above said 112 before these three flips).
