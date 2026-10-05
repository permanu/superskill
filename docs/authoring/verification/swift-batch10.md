# Verification Report - Swift `io` + `net` Batch 10

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/swift/io-*.md` (8) + `net-*.md` (8); all entered as `status: draft`; **16/16 flipped to `verified`**
- Toolchain: Apple Swift 6.4 (swiftlang-6.4.0.34.1, clang-2100.3.34.1), arm64-apple-macosx26.0; `swiftc -typecheck` (default language mode) and `swiftc -swift-version 6 -typecheck`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/swift-batch10` (32 extracted snippets, 64 typecheck runs, 8 io harness pairs, 4 net config probes, 20 fetched DocC payloads)

## Method

1. Fetched all 20 distinct cited URLs (all HTTP 200) through their DocC JSON payloads (`developer.apple.com/tutorials/data/...`), since the human pages are JavaScript shells; read abstract/discussion/parameter text and checked it against each rule's Why.
2. Extracted both fenced snippets from all 16 rules (32 files) and ran `swiftc -typecheck` in default mode and `-swift-version 6`: **64/64 exit 0, no diagnostics**. No rule uses `compile_exempt`.
3. Ran bounded runtime harnesses (`gtimeout 20`) for all 8 io rules, Bad and Good variants where they differ; each harness asserts the behavioral contrast the rule claims.
4. Ran bounded config-only runtime probes for the 4 net rules whose snippets configure a session without performing a transfer (timeout, waitsForConnectivity, background configuration, invalidate). The 4 net rules that require a live task (async-data, upload-file, stream-bytes, task-metrics) cannot be exercised offline and were source-verified, per instructions.
5. Structural audit: frontmatter, id/path match, section order, one `swift` fence per Bad/Good, summary word counts, anti-slop tokens, version-string scan, `related` / `## See Also` resolution; duplicate symbol scan across the Swift pack; deterministic validator (`node dist/rules/cli.js validate --lang swift --json`).

## Source evidence (claim-specific)

- **FileHandle + read(upToCount:)** (io-filehandle-chunks): FileHandle abstract "An object-oriented wrapper for a file descriptor"; overview "For files, you can read, write, and seek within the file"; read(upToCount:) abstract "Reads data synchronously up to the specified number of bytes"; discussion "returns the data obtained by reading `length` bytes starting at the current file pointer ... Returns an empty `NSData` object if the handle is at the file's end".
- **mappedIfSafe + Data.ReadingOptions** (io-mapped-read): mappedIfSafe abstract "A hint indicating the file should be mapped into virtual memory, if possible and safe."; ReadingOptions abstract "Options to control the reading of data from a URL."
- **URLResourceValues.fileSize + resourceValues(forKeys:)** (io-file-size): fileSize abstract "The total file size, in bytes." + note "Only applicable to regular files."; resourceValues(forKeys:) "Returns a collection of resource values identified by the given resource keys."
- **File-system article + isExcludedFromBackup** (io-temp-directory, io-exclude-backup): "Use this directory for files with a short lifespan, like the side effects of computational operations, or one-time downloads that can be discarded after use."; "the system may purge this directory when your app isn't running"; "The system doesn't back up either the temporary directory or the caches directory."; "delete temporary files as soon as you know you don't need them"; "The system also includes the contents of this folder [Application Support] as part of regular backups"; "If you want to exclude an item in `Documents` or `ApplicationSupport` from backup, call `setResourceValues(_:)` with the value `isExcludedFromBackup`"; "Exclude from the backup any file that your app can recreate or redownload, particularly large media files."; isExcludedFromBackup abstract "True if resource should be excluded from backups, false otherwise."
- **NSFileCoordinator** (io-coordinated-access): abstract "An object that coordinates the reading and writing of files and directories among file presenters"; overview "coordinates the reading and writing of files and directories among multiple processes and objects in the same process ... before your code to perform those actions executes, the file coordinator lets registered file presenter objects perform any tasks"; "Instances of NSFileCoordinator are meant to be used on a per-file-operation basis ... There is no benefit to keeping a file coordinator object past the length of the planned operation."
- **FileManager.copyItem(at:to:)** (io-copy-item): "Copies the file at the specified URL to a new location synchronously"; "If the item at srcURL is a directory, this method copies the directory and all of its contents, including any hidden files"; "If a file with the same name already exists at dstURL, this method stops the copy attempt and returns an appropriate error."
- **createDirectory(...)** (io-create-directory): createIntermediates "If true, this method creates any nonexistent parent directories as part of creating the directory in url. If false, this method fails if any of the intermediate parent directories does not exist."
- **URLSession.data(from:)** (net-async-data): "Convenience method to load data using a URL, creates and resumes a URLSessionDataTask internally"; return "Data and response."
- **timeoutIntervalForRequest** (net-timeout): "determines the request timeout interval for all tasks within sessions based on this configuration"; "controls how long (in seconds) a task should wait for additional data to arrive before giving up"; "The timer associated with this value is reset whenever new data arrives"; "The default value is 60."
- **waitsForConnectivity** (net-connectivity-wait): "indicates whether the session should wait for connectivity to become available, or fail immediately"; true -> "the session calls the urlSession(_:taskIsWaitingForConnectivity:) method of URLSessionTaskDelegate and waits"; false -> "the connection fails immediately with an error, such as NSURLErrorNotConnectedToInternet"; "This property is ignored by background sessions, which always wait for connectivity."
- **background(withIdentifier:)** (net-background-session): "hands control of the transfers over to the system, which handles the transfers in a separate process"; "In iOS, this configuration makes it possible for transfers to continue even when the app itself is suspended or terminated"; identifier "must not be nil or an empty string"; "the app can use the same identifier to create a new configuration object and session and to retrieve the status of transfers that were in progress at the time of termination."
- **invalidateAndCancel()** (net-session-invalidate): "Cancels all outstanding tasks and then invalidates the session"; "Once invalidated, references to the delegate and callback objects are broken. After invalidation, session objects cannot be reused."; "To allow outstanding tasks to run until completion, call finishTasksAndInvalidate() instead."; "Calling this method on the session returned by the shared method has no effect."
- **upload(for:fromFile:)** (net-upload-file): "Convenience method to upload data using a URLRequest, creates and resumes a URLSessionUploadTask internally"; parameter fileURL "File to upload."
- **bytes(for:delegate:) / bytes(from:delegate:) / data(for:delegate:)** (net-stream-bytes): bytes(for:) "Retrieves the contents of a URL based on the specified URL request and delivers an asynchronous sequence of bytes"; "Use this method when you want to process the bytes while the transfer is underway. You can use a for-await-in loop to handle each byte."; "To wait until the session finishes transferring data and receive it in a single Data instance, use data(for:delegate:)." (see non-blocking note).
- **URLSessionTaskMetrics + didFinishCollecting** (net-task-metrics): "An object encapsulating the metrics for a session task"; "Each URLSessionTaskMetrics object contains the taskInterval and redirectCount, as well as metrics for each request-and-response transaction made during the execution of the task."; delegate abstract "Tells the delegate that the session finished collecting metrics for the task."

## Compile results

- `swiftc -typecheck` default and `-swift-version 6`: **64/64 exit 0**, no warnings or diagnostics (32 snippets x 2 modes).
- No rule uses `compile_exempt`.

## Harness results (bounded, gtimeout 20)

| rule | Bad output | Good output | claim confirmed |
|---|---|---|---|
| io-filehandle-chunks | small=3 big=5000 | small=3 big=5000 | chunked loop reads a 48,890-byte file (12 x 4096 chunks) correctly |
| io-mapped-read | prefix=0123456789abcdef, bigPrefix=AAAA... | same | `.mappedIfSafe` read returns correct prefix on 36 B and 2 MB files |
| io-file-size | smallLarge=false bigLarge=true | same | resource-values size matches 1 KB vs 1.5 MB reality |
| io-temp-directory | underTemp=false (Application Support) | underTemp=true (`temporaryDirectory`) | short-lived file lands under the temp directory only in Good |
| io-exclude-backup | excluded=false | excluded=true | flag settable and read back on APFS |
| io-coordinated-access | text="hello notes\n" | text="hello notes\n" | coordinated read returns the file contents |
| io-copy-item | collision=overwrite, dirCopy=error | collision=error, dirCopy=true | documented collision and directory-copy behavior |
| io-create-directory | nested=error, repeat=error | nested=true, repeat=ok | intermediates created; re-create of existing dir succeeds |

## Network rules

- Config-only runtime probes (no transfer): net-timeout `timeout=15.0`; net-connectivity-wait `waits=true`; net-background-session `identifier=com.example.sync`; net-session-invalidate `shutdown=ok`.
- net-async-data, net-upload-file, net-stream-bytes, net-task-metrics execute transfers/tasks and cannot be exercised offline; both snippets type-check in both modes and every claim was checked against the fetched Apple documentation. No network behavior was asserted at runtime.

## Formatting, validator, duplicates, links

- All 16: id/path match, required frontmatter present, `lang`/`prefix`/`severity`/`enforce`/`baseline` valid, exact section order (`Why`, `Bad`, `Good`, `See Also`), exactly one `swift` fence per Bad/Good, summaries <= 30 words with no hedging, no TODO/elision/Unicode-ellipsis/version strings.
- `related` ids and all `## See Also` targets resolve; no duplicate ids; INDEX.md lists all 16 (8 io + 8 net).
- Duplicate symbol scan across the pack: every API symbol cited (`mappedIfSafe`, `isExcludedFromBackup`, `NSFileCoordinator`, `copyItem`, `createDirectory`, `read(upToCount:)`, `fileSizeKey`, `timeoutIntervalForRequest`, `waitsForConnectivity`, `background(withIdentifier:)`, `invalidateAndCancel`, `upload(for:fromFile:)`, `bytes(...)`, `URLSessionTaskMetrics`, `data(from:)`) appears only in its own rule. Closest pairs (io-filehandle-chunks vs io-mapped-read vs io-file-size; net-async-data vs net-stream-bytes; net-timeout vs net-connectivity-wait vs net-background-session) are distinct decisions and cross-reference each other.
- Validator (`node dist/rules/cli.js validate --lang swift --json`): 0 errors / 0 warnings for all 16 batch-10 rules. (The run's 17 errors are `ui-*` index-missing entries from concurrent batch work, none in scope.)

## Non-blocking notes

- `swift-net-stream-bytes`: the Why's contrast sentence says "`data(from:)` is documented as the method that waits until the session finishes transferring and returns a single `Data` instance"; that wording is verbatim on the sibling `data(for:delegate:)` page ("Use this method to wait until the session finishes transferring data and receive it in a single Data instance"), while the cited `data(from:)` page documents the URL convenience without that sentence. The snippet uses `bytes(from: url)`, whose own page (`bytes(from:delegate:)`, fetched 200) carries the same "process the bytes while the transfer is underway" guidance as the cited request variant. Decision and snippet are supported; a future wording pass could cite `bytes(from:delegate:)` / `data(for:delegate:)` for exactness.
- `swift-io-coordinated-access`: the Good accessor maps a read failure to `""` (`try? ... ?? ""`) and only propagates the coordinator error. Compiles and runs; a tighter variant would capture the read error too.
- `swift-io-filehandle-chunks`: the Good loop relies on `read(upToCount:)` returning empty `Data` at EOF (documented); the harness confirms termination and correct counts.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| swift-io-filehandle-chunks | verified | FileHandle/read(upToCount:) quotes match; 64/64 typecheck; harness small=3 big=5000 over 48,890 B |
| swift-io-mapped-read | verified | mappedIfSafe + ReadingOptions quotes match; typecheck; harness prefix correct on 36 B and 2 MB |
| swift-io-file-size | verified | fileSize + resourceValues quotes match; typecheck; harness false/true on 1 KB / 1.5 MB |
| swift-io-temp-directory | verified | article quotes (short lifespan, purge, not backed up, delete when done); harness underTemp true vs false |
| swift-io-exclude-backup | verified | article "exclude ... recreate or redownload" + setResourceValues quote; harness flag true vs false |
| swift-io-coordinated-access | verified | NSFileCoordinator quotes (multi-process, per-operation); typecheck; coordinated read returns content |
| swift-io-copy-item | verified | copyItem quotes (synchronous, directory+hidden, collision error); harness collision=error, dirCopy=true vs overwrite/error |
| swift-io-create-directory | verified | createIntermediates quote; harness nested=true, repeat=ok vs error |
| swift-net-async-data | verified | data(from:) abstract + return quote; typecheck both modes |
| swift-net-timeout | verified | timeoutIntervalForRequest quotes (all tasks, reset on data, default 60); typecheck; probe timeout=15.0 |
| swift-net-connectivity-wait | verified | waitsForConnectivity quotes (delegate wait, NSURLErrorNotConnectedToInternet, background ignored); typecheck; probe waits=true |
| swift-net-background-session | verified | background(withIdentifier:) quotes (system process, suspended/terminated, non-empty id, reattach); typecheck; probe identifier preserved |
| swift-net-session-invalidate | verified | invalidateAndCancel quotes incl. shared-session no-effect; typecheck; probe shutdown=ok |
| swift-net-upload-file | verified | upload(for:fromFile:) abstract + fileURL param; typecheck both modes |
| swift-net-stream-bytes | verified | bytes(for:) streaming + for-await quotes, data wait quote on sibling; typecheck; see note |
| swift-net-task-metrics | verified | URLSessionTaskMetrics overview (taskInterval, redirectCount, transactions) + delegate abstract; typecheck |

## Counts

- Verified: **16/16** (io 8/8, net 8/8)
- Rejected: **0/16**
- Blockers: none

Only the 16 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched. No git operations were performed.
