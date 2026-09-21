---
name: typescript
pack: code
langs: [typescript, javascript]
triggers: [typescript, javascript, ts, js, node, bun, type, generic, tsconfig]
---

# TypeScript / Node (staff)

Current TypeScript (strict, inference, `satisfies`) — not folklore "never use X" lists. Match **this repo**: ESM vs CJS, Node vs Bun vs browser. `execFile` not `exec`.

## Defaults
- `strict`. No `any`. `unknown` + narrow. Infer internals; annotate public API and `catch (e)`.
- `satisfies` over `as` for literals. Assertion only at a real boundary (JSON, FFI).
- Discriminated unions over booleans that cannot be true together. Generics: default only when almost every caller wants it.
- Stdlib first (`node:sqlite`, `node:fs`, `node:path`). Do not add a runtime for what Node already does.

## Edge cases
- **Errors:** log unexpected codes (`EACCES`, `EISDIR`); do not swallow. Never `exec` with a shell.
- **Races:** atomic write = tmpfile + rename (or DB transaction), not read-modify-write without a lock.
- **ESM + extension:** import `./x.js` from `.ts` (Node16). Relative imports only inside the package.
- **Trust:** validate at the process boundary (HTTP, CLI, RPC). Never trust path/body from the client.
- **Tests:** one check that fails if the new branch is wrong. Vitest, no fixture theater.

## When
This repo, or any Node/TS service on this Mac. If the repo is Bun-only, match the repo.

## Verify
`npm test` on the files you touched, `tsc --noEmit`.
