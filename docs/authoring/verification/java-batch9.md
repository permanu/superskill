# Java Batch 9 (`proj` + `style`) — Adversarial Verification Report

- Date: 2026-10-05
- Verifier: independent adversarial verifier (fresh context, did not author the rules)
- Scope: `catalog/rules/java/proj-*.md` (12) and `style-*.md` (12) — 24 rules, all entered as `status: draft`
- Toolchain: javac/java 23.0.2 (OpenJDK 23.0.2, Homebrew arm64); `node dist/rules/cli.js validate --lang java --no-compile --json` → 0 errors for the pack (4 pre-existing `hedging` warnings in other java files, none in this batch)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/jbatch9/` (`verify.mjs`, `src/` extracted snippets, `behav/`, `behav2/` drivers)

## Method

1. Sources: fetched every distinct cited URL and matched each Why claim against the saved page text (ServiceLoader, ModuleDescriptor.Requires.Modifier, JEP 403, Runtime, System, Class, Packages tutorial, Access-control tutorial, Google Java Style Guide).
2. Compile: extracted both fenced snippets from all 24 rules (48 snippets) and compiled each independently with `javac 23.0.2 -Xlint:all -d <out>`: **48/48 exit 0**, no diagnostics. The six module-declaration snippets (`proj-module-uses`, `proj-requires-static`, `proj-requires-transitive` × Bad/Good) were compiled as `module-info.java` files in scratch (see harness gap note).
3. Behavior: offline drivers with timeouts for every testable decision — System property defaults, classpath vs cwd resources (plain dir and JAR), package-private member access, classpath ServiceLoader discovery, module `uses` present/absent, JDK-internal reflection, Runtime.exec tokenization vs ProcessBuilder, `requires static` with dependency absent, `requires transitive` consumer compile, unnamed-package import.
4. Idiom/structure/links: exact section order, exactly one `java` fence per Bad/Good, one `## See Also` where related exists, summaries ≤ 30 words (max 17), snippets ≤ 25 lines (max 12), no TODO/elision/hedging in the batch, every `related` id and See Also link resolves, no `enforce: tool` claims, no preview features.

## Source findings

- ServiceLoader: "if the application is a module, then its module declaration must have a *uses* directive"; "Application code refers only to the service, not to service providers…"; API note "service loader objects obtained with this method should not be cached VM-wide… Memory leaks can also arise."; "Instances of this class are not safe for use by multiple concurrent threads." All quoted wording confirmed.
- ModuleDescriptor.Requires.Modifier: TRANSITIVE "The dependence causes any module which depends on the *current module* to have an implicitly declared dependence on the module named by the `Requires`."; STATIC "mandatory in the static phase, during compilation, but is optional in the dynamic phase, during execution." Both definitions verbatim.
- JEP 403: summary sentence quoted verbatim ("Strongly encapsulate all internal elements of the JDK… as was possible in JDK 9 through JDK 16."). Note: the JEP retains `--add-opens` as possible, so the rule's "fragile and unsupported" is a characterization, not a JEP statement (non-blocking wording nit).
- Runtime: `exec(String)` deprecated since 18 with the exact error-prone/tokenization note quoted.
- System: `getProperty(String, String)` "returns the string value of the system property, or the default value if there is no property with that key"; single-arg returns `null`. Confirmed.
- Class: `getResourceAsStream` "the rules for searching resources associated with a given class are implemented by the defining class loader of the class"; leading `/` → absolute resource name algorithm. Confirmed.
- Packages tutorial: "to make types easier to find and use, to avoid naming conflicts, and to control access…"; "the names of your types won't conflict with the type names in other packages because the package creates a new namespace." Confirmed.
- Access-control tutorial: "Use the most restrictive access level that makes sense for a particular member. Use `private` unless you have a good reason not to."; "Avoid `public` fields except for constants." Confirmed.
- Google Java Style: sections 3.3.1, 3.3.3, 3.4.1, 3.4.2.1, 4.1.1, 4.1.2, 4.4, 4.8.2.1, 4.8.3.2, 4.8.7, 5.2.1, 5.2.4, 5.3 all confirmed verbatim (full 1409-line fetch).

## Compile results

`javac 23.0.2 -Xlint:all`: **48/48 snippets exit 0** (24 Bad + 24 Good). Six were compiled as `module-info.java`: `java-proj-module-uses` (Bad/Good), `java-proj-requires-static` (Bad/Good), `java-proj-requires-transitive` (Bad/Good).

**Harness gap (non-blocking, no rule change needed):** `src/rules/harness/java.ts` has no branch for module declarations. A `module … { … }` snippet fails `TYPE_DECL_RE`/`PACKAGE_DECL_RE`/`METHOD_LIKE_RE` and is wrapped in `class Snippet`, producing 5–8 syntax errors; the four shapes tested through `dist/rules/harness/java.js` all returned `ok:false`. The snippets are valid Java and compile cleanly as `module-info.java`. Recommended fix (outside this verifier's ownership): if a snippet matches `/^\s*module\s/`, write it as `module-info.java` and compile that.

## Behavior evidence

- `proj-system-property-defaults`: `-Dapp.mode=custom` → `custom`; unset → `production`; single-arg lookup → `null`.
- `proj-classloader-resource`: from a cwd without `config/` → `classpath=true`, `cwd-file=FileNotFoundException`; same from the packaged JAR in another directory.
- `proj-package-private`: same-package call `deposit(5)` → `balance=5`; cross-package → `deposit(int) is not public in Account; cannot be accessed from outside package`.
- `proj-service-loader`: `META-INF/services` discovery on the classpath → `impl`.
- `proj-module-uses`: named module with `uses` → `impl`; same module without `uses` → `ServiceConfigurationError`.
- `proj-internal-api`: reflection on `String.value` → `InaccessibleObjectException`; `toCharArray` Good → `abc`.
- `proj-process-builder`: `Runtime.exec("/usr/bin/wc -c a b.txt")` tokenized → exit 1; `ProcessBuilder("/usr/bin/wc", "-c", "a b.txt")` → exit 0.
- `proj-requires-static`: dependency absent → module still runs (`static-dep-run-ok`); plain `requires` with dependency absent → boot-layer failure.
- `proj-requires-transitive`: consumer without `requires transitive` → `package com.example.dep is not visible`; with it → compiles.
- `proj-named-package`: importing an unnamed-package type from a named package fails to compile.
- `proj-service-loader-cache`: doc-backed only (no deterministic leak repro); API note and concurrency clause confirmed verbatim.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| java-proj-process-builder | verified | Runtime deprecation/tokenization quote verbatim; exec exit 1 vs ProcessBuilder exit 0 |
| java-proj-system-property-defaults | verified | System default-value quote verbatim; production/custom/null observed |
| java-proj-named-package | verified | tutorial quotes verbatim; unnamed-package import fails to compile |
| java-proj-classloader-resource | verified | Class quotes verbatim; resource found from foreign cwd + JAR, FileInputStream FileNotFoundException |
| java-proj-module-uses | verified | ServiceLoader uses quote verbatim; absent directive → ServiceConfigurationError, present → impl |
| java-proj-requires-static | verified | STATIC definition verbatim; runs with dep absent, plain requires fails |
| java-proj-service-loader | verified | ServiceLoader description quotes verbatim; classpath discovery → impl |
| **java-proj-package-naming** | **rejected** | Title/summary claim reverse-DNS/domain-rooted names, but the cited Google guide (full fetch) has 0 occurrences of "reverse"/"domain"; it supports only lowercase+concatenation. The claim is stated by the Oracle "Naming a Package" tutorial ("Companies use their reversed Internet domain name…") / JLS §6.1 — add that citation (or narrow the title/summary) and re-verify |
| java-proj-service-loader-cache | verified | load(Class) API note + "not safe for use by multiple concurrent threads" verbatim |
| java-proj-internal-api | verified | JEP 403 quote verbatim; reflection → InaccessibleObjectException on 23 |
| java-proj-requires-transitive | verified | TRANSITIVE definition verbatim; consumer compile fails without, succeeds with |
| java-proj-package-private | verified | tutorial tips verbatim; cross-package package-private member rejected |
| java-style-one-top-level-class | verified | Google 3.4.1 quote verbatim |
| java-style-camel-case | verified | Google 5.3 scheme + table rows (XmlHttpRequest, newCustomerId) verbatim |
| java-style-overloads-together | verified | Google 3.4.2.1 quote verbatim |
| java-style-imports-no-wildcard | verified | Google 3.3.1 quote verbatim |
| java-style-imports-order | verified | Google 3.3.3 grouping/blank-line/ASCII-order quote verbatim |
| java-style-array-declaration | verified | Google 4.8.3.2 quote verbatim |
| java-style-modifier-order | verified | Google 4.8.7 JLS order verbatim |
| java-style-column-limit | verified | Google 4.4 quote verbatim; Bad line is 107 chars, Good wraps at +8 |
| java-style-one-variable-per-declaration | verified | Google 4.8.2.1 quote verbatim |
| java-style-kr-braces | verified | Google 4.1.2 K&R quote verbatim |
| java-style-braces-always | verified | Google 4.1.1 quote verbatim |
| java-style-constant-names | verified | Google 5.2.4 UPPER_SNAKE_CASE + constant definition verbatim |

## Counts

- **verified 23/24, rejected 1**
- Status flips applied: 23 `proj-*`/`style-*` files changed `draft` → `verified`; `java-proj-package-naming.md` left `draft`. No other edits made.

## Addendum (re-verification)

- `java-proj-package-naming` re-sourced to Oracle's "Naming a Package" tutorial: lowercase quote and reverse-DNS quote ("companies use their reversed Internet domain name to begin their package names—for example, com.example.mypackage…") verified verbatim against `namingpkgs.html`; both snippets recompiled clean (`javac 23.0.2 -Xlint:all`, exit 0); related/See Also links resolve. **Flipped `draft` → `verified`.** Final: **verified 24/24, rejected 0**.

