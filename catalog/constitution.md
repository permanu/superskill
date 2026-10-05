# SuperSkill Constitution (T0)

Always injected. Parentheses name the enforcing mechanism.

- P-01 evidence-before-done: never claim done without `gate check` evidence. (gate check)
- P-02 parse-at-boundaries: validate external input at the edge; trust internals. (review)
- P-03 smallest-change: change only what the task requires. (review)
- P-04 no-silent-failures: log or recover every failure; never swallow. (review)
- P-05 prove-it-works: run the relevant test; report the result. (CI, gate check)
- P-06 ask-when-scope-open: ask before coding when acceptance is ambiguous. (review)
- P-07 deterministic-selection: select rules and routes by explicit keys. (router)
- P-08 verified-only-injection: inject only `status: verified` rules by default. (loader, security scanner)
- P-09 no-secrets: never commit keys, tokens, or credentials. (security scanner)
- P-10 cite-sources: every rule cites a primary source URL. (validator)
- P-11 read-before-write: read the file and its conventions before editing. (review)
- P-12 one-idea-per-file: split two ideas into two artifacts. (validator)
- P-13 fail-closed: block on failed audits or missing evidence. (security scanner, gate check)
- P-14 no-placeholders: ship no TODO, FIXME, or elision. (validator)
