# Principles — Authoring Contract

**Version:** 1.0 (2026-10-05)
**Applies to:** `catalog/principles/**`

Principles are atomic, cross-language engineering axioms — the layer between the Constitution (always-on, T0) and atomic Rules (language-specific, trigger-selected). Each principle teaches a practice; rules express it in a specific language.

## 1. Layout

```
catalog/principles/<name>.md
```

## 2. Frontmatter

| Field | Type | Required | Rules |
|---|---|---|---|
| id | string | yes | `principle-<name>`; must match the filename |
| title | string | yes | one sentence naming the practice |
| apply_when | string | yes | one sentence trigger ("Apply when …") — the model-facing gate |
| triggers.keywords | string[] | yes | 2-8 task words |
| triggers.symbols | string[] | no | API/type symbols when genuinely indicative |
| enforce | review/both | yes | `tool` is rare at this layer; name the mechanism in the body's Tests where one exists |
| related | string[] | no | principle or rule ids that must resolve |
| sources | {title,url}[] | no | required when the principle asserts a factual or standard-level claim |
| status | draft/verified | yes | only `verified` principles are injected by default |

## 3. Body

```
> One-line imperative summary (≤ 25 words).

## Patterns

- 3-8 bullets: the concrete moves this principle prescribes.

## Tests

- 3-6 self-check questions the model must answer before claiming the principle is satisfied.

## See Also

- [id](file.md) — relation
```

## 4. Content rules

- One idea per file. If two ideas, split.
- Write original wording. Do not copy upstream principle text (pstack or otherwise).
- Cross-language: no language-specific syntax in Patterns beyond an illustrative mention; the language rules carry the syntax.
- Depth over overlap: the constitution states an axiom (`P-01 evidence-before-done`); a principle teaches the practice (how to produce, order, and report evidence). If a principle cannot add depth over an axiom, do not write it.
- No hedging, no placeholders, no TODO/FIXME.
- `## Tests` questions must be answerable from the task at hand — no questions about feelings or process theater.

## 5. Status lifecycle

- `draft` — authored and schema-valid.
- `verified` — an independent verifier confirmed: schema conformance, original wording, depth over the constitution, resolvable links, and that the Tests are actually checkable.
- Only `verified` principles are injected by default; drafts are pull-only.

## 6. Selection (engine contract)

- The router selects principles per task via `apply_when` + `triggers` (same normalization as rules), verified-only by default, deterministic order (match score desc, then id asc), capped (default 3) and budget-packed with the rest of the activation payload.
- Principles never replace rules: rules are the task-specific layer; principles are the cross-cutting discipline.
