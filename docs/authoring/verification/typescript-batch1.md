# Verification Report - TypeScript `err` Batch 1

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/typescript/err-*.md` (15 rules; all entered as `status: draft`)
- Toolchain: Node.js v26.8.1, repo-local `tsc` 5.9.3, macOS
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-ts-err` (extracted snippets, emitted JS, probes, fetch cache)

## Method

- Fetched every cited URL (16 unique across the batch; plus the Google TypeScript Style Guide and TypeScript Modules reference from `sources.md`, which no `err` rule cites) and captured the supporting passages.
- Extracted both snippets from each rule (30 files) and compiled each independently with the exact baseline command `node node_modules/typescript/bin/tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext <file>` from a scratch dir; no `@types/node`.
- Ran behavioral probes for runtime claims: 4 child-process probes (floating rejection termination, handled rejection, `process.exit` truncation, `process.exitCode` drain) and in-process probes for the rest. Additionally emitted JS for the 6 fully-runnable Good snippets (`catch-unknown`, `finally-cleanup`, `throw-error-only`, `result-union`, `domain-error-class`, `boundary-parse`) and executed the compiled output with small drivers. `err-result-union` is type-level and was compile-checked only.
- Verified tool ids against official docs and tested the `useUnknownInCatchVariables` flag's actual compiler behavior.
- Cross-checked: frontmatter validity, id/path match, `related` and `## See Also` resolution, body section order, fence counts and tags, snippet line counts, summary word counts, version-token/hedge/elision scans, duplicate review within and across the TypeScript pack, and INDEX/directory consistency.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| typescript-err-abort-cancellation | verified | Sources: MDN AbortSignal "signal object that allows you to communicate with an asynchronous operation ... and abort it"; MDN Using promises Cancellation section "Promise itself has no first-class protocol for cancellation, but you may be able to directly cancel the underlying asynchronous operation, typically using AbortController". Compile OK. Run: aborted `loadReport` returned `undefined` with `signal.aborted === true` and the abort reason preserved; a non-abort failure propagated. |
| typescript-err-aggregate-errors | verified | Sources: MDN Promise.all "rejects when any of the input's promises rejects, with this first rejection reason ... Subsequent rejections after the first rejection will be ignored"; MDN AggregateError "represents an error when several errors need to be wrapped in a single error", subclass of `Error`, with `errors`. Compile OK. Run: `allSettled` reported all four statuses; the `AggregateError` carried the failing reason, `instanceof Error`; `Promise.all` rejected with the first failure only. |
| typescript-err-async-propagate | verified | Sources: typescript-eslint no-floating-promises "created without any code set up to handle any errors it might throw ... ignored Promise rejections"; Node Process `'unhandledRejection'` "emitted whenever a Promise is rejected and no error handler is attached ... within a turn of the event loop" plus default `--unhandled-rejections` throw mode feeding `'uncaughtException'` (default exit code 1). Compile OK. Run: floating rejection printed the error and exited 1 with no continuation; awaited version caught and exited 0. Minor note: `return await` outside try/catch is flagged by typescript-eslint's `return-await` (strict preset, `in-try-catch`); the cited tool accepts it. |
| typescript-err-boundary-parse | verified | Source: Handbook Narrowing (`typeof` type guards, `in` operator narrowing). Compile OK. Run (compiled output): valid email parsed; `null`, `42`, non-string email, and no-`@` email rejected with the guard messages. Note: the `as`-erasure sentence is standard TS semantics, not verbatim on the cited page. |
| typescript-err-catch-unknown | verified | Sources: TSConfig useUnknownInCatchVariables "changing the type of the variable in a catch clause from any to unknown ... you cannot guarantee that the object being thrown is a Error subclass ahead of time"; typescript-eslint use-unknown-in-catch-callback-variable exists. Compile OK. Flag probe: under `--strict` `e.message` fails with TS18046; `--useUnknownInCatchVariables false` passes; explicit `catch (e: any)` bypasses the flag (the review half of `enforce: both` covers it). Run: thrown string had no `.message`; narrowing restored extraction. |
| typescript-err-domain-error-class | verified | Sources: MDN Error custom error types "derive from Error ... use instanceof MyError to check the kind of error in the exception handler"; Node `error.code` "most stable way to identify an error". Compile OK. Run (compiled output): `instanceof`, stable `name`, and typed payload (`balance`, `amount`) all present. |
| typescript-err-error-code | verified | Sources: Node Errors "error.code is the most stable way to identify an error. It will only change between major versions ... error.message strings may change between any versions"; MDN Error differentiate-between-similar-errors. Compile OK. Run: code match stayed stable when the message was reworded; message match broke. |
| typescript-err-finally-cleanup | verified | Source: MDN try...catch "The code in the finally block will always be executed before control flow exits the entire construct". Compile OK. Run (compiled output + probe): `close` ran on success and throw paths; the Bad early return skipped it (closes: 0). |
| typescript-err-log-once | verified | Sources: Node Errors "Error propagation and interception ... must be handled or the Node.js process will exit immediately"; typescript-eslint only-throw-error note "While it makes sense to rethrow errors in some cases, it is likely more common that one would want to create a new Error and set its cause appropriately". Author-flagged as derived: the duplicate-log rationale is a consequence of the propagation model plus the rethrow note, not a verbatim statement; it stays within those sources. Compile OK. Run: log-and-rethrow produced 2 logs; single handler produced 1. |
| typescript-err-no-process-exit | verified | Source: Node Process `process.exit` "force the process to exit as quickly as possible even if there are still asynchronous operations pending ... including I/O operations to process.stdout and process.stderr ... data printed to stdout being truncated and lost"; `process.exitCode` "the process exit code, when the process either exits gracefully". Compile OK. Run: `process.exit(0)` skipped a queued callback (no output); `process.exitCode = 1` let it run and exited 1. |
| typescript-err-no-swallow | verified | Sources: ESLint no-empty "disallows empty block statements ... ignores block statements which contain a comment (for example, in an empty catch ...)"; MDN try...catch. Compile OK. Run: empty catch returned `"ok"` with the failure invisible; Good handled `QuotaExceededError` and propagated a non-quota error. Note: no-empty by design permits comment-only catches; the review half of `enforce: both` carries those. |
| typescript-err-result-union | verified | Sources: Handbook Narrowing "Discriminated unions"; Everyday Types union narrowing. Compile OK. Compiled-only (type-level): discriminated access requires narrowing; compiled-output run shows `ok:true`/`ok:false` shapes and `readAge` narrowing. |
| typescript-err-retry-idempotent | verified | Sources: RFC 9110 §9.2.2 "Idempotent Methods" incl. "A client SHOULD NOT automatically retry a request with a non-idempotent method ..."; §10.2.3 Retry-After "how long the user agent ought to wait before making a follow-up request". Compile OK. Run: Good attempted exactly 3 times with delays 200,400 then rethrew (succeeded on attempt 3 when transient); Bad made 500 immediate attempts in a tight loop with no delay. Note: the bounded-attempt component is practice-derived (RFC covers idempotency + delay); same posture as the verified Python `err-retry-idempotent`. |
| typescript-err-throw-error-only | verified | Sources: typescript-eslint only-throw-error exists with matching scope; MDN Error (`stack`, `name`, `instanceof`). Compile OK. Run (compiled output): a thrown string has no stack/name and is not `instanceof Error`; `Error` has both. |
| typescript-err-wrap-with-cause | verified | Sources: MDN Error: cause "indicates the specific original cause of the error. It is used when catching and re-throwing ... in order to still have access to the original error"; Node Errors "If the cause option is provided, it is assigned to the error.cause property". Compile OK. Run (compiled output): `cause === original`; stringifying lost it (`cause` undefined). |

## Cross-cutting checks

- Compile: 30/30 snippets pass the exact baseline command; longest snippet 19 lines (target ≤ 25).
- Sources: all 16 cited URLs fetched 200 and support their claims (two derived passages noted above); `sources.md`'s Google TS Style Guide and TypeScript Modules reference also resolve but are cited by no `err` rule.
- Tool ids (official docs): typescript-eslint `only-throw-error`, `no-floating-promises`, `use-unknown-in-catch-callback-variable`, and ESLint `no-empty` all exist and match their rules' scope. `tsc:useUnknownInCatchVariables` follows the contract's `<tool>:<id>` form and maps to a real, effective compiler flag (strict enables it; disabling changes behavior).
- Formatting: all 15 follow the contract body order; exactly one `## Bad` and one `## Good` fence each with the `typescript` tag; summaries ≤ 30 words; Why 2-5 sentences; `baseline: latest`; no version tokens, TODOs, elisions, Unicode ellipses, or hedge words; `triggers.keywords` 2-8; INDEX list matches the directory exactly (15 entries).
- Links/ids: all ids match paths; all `related` ids resolve; all `## See Also` links resolve and use the `[<id>](<file>.md)` form used by the verified packs.
- Duplicates: no duplicates within the batch; nearest pairs state distinct decisions and cross-reference each other (`async-propagate`/`no-swallow`, `wrap-with-cause`/`log-once`, `error-code`/`domain-error-class`, `result-union`/`boundary-parse`, `retry-idempotent`/`abort-cancellation`). Cross-batch TypeScript neighbors (`async-no-void-silence`, `async-return-await`, `async-abort-early-check`, `type-unsafe-cast`, `type-discriminated-union-state`) are distinct.
- Repo validator: `node dist/rules/cli.js validate --lang typescript --json` reports 0 errors / 0 warnings across 45 rules after the flips.

## Notes / follow-ups (outside verifier ownership)

- `INDEX.md` still says `Rules: 15 (verified: 0)` and `categories.md` still lists batch 1 as all draft; both are stale after these flips and should be updated by their owners.
- `err-log-once`: duplicate-log rationale derived from Node's propagation model + the typescript-eslint rethrow note (author-flagged); stays within the sources.
- `err-retry-idempotent`: bounded attempt count is practice-derived; the RFC backs idempotency and the Retry-After delay.
- `err-boundary-parse`: the `as`-erasure sentence is standard TypeScript semantics, not verbatim on the cited Narrowing page.
- `err-catch-unknown`: the compiler flag covers unannotated catch variables; explicit `catch (e: any)` bypasses it, so the review half of `enforce: both` carries that case.
- `err-async-propagate`: Good uses `return await` outside try/catch; typescript-eslint's `return-await` (strict preset, `in-try-catch`) would prefer plain `return` there. The cited tool (`no-floating-promises`) accepts the snippet.

## Counts

- Verified: 15/15
- Rejected: 0
- Blockers: none
