# Supply-chain and verification hardening — 2026-10-14

Scope: assigned workflow/scripts/Java harness and authoring/review metadata only. Shared checkout; no commits, pushes, reverts, dependency installs, full build, or full test suite. The three in-flight principles and `principles-batch2.md` were read, not edited.

## Changed paths and guarantees

- `.github/workflows/ci.yml`, `.github/workflows/release.yml`: full upstream-verified action commit pins; read-only contents by default; contents write only in the publishing job; checkout credentials are not persisted. Runtime tag and matrix data enter through environment variables, not shell-source interpolation.
- `scripts/release-notes.mjs`, `scripts/release-notes.test.mjs`, `scripts/workflows.test.mjs`: canonical v-prefixed SemVer, package-version agreement, literal changelog header matching, validated previous tags, quoted release arguments, and `--verify-tag`. Release text goes into `RUNNER_TEMP`, not GitHub output records.
- `src/rules/harness/java.ts`, `src/rules/harness/java.test.ts`: eight source-controlled SHA-256 pins replace the writable TOFU manifest. Fresh and cached files must match. Corrupt cached files are refused without deleting user data. The classpath lists only verified files and rejects delimiter injection; no wildcard admits extra jars. Cache directory/files use owner checks, no-follow opens, and modes 0700/0600 on the tested POSIX platform. Downloads reject redirects, cap declared and streamed bytes at 8 MiB, and time out after 15 seconds per artifact. Cached reads are capped too; verified writes use exclusive temporary files and rename.
- `scripts/grammar-manifest.mjs`, `scripts/vendor-grammars.mjs`, `scripts/verify-grammars.mjs`, `scripts/grammars.test.mjs`: installed and declared package versions must equal the source manifest. All inputs are hashed before output changes. Verification compares the dist manifest with source, hashes every declared asset, and rejects unmanifested wasm, including nested assets. Cleanup unlinks only safe grammar filenames listed in the prior generated manifest and absent from the current one; unrelated files/directories are preserved.
- `scripts/verify-package.mjs`, `scripts/verify-package.test.mjs`: inspect `npm pack --dry-run --ignore-scripts --json` paths for development transcripts, caches, environment files, and test artifacts. This is a path-hygiene gate, not a content-level secret scanner.
- `catalog/review/architect.md`, `docs/authoring/CONTRACT.md`: explicitly separate agent review obligations from automated execution and verified source/compile evidence. Add privacy, resource ownership, bounded IO/admission, and supply-chain regression obligations without introducing a review engine.
- `catalog/rules/rust/sources.md`, `catalog/rules/rust/categories.md`: fill the metadata layout required by the contract, declare the actual `closure` prefix, and map the existing 262 files across 26 prefixes. No rule/status changes or pack-wide re-verification claims. All ten primary metadata URLs returned HTTP 200.

## Action commit provenance

Queried each upstream directly with `git ls-remote https://github.com/<owner>/<repo>.git <ref> <ref>^{}` on 2026-10-14. These are observed commits, not inferred hashes. Swift's annotated tag was peeled to its commit.

| Upstream | Queried ref | Pinned commit |
|---|---|---|
| [actions/checkout](https://github.com/actions/checkout) | `refs/tags/v4` | `11d5960a326750d5838078e36cf38b85af677262` |
| [actions/setup-node](https://github.com/actions/setup-node) | `refs/tags/v4` | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| [actions/setup-go](https://github.com/actions/setup-go) | `refs/tags/v5` | `40f1582b2485089dde7abd97c1529aa768e1baff` |
| [actions/setup-java](https://github.com/actions/setup-java) | `refs/tags/v4` | `cf277c60eb25467037889841efdb72551f06f6c3` |
| [actions/setup-python](https://github.com/actions/setup-python) | `refs/tags/v5` | `a26af69be951a213d495a4c3e4e4022e16d87065` |
| [actions/cache](https://github.com/actions/cache) | `refs/tags/v4` | `0057852bfaa89a56745cba8c7296529d2fc39830` |
| [actions/upload-artifact](https://github.com/actions/upload-artifact) | `refs/tags/v4` | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
| [swift-actions/setup-swift](https://github.com/swift-actions/setup-swift) | `refs/tags/v2^{}` | `7ca6abe6b3b0e8b5421b88be48feee39cbf52c6a` |
| [dtolnay/rust-toolchain](https://github.com/dtolnay/rust-toolchain) | `refs/heads/stable` | `686976e191b89faba57d3206551f0f330d8cb249` |

The pinned Rust action's `action.yml` was fetched and its default `toolchain: stable` confirmed. Pinning establishes immutable references, not an audit of all action code or transitive downloads. The [GitHub secure-use reference](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions) was fetched; it documents intermediate environment variables, quoted shell variables, least-privilege token permissions, and full-length SHA pinning.

## Maven checksum provenance

Base: `https://repo.maven.apache.org/maven2/`. Artifact paths below are the exact suffixes under that HTTPS origin. Checksums were fetched with a 2 KiB cap and jars with an 8 MiB cap, a 15-second request deadline, and redirects refused. Independent fresh downloads matched all eight source pins. The largest pinned artifact is 2,213,560 bytes, below the 8 MiB hard cap.

| Artifact path | Upstream checksum suffix | Pinned SHA-256 |
|---|---|---|
| `org/junit/jupiter/junit-jupiter-api/5.11.4/junit-jupiter-api-5.11.4.jar` | `.sha256` | `ab83ef9e51ac4597d59d26b4b58812129550e2f579a404c8af7d09f5ce5b4293` |
| `org/junit/jupiter/junit-jupiter-params/5.11.4/junit-jupiter-params-5.11.4.jar` | `.sha256` | `02a6e015de7ce94ac7f256e7fa05b8091dea861fe79a555a7993313d0f6c7d96` |
| `org/junit/platform/junit-platform-commons/1.11.4/junit-platform-commons-1.11.4.jar` | `.sha256` | `9edd969b0d0670c54105bc91ae79bd1c6f503e12115faba82073b84c86bbc334` |
| `org/opentest4j/opentest4j/1.3.0/opentest4j-1.3.0.jar` | `.sha256` | `48e2df636cab6563ced64dcdff8abb2355627cb236ef0bf37598682ddf742f1b` |
| `org/apiguardian/apiguardian-api/1.1.2/apiguardian-api-1.1.2.jar` | `.sha256` | `b509448ac506d607319f182537f0b35d71007582ec741832a1f111e5b5b70b38` |
| `org/openjdk/jmh/jmh-core/1.37/jmh-core-1.37.jar` | `.sha1` | `dc0eaf2bbf0036a70b60798c785d6e03a9daf06b68b8edb0f1ba9eb3421baeb3` |
| `net/sf/jopt-simple/jopt-simple/5.0.4/jopt-simple-5.0.4.jar` | `.sha1` | `df26cc58f235f477db07f753ba5a3ab243ebe5789d9f89ecf68dd62ea9a66c28` |
| `org/apache/commons/commons-math3/3.6.1/commons-math3-3.6.1.jar` | `.sha1` | `1e56d7b058d28b65abd256b8458e3885b674c1d588fa43cd7d1cbb9c7ef2b308` |

The last three `.sha256` endpoints return HTTP 404. Their jars were independently downloaded from Maven Central over HTTPS, checked against the published `.sha1`, and hashed locally with SHA-256. Observed upstream SHA-1 values:

- JMH: `896f27e49105b35ea1964319c83d12082e7a79ef`.
- jopt-simple: `4fdac2fbe92dfad86aa6e9301736f6b4342a3f5c`.
- commons-math3: `e4ba98f1d4b3c80ec46392f25e094a6a2e58fcbf`.

This is TLS-origin/checksum evidence, not detached-signature verification; SHA-1 has weaker collision resistance. Runtime trust uses the reviewed in-repo SHA-256 only and never downloads or learns a checksum.

## Focused verification

Environment: macOS, Node `v26.8.1`, installed Vitest `3.2.7`, `javac 23.0.2`. No dependency reinstallation was performed while other agents worked.

| Command/check | Observed result |
|---|---|
| `npx vitest run src/rules/harness/java.test.ts src/lib/codegraph/grammars.test.ts src/rules/principles.test.ts --maxWorkers=2` | 3 files, **45 tests passed** |
| `npx vitest run src/rules/harness/java.test.ts --maxWorkers=2 --coverage --coverage.include=src/rules/harness/java.ts --coverage.reporter=text --coverage.reportsDirectory=<approved temporary directory>` | **20 passed**; lines/statements **94.79%**, branches **88.88%**, functions **100%**; configured coverage gate passed |
| `node --test --test-concurrency=2 scripts/*.test.mjs` | **15 passed**, no skips |
| `npx tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --esModuleInterop --skipLibCheck src/rules/harness/java.ts src/rules/harness/java.test.ts` | exit 0 |
| `env RELEASE_TAG=v0.14.0 node scripts/release-notes.mjs --validate` | validated `v0.14.0` |
| `node scripts/verify-grammars.mjs` | **9 source-pinned assets**, **9 languages** resolve to vendored grammars |
| `node scripts/verify-package.mjs` | **2577 packaged paths**, no forbidden development artifact paths |
| `node dist/rules/cli.js validate --lang rust --no-compile --json` | **262 checked, 0 errors**, 18 existing compile-exempt warnings; not compile evidence |
| Independent Rust metadata count/index comparison | **26 prefixes**, **262 files**, exact parity |
| Independent principles structure/link/loader/collision check | **25 principles**, zero loader warnings; **16 new keys vs 103 existing keys**, zero collisions and one owner per new posting |
| Bounded fetch of all six new-principle primary URLs | all **HTTP 200**; availability is not a new independent semantic verification |
| `git diff --check` | exit 0 at verification time |

The first targeted Java coverage attempt passed its 19 tests but failed the 85% function threshold at 81.81%; adding valid statement/member compile preservation coverage produced the passing numbers above. Initial red tests were also observed before implementation.

## Remaining integration work and limits

- The coordinator must install the revised dependency lock after parallel agents stop, then run integration/build and release gates on the combined tree. These results used the installed pre-update Vitest, not the newly declared dependency versions.
- `npm run lint` was attempted and failed in other agents' in-flight telemetry, MCP integration, graph store, and traversal files. The isolated Java type-check passed; no foreign files were changed to make the global gate green.
- Package/grammar checks inspect the existing `dist` snapshot. No fresh full build, remote workflow execution, GitHub release, npm publication, Windows ACL validation, or detached Maven signature validation was performed.
- The principles verification report's documented non-idempotent Appendix A script is outside this worker's edits. The independent read-only rerun excluded the three candidate files and reproduced zero collisions; neither the user report nor principle content/status was rewritten.
- SuperSkill's read-only cache environment was resolved. Shared-cache policy activation requires consent and was not performed; the current shared checkout is not eligible for removal.

## Integrated coordinator verification

The dependency installation and combined-tree gates above were subsequently completed on 2026-10-14. Installed versions include MCP SDK 1.31.0, Vitest/coverage 4.1.11, TypeScript 5.9.3, and the unchanged pinned parser/grammar packages. Existing coverage thresholds were not lowered and no new coverage exclusions were added.

| Command/check | Observed combined-tree result |
|---|---|
| `npm ci --ignore-scripts` | completed against the updated lockfile |
| `npm run lint` | exit 0 |
| `npm run test:coverage -- --reporter=dot --silent` | fresh build; **209 files / 3,724 tests passed**, no skips or failures; exit 0 |
| Combined V8 coverage | statements **90.01%**, branches **82.99%**, functions **95.06%**, lines **93.21%**; all existing gates passed |
| `node dist/rules/cli.js validate --no-compile --json` | **2,245 checked**, zero errors; 18 existing compile-exempt warnings; structural evidence only |
| `node --test --test-concurrency=2 scripts/*.test.mjs` | **15 passed**, zero skips/failures |
| `npm run verify:grammars` | all **9** source-pinned assets verified |
| `node scripts/verify-package.mjs` | **2,583** packaged paths; no forbidden development artifact paths |
| `npm run check:versions` | version 0.14.0 agrees across all four sources |
| `npm audit --audit-level=high --json` | exit 0; **zero high/critical**, four moderate entries from the single unpatched sprintf-js advisory |
| `git diff --check` | exit 0 |

The residual advisory and guarded YAML-only reachability are documented in `docs/security.md`; the application does not invoke the YAML CLI. Follow-up is tracked in the project vault as task-001. No commits, remote publication, cache-policy activation, remote CI execution, or live client/Windows ACL verification is claimed by these local results.
