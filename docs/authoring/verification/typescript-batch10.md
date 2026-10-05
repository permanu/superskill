# Verification Report - TypeScript Batch 10 (`doc`, `ffi`, `mem`, `net`, `obs`, `ui`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 6 `doc-*.md` + 6 `ffi-*.md` + 7 `mem-*.md` + 7 `net-*.md` + 6 `obs-*.md` + 8 `ui-*.md` (40 files, all entered as `status: draft`)
- Toolchain: Node.js v26.8.1 (`--expose-gc` for GC probes); TypeScript 5.9.3 (`node node_modules/typescript/bin/tsc`); system Google Chrome via `playwright-core` for DOM probes
- Compile command (exact harness): `tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext <file>`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/ts-batch10` (fetched pages, probes, strip/dup/flip scripts)

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; treated every rule as unverified until each check passed.
2. Fetched every cited URL (32 distinct documents for 40 rules; the three RFC 9110 anchors resolve to one document, as do the shared Google guide and TS Handbook pages). All returned HTTP 200; pages stripped to text and grepped for claim-specific passages.
3. Ran the repo validator (`dist/rules/validate.js`, same flags as `src/rules/harness/typescript.ts`) over all 40 files before and after the flips: 0 errors, 0 warnings, 80/80 snippets compile.
4. Probed runtime-observable decisions: 36 Node assertions (hand-assembled WASM modules; WeakMap/WeakSet/WeakRef/FinalizationRegistry under `--expose-gc`; typed-array views; object URLs; a local WebSocket server with a close handshake; fetch header defaults; Retry-After parsing; structured logging; `performance.mark`/`measure`) and 18 Chrome assertions (dataset, form `elements.namedItem`, checked property vs attribute, CustomEvent, classList, passive listener, document fragment, scoped query, WASM error classes, fetch defaults, marks/measure). 54/54 assertions pass; the two probes that first failed were harness bugs (missing close-frame echo in the WS test server, finalizer scope), fixed and re-run.
5. Mechanical checks: See Also link resolution, `related` id resolution (validator), INDEX.md coverage, version-number scan, hedging/anti-slop scan (validator warnings), summary word counts, duplicate-title check, token-Jaccard near-duplicate scan within the batch and against the whole 259-rule TypeScript pack.
6. Flipped `status: draft` -> `status: verified` for 35 rules; left 5 `draft` (see Rejects). Re-validated the batch after the flips (0 issues, 80/80 compile) and the full pack (259 rules, 0 errors/warnings). No other edits; `INDEX.md` untouched.

## Source evidence (claim-specific)

- `doc-jsdoc-public`: Google TS guide - "Document all top-level exports of modules"; "Use /** JSDoc */ comments to communicate information to the users of your code"; "JSDoc comments are understood by tools (such as editors and documentation generators)".
- `doc-jsdoc-tags`: TS Handbook - "@param and @returns" section; `@param` "uses the same type syntax as @type, but adds a parameter name".
- `doc-fileoverview`: Google TS guide - "A file may have a top-level @fileoverview JSDoc. If present, it may provide a description of the file's content, its uses, or information about its dependencies" (severity `prefer` matches "may").
- `doc-comment-internal`: Google TS guide - "Use /** JSDoc */ comments for documentation, i.e. comments a user of the code will need to know. Use // line comments for implementation comments".
- `doc-see-link`: TS Handbook - "@see lets you link to other names in your program"; "Some editors will turn Box into a link to make it easy to jump there and back"; "@link is like @see, except that it can be used inside other tags".
- `ffi-wasm-memory-bounds`: MDN Memory - "resizable ArrayBuffer or SharedArrayBuffer that holds raw bytes of memory accessed by a WebAssembly.Instance"; grow "Detaches the previous buffer". Probe: OOB `Int32Array(memory.buffer)[1048576]` -> `undefined` (typed as `number`), checked read throws.
- `ffi-wasm-buffer-grow`: MDN grow - "Every call to grow will detach any references to the old buffer, even for grow(0)!"; "Accessing the buffer property after calling grow, will yield an ArrayBuffer with the correct length." Probes: view byteLength 0 after `grow(0)`, fresh view full length.
- `ffi-wasm-trap`: MDN RuntimeError - "the error type that is thrown whenever WebAssembly specifies a trap". Probe: exported `unreachable` -> `RuntimeError: unreachable`.
- `ffi-napi-status`: Node-API - "All Node-API calls return a status code of type napi_status"; "The API's return value is passed via an out parameter"; canonical `if (status != napi_ok)` example.
- `mem-weak-cache`: MDN WeakMap - "does not create strong references to its keys"; "Once an object used as a key has been collected, its corresponding values ... become candidates for garbage collection". Probe: key collected under WeakMap, retained under Map.
- `mem-weakset-membership`: MDN WeakSet - "references to objects in a WeakSet are held weakly. If no other references ... those values can be garbage collected". Probe: member collected after gc.
- `mem-weakref-deref`: MDN WeakRef - "Returns the WeakRef object's target object, or undefined if the target object has been reclaimed"; "If your code ... depends on GC cleaning up a WeakRef ... it's likely to be disappointed". Probe: identity while held.
- `mem-bounded-cache`: MDN Map - "remembers the original insertion order"; `keys()` iterator "in insertion order". Probe: LIMIT=3 evicts oldest, size fixed.
- `mem-typed-array-view`: MDN subarray - "returns a new typed array on the same ArrayBuffer store and with the same element types". Probe: subarray write visible in parent, slice write not.
- `mem-object-url-revoke`: MDN revokeObjectURL - releases an object URL and tells the browser "not to keep the reference to the file any longer"; idempotent when already revoked. Probe: fetch succeeds before revoke, rejects after; second revoke no-op.
- `mem-finalization-fallback`: MDN FinalizationRegistry - "Cleanup callbacks should not be used for essential program logic"; callback "at some point when a value registered with the registry has been reclaimed". Probe: finalizer fired only after target dropped and gc'd.
- `net-content-type`: RFC 9110 §8.3 - "indicates the media type of the associated representation ... defines both the data format and how that data is intended to be processed"; "A sender ... SHOULD generate a Content-Type"; absent -> recipient "MAY either assume ... application/octet-stream ... or examine the data to determine its type". Probes: explicit header wins; an undeclared string body is auto-labelled `text/plain;charset=UTF-8`.
- `net-accept-json`: RFC 9110 §12.5.1 - Accept "can be used by user agents to specify their preferences regarding response media types"; `Accept = #( media-range [ weight ] )`.
- `net-conditional-get`: RFC 9110 §13.1.2 - If-None-Match "primarily used in conditional GET requests to enable efficient updates of cached information with a minimum amount of transaction overhead"; servers "send a 304 (Not Modified) response".
- `net-conditional-update`: RFC 9110 §13.1.1 - If-Match "most often used with state-changing methods ... to prevent the 'lost update' problem"; strong comparison required. Distinct from If-None-Match (read-side revalidation) and Retry-After (server backoff hint).
- `net-form-body`: MDN URLSearchParams - "percent-encode anything in the application/x-www-form-urlencoded percent-encode set"; MDN Using Fetch - URLSearchParams body example. Probes: `URLSearchParams` body sets `application/x-www-form-urlencoded;charset=UTF-8` (Node + Chrome); `q=a+b%26c%3Dd`.
- `net-websocket-close`: MDN WebSocket.close - "closes the WebSocket connection or connection attempt"; return value undefined. Probe against a local server: returned `close()` -> clean close code 1000.
- `obs-structured-log`: OWASP Logging - event data enumerated as named attributes (When/Where/Who/What, "Interaction identifier", "Application identifier", "Result status", ...); "Use a standard event format supported by the receiving system". Probe: JSON record fields addressable.
- `obs-no-pii`: OWASP Logging "Data to exclude" - "The following should usually not be recorded directly in the logs ... Authentication passwords ... Sensitive personal data and some forms of personally identifiable information (PII)"; non-sensitive personal data (names) is in the "sometimes ... special manner" bucket, and "User identity ... username" is a recommended Who attribute. Probe: dropping the password field removes the credential.
- `obs-no-console-in-lib`: ESLint `no-console` - "Disallow the use of console"; "considered a best practice to avoid using methods on console. Such messages are considered to be for debugging purposes and therefore not suitable to ship"; `enforce: tool` + `tool: eslint:no-console`.
- `obs-log-error-object`: MDN Error - `Error.prototype.stack` "A non-standard property for a stack trace"; MDN Error: cause - "indicates the specific original cause of the error ... used when catching and re-throwing an error ... in order to still have access to the original error". Probe: object identity preserved at the sink; message-only call loses it.
- `obs-measure-duration`: MDN Performance.mark - "creates a named PerformanceMark object representing a high resolution timestamp marker in the browser's performance timeline"; `startTime` defaults to `performance.now()`. Probes (Node + Chrome): mark/measure yields the elapsed duration.
- `obs-interaction-id`: OWASP Logging - "Interaction identifier" is a When attribute; Note A: "a method of linking all (relevant) events for a single user interaction ... this should be recorded instead of losing the information and forcing subsequent correlation techniques to re-construct the separate events".
- `ui-dataset`: MDN dataset - "exposes a map of strings (DOMStringMap) with an entry for each data-* attribute"; dash-style/camelCase conversion. Probe: `dataset.userId` mirrors `data-user-id`; absent key `undefined` vs `getAttribute` `null`.
- `ui-form-narrow`: MDN HTMLFormElement.elements - "returns an HTMLFormControlsCollection listing all the listed form controls"; access "by using either an index or the element's name or id attributes"; member types include button/input/select/textarea/custom elements. Probes (Chrome): `namedItem` returns the input (instanceof narrows), duplicate names yield `RadioNodeList`, absent name yields `null`.
- `ui-custom-event`: MDN CustomEvent - `CustomEvent.detail` "Returns any data passed when initializing the event"; TS `CustomEvent<T>` type argument compile-checked (Bad detail `any`, Good `SavedDetail`).
- `ui-classlist`: MDN classList - "live DOMTokenList collection representing the class attribute"; "convenient alternative to accessing an element's list of classes as a space-delimited string via element.className". Probe: `add` idempotent and preserves unrelated classes; string concat duplicates `active active`.
- `ui-live-properties`: MDN HTMLInputElement.checked - "specifies the current checkedness"; "The presence of the HTML checked attribute indicates the checkbox is checked by default. It does not indicate whether this checkbox is currently checked"; attribute reflected by `defaultChecked`. Probe: property false while attribute still present after unchecking.
- `ui-document-fragment`: MDN createDocumentFragment - "DocumentFragments are DOM Node objects which are never part of the main DOM tree"; "append elements to the document fragment and then append the document fragment to the DOM tree"; "using document fragments could result in better performance in some older engines". Probe: fragment emptied into the list in order, never in the tree.
- `ui-scoped-query`: MDN Document.querySelector - "returns the first Element within the document that matches the specified selectors"; depth-first pre-order from the start of the markup. Probe (Chrome): document-wide query picked a foreign button prepended to body while `root.querySelector` stayed inside the component subtree.

## Notes on flagged items (non-blocking)

- `obs-no-pii`: the Good keeps `user.name`. OWASP puts non-sensitive personal data (personal names) in the "sometimes ... special manner" bucket rather than the absolute exclusion list, and recommends logging user identity; the demonstrated change (removing the password) is correct. If the summary's "never ... personal data" is meant literally, a future edit should log an opaque id instead.
- `obs-measure-duration`: the cited `mark` page documents marks and only links `performance.measure()` in See also; measure semantics (duration between marks) are on the linked page and probe-confirmed in Node and Chrome.
- `ui-form-narrow`: `namedItem`'s `Element | RadioNodeList | null` union and `RadioNodeList` are not printed on the cited `elements` page; they are the TS lib types and probe-confirmed in Chrome.
- `ui-document-fragment`: the Why's "each touch can trigger layout work" is stronger than MDN's hedged "could result in better performance in some older engines"; the pattern is the page's own example.
- `net-content-type`: fetch auto-labels an undeclared string body `text/plain;charset=UTF-8` (probe), so the Bad sends JSON mislabelled rather than with no type; the decision (declare the actual media type) and the RFC rationale still hold.
- `net-form-body`: the Using Fetch example sets the form content type explicitly; the fetch default (`application/x-www-form-urlencoded;charset=UTF-8`) is probe-confirmed in Node and Chrome.
- `doc-see-link`: the "rename tooling follows it" flourish is not on the cited page (editors make links navigable); core claim is sourced.
- `mem-typed-array-view`: "doubles memory for a temporary window" is loose (adds a window-sized copy); the copy-vs-view decision is exact and probe-confirmed.
- `ffi-napi-status`: "leaves its out-parameter unwritten" is the standard consequence but not spelled out on the Node-API page; the "check `napi_status` before use" decision is directly supported.
- `obs-structured-log`: the word "structured" is not on the OWASP page; the guidance enumerates event data as named attributes and recommends "a standard event format", which is the shape the rule describes.
- `obs-no-console-in-lib`: the ESLint rationale is about shipping console output generally, not libraries specifically; the tool id backs the mechanical ban.
- `ffi-wasm-memory-bounds`: OOB typed-array reads return `undefined` rather than throwing, which is the "silent wrong value" the rule describes; NaN/fractional offsets pass the Good's check but that edge is outside the rule's claim.

## Rejects (left `status: draft`)

- **`doc-example` (rejected).** The sole cited source, the TS Handbook "JSDoc Reference" page, does not document `@example`. Fetched page TOC: @type, @import, @param/@returns, @typedef, @callback, @template, @satisfies, @public/@private/@protected, @override, @extends, @implements, @class, @this, Documentation (@deprecated, @see, @link), Other (@enum, @author), Other supported patterns, Unsupported patterns, Unsupported tags. The only two `@example` occurrences are inside `i.am.awesome@example.com` in the `@author` example and the note "Otherwise, @example will be parsed as a new tag." (a parser warning, not usage documentation). Per CONTRACT section 5, a primary source must back the claim. Fix: cite `https://jsdoc.app/tags-example.html` (or TSDoc `@example`), then re-verify.
- **`ffi-wasm-imports-object` (rejected).** Summary: "or instantiation fails with LinkError"; Why: "an empty or partial object throws a `WebAssembly.LinkError`"; the Bad passes `{}`. The WebAssembly JS API spec (Instantiating) says "If o is not an Object, throw a TypeError exception" for the missing module namespace, and only "If IsCallable(v) is false, throw a LinkError exception" once the namespace exists. Probes: Node v26.8.1 -> `{}` = `TypeError: WebAssembly.instantiate(): Import #0 "env": module is not an object or function`, `{env:{}}` = `LinkError`; Chrome (same V8) -> identical. MDN's "or else a WebAssembly.LinkError is thrown" is the simplification the rule repeats; the demonstrated input throws TypeError. Fix: use `{ env: {} }` in the Bad (namespace present, declared function missing -> LinkError) or reword the failure clause, then re-verify.
- **`ffi-wasm-instantiate-error` (rejected).** Why: "the rejection alone does not say which step the caller should fix. Wrapping the call names the phase and keeps the original error as the cause." The cited MDN page says the promise "rejects with a WebAssembly.CompileError, WebAssembly.LinkError, or WebAssembly.RuntimeError, depending on the cause of the failure" - the rejection class already distinguishes compile from link (probes: invalid bytes -> CompileError; missing function -> LinkError). The Good's message is phase-agnostic ("failed to instantiate module") and the phase survives only via `cause`, so the Good does not implement the title/summary ("report which phase"). Fix: branch on `error instanceof WebAssembly.CompileError` / `WebAssembly.LinkError` to name the phase, or reword the summary/Why to "preserve the phase via cause", then re-verify.
- **`net-retry-after` (rejected).** RFC 9110 section 10.2.3: "The Retry-After field value can be either an HTTP-date or a number of seconds to delay after receiving the response." The Good computes `Number(response.headers.get("retry-after") ?? "1")`; for an HTTP-date this is `NaN` (probe, Node and Chrome), and Node warns `TimeoutNaNWarning: NaN is not a number. Timeout duration was set to 1` - measured retry after 2 ms. The Good therefore retries immediately on a legal header value, contradicting the summary ("wait the duration the server asks for") and the Why ("retries too early"), and is strictly worse than the Bad's fixed 1 s for that input. Fix: parse both forms (e.g. `Number.isNaN(Number(value)) ? Date.parse(value) - Date.now() : Number(value) * 1000`, clamped) or state seconds-only in the summary, then re-verify.
- **`ui-passive-listener` (rejected).** The Bad/Good pair registers a `scroll` listener, and the Why claims "A non-passive listener forces the browser to wait for the handler before it can start scrolling, which shows up as jank." The cited MDN page says the opposite for this event: "You don't need to worry about the value of passive for the basic scroll event. Since it can't be canceled, event listeners can't block page rendering anyway." The passive benefit is real for `wheel`, `mousewheel`, `touchstart`, `touchmove` (the events MDN enumerates), not for `scroll`; the demonstrated pair is behaviorally identical for the event shown. Fix: demonstrate with `wheel` or `touchstart`/`touchmove` (or drop `scroll` from the summary), then re-verify.

## Compile results

- 80/80 snippets pass the exact harness command (40 rules x Bad/Good), TypeScript 5.9.3, zero diagnostics (repo validator; all `bad:ok good:ok`).
- Post-flip re-validation of the 40 files: 0 errors, 0 warnings, 80/80 compile. Full-pack check (259 rules, no compile): 0 errors, 0 warnings.

## Behavior probe results (bounded)

- Node v26.8.1, 36/36 assertions: OOB typed-array read `undefined`; `grow(0)`/`grow(1)` detach views; trap -> `RuntimeError`; invalid bytes -> `CompileError`; `{}` -> `TypeError` vs `{env:{}}` -> `LinkError`; WeakMap key collected / Map key retained; WeakSet member collected; WeakRef identity; FinalizationRegistry fires only after collection; FIFO cache eviction; subarray shares / slice copies; object URL fetch before/after revoke; string body `text/plain;charset=UTF-8`; URLSearchParams body `application/x-www-form-urlencoded;charset=UTF-8`; Retry-After date -> NaN -> 2 ms retry; WebSocket close code 1000; JSON record fields; Error object identity; mark/measure duration.
- Chrome (system, via playwright-core), 18/18 assertions: dataset mapping and `undefined` vs `null`; `namedItem` -> input / RadioNodeList / null; checked property vs attribute divergence; CustomEvent detail; classList idempotence vs string concat duplication; passive `preventDefault` ignored / non-passive cancels; fragment emptied on insert; document-wide vs scoped query; `{}` -> TypeError, `{env:{}}` -> LinkError; fetch content-type defaults; Retry-After date NaN; measure duration entry.

## Verdicts

| rule id | verdict | evidence | notes |
|---|---|---|---|
| typescript-doc-jsdoc-public | verified | Google "Document all top-level exports of modules" + tools wording | - |
| typescript-doc-jsdoc-tags | verified | Handbook "@param and @returns" section | - |
| typescript-doc-fileoverview | verified | Google "A file may have a top-level @fileoverview JSDoc" | `prefer` matches "may" |
| typescript-doc-comment-internal | verified | Google "JSDoc versus comments" wording | - |
| typescript-doc-see-link | verified | Handbook @see/@link + "editors will turn Box into a link" | rename-tooling flourish unsourced (note) |
| typescript-doc-example | **rejected** | Cited Handbook page has no @example section; only the @author email parse warning | cite jsdoc.app/tags-example; left draft |
| typescript-ffi-wasm-memory-bounds | verified | MDN resizable-buffer wording; OOB -> undefined probe | NaN/fractional offset edge (note) |
| typescript-ffi-wasm-buffer-grow | verified | MDN "Every call to grow will detach ... even for grow(0)!"; probes | - |
| typescript-ffi-wasm-trap | verified | MDN "thrown whenever WebAssembly specifies a trap"; RuntimeError probe | - |
| typescript-ffi-wasm-instantiate-error | **rejected** | MDN: rejection type distinguishes CompileError/LinkError; Good message is phase-agnostic | Why false + Good doesn't name phase; left draft |
| typescript-ffi-wasm-imports-object | **rejected** | Spec + Node + Chrome: `{}` -> TypeError, not LinkError | fix Bad to `{env:{}}` or reword; left draft |
| typescript-ffi-napi-status | verified | Node-API "All Node-API calls return ... napi_status" + `if (status != napi_ok)` | out-parameter wording implicit (note) |
| typescript-mem-weak-cache | verified | MDN WeakMap weak-key wording; WeakMap-vs-Map gc probe | - |
| typescript-mem-weakset-membership | verified | MDN "references ... held weakly"; gc probe | - |
| typescript-mem-weakref-deref | verified | MDN "or undefined if the target object has been reclaimed" | - |
| typescript-mem-bounded-cache | verified | MDN insertion-order wording; eviction probe | - |
| typescript-mem-typed-array-view | verified | MDN "same ArrayBuffer store"; share-vs-copy probes | "doubles memory" loose (note) |
| typescript-mem-object-url-revoke | verified | MDN "not to keep the reference to the file any longer"; revoke probe | - |
| typescript-mem-finalization-fallback | verified | MDN "should not be used for essential program logic"; finalizer probe | - |
| typescript-net-retry-after | **rejected** | RFC allows HTTP-date; `Number(date)` -> NaN -> 2 ms retry | Good worse than Bad on a legal input; left draft |
| typescript-net-content-type | verified | RFC 8.3 media-type/data-format wording; explicit-header probe | fetch auto-labels string bodies text/plain (note) |
| typescript-net-accept-json | verified | RFC 12.5.1 preference wording | - |
| typescript-net-conditional-get | verified | RFC 13.1.2 304/cache-update wording | distinct from If-Match and Retry-After |
| typescript-net-conditional-update | verified | RFC 13.1.1 "prevent the lost update problem" | distinct read-side vs write-side |
| typescript-net-form-body | verified | MDN percent-encode set + URLSearchParams body; content-type probes | fetch default probe-confirmed (note) |
| typescript-net-websocket-close | verified | MDN "closes the WebSocket connection or connection attempt"; close probe | - |
| typescript-obs-structured-log | verified | OWASP named event attributes + "standard event format"; JSON probe | word "structured" absent (note) |
| typescript-obs-no-pii | verified | OWASP "Data to exclude" passwords/sensitive PII; credential-removal probe | Good keeps `user.name` (note) |
| typescript-obs-no-console-in-lib | verified | ESLint no-console "not suitable to ship"; `enforce: tool` | library-specific rationale standard (note) |
| typescript-obs-log-error-object | verified | MDN Error.stack + Error.cause wording; identity probe | stack is non-standard per MDN (note) |
| typescript-obs-measure-duration | verified | MDN mark high-res timestamp wording; mark/measure probes | measure only linked from cited page (note) |
| typescript-obs-interaction-id | verified | OWASP "Interaction identifier" + Note A correlation wording | - |
| typescript-ui-dataset | verified | MDN DOMStringMap/camelCase wording; dataset probes | - |
| typescript-ui-form-narrow | verified | MDN elements collection wording; namedItem/RadioNodeList probes | union not printed on cited page (note) |
| typescript-ui-custom-event | verified | MDN CustomEvent.detail wording; typed-detail probe/compile | - |
| typescript-ui-classlist | verified | MDN "convenient alternative ... space-delimited string"; probes | - |
| typescript-ui-passive-listener | **rejected** | MDN: passive irrelevant for scroll ("You don't need to worry"); pair is a no-op on scroll | demonstrate wheel/touch; left draft |
| typescript-ui-live-properties | verified | MDN checked-property-vs-attribute wording; divergence probe | - |
| typescript-ui-document-fragment | verified | MDN "never part of the main DOM tree" + performance note; fragment probe | MDN hedges "older engines" (note) |
| typescript-ui-scoped-query | verified | MDN "first Element within the document"; scoped-vs-document probe | - |

## Other checks

- No version numbers in any of the 40 files; `baseline: latest` on all; no `compile_exempt`; no TODO/FIXME/XXX/TBD; no hedging warnings; all summaries <= 30 words; exactly one `## Bad` and one `## Good` with a `typescript` fence each; section order Why/Bad/Good/See Also.
- All `related` ids resolve (validator, 259-rule catalog); all See Also links resolve to files in the pack; INDEX.md lists every one of the 40 filenames.
- Duplicate scan (title+summary and full-body token Jaccard, batch vs all 259 TypeScript rules): highest in-batch pair `net-conditional-get` vs `net-conditional-update` at 0.39, then `net-accept-json` vs `net-content-type` at 0.35 - both distinct decisions and cross-linked; below the 0.45 near-duplicate threshold used in prior batch reports. No duplicate titles or summaries.
- Only the 35 verified batch files (`status` flips) and this report were edited; the 5 rejected files and `INDEX.md` were not touched.

## Counts (first pass)

- Verified: 35/40 (flipped `status: draft` -> `status: verified`)
- Rejected: 5/40 (left `status: draft`: `doc-example`, `ffi-wasm-instantiate-error`, `ffi-wasm-imports-object`, `net-retry-after`, `ui-passive-listener`)

---

# Addendum - Re-verification of the five fixes (2026-10-05)

All five rejected rules were fixed by the author and re-checked from the current files (same verifier, same toolchain). Each fix passed; all five were flipped `status: draft` -> `status: verified`. The batch is now 40/40 verified.

- **`doc-example` - verified.** Source replaced with [JSDoc - @example](https://jsdoc.app/tags-example) (fetched, HTTP 200): "Provide an example of how to use a documented item. The text that follows this tag will be displayed"; "Note that a doclet may have multiple examples"; "Examples can also be captioned using `<caption></caption>` after the @example tag." The `sources.md` primary entry (#20) was added. Snippets unchanged; both compile clean.
- **`ffi-wasm-instantiate-error` - verified.** The Why now states that the rejection type already distinguishes the phases (`CompileError` for bytes, `LinkError` for imports) - accurate per MDN and probes - and the Good branches on the two types, throwing phase-named messages with the original error as `cause`. Probes of the exact Good logic: invalid bytes -> `failed to compile module bytes` (cause `CompileError`); partial import object -> `failed to link module imports` (cause `LinkError`); module with imports and no import object -> `TypeError` rethrown unchanged. Non-blocking note: the `LinkError` branch is only reachable when `instantiate` receives an import object, so the demo's no-argument call cannot exercise it (modules with imports reject with `TypeError` when the argument is omitted); an import-object parameter would let the link branch be shown firing.
- **`ffi-wasm-imports-object` - verified.** The Bad is now `{ env: {} }` (namespace present, declared function missing). Probe: `LinkError: WebAssembly.instantiate(): Import #0 "env" "log": function import requires a callable`; the Good's full object instantiates. The Why is reworded to exactly that case, matching the spec (namespace present -> `IsCallable` check -> `LinkError`).
- **`net-retry-after` - verified.** The Why now covers both RFC 9110 forms (seconds or HTTP-date). Probe of the exact `retryDelay`: `null` -> 1000 ms; `"120"` -> 120000 ms; `"0"` -> 0; past HTTP-date -> 0 (clamped); future HTTP-date -> ms until the date (~4770 ms for a +5 s date); unparseable -> 1000 ms. The NaN-to-immediate-retry path found in the first pass is gone.
- **`ui-passive-listener` - verified.** Bad/Good now use `wheel`. Chrome probe: passive `preventDefault` is ignored (dispatch not canceled), non-passive cancels. Title ("Mark scroll-driving listeners passive"), summary, keywords (`wheel`), and the INDEX.md line are consistent with the body and with the cited MDN list (`wheel`, `mousewheel`, `touchstart`, `touchmove`).

Re-check results: the five files compile 10/10 snippets with 0 errors / 0 warnings; post-flip batch re-validation: 40 files, 80/80 compile, 0 errors / 0 warnings; full-pack check: 259 rules, 0 errors / 0 warnings. Only the five status flips and this addendum were added on top of the first-pass report.

## Final counts

- Verified: 40/40 (all batch-10 rules now `status: verified`)
- Rejected: 0/40
