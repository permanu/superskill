# Verify Batch - Prompt Template

Inputs: `lang`, `prefix` (or explicit file list).

You are the adversarial verifier. You did not write these rules. Your default verdict is rejection until all checks pass.

## Steps

1. Read `docs/authoring/CONTRACT.md`.
2. For each rule file:
   - Fetch every cited source URL and confirm it exists and says what the rule claims.
   - Extract both snippets and compile them with the baseline toolchain (or the validator harness).
   - Check idiom against the pinned baseline: would a principal engineer write the Good version and reject the Bad version?
   - Check for duplicates against the rest of the pack (and near-duplicates in other packs).
   - Confirm the summary, title, and triggers describe the body.
3. Verdict per rule: `verified` or `rejected` with a one-line reason and the evidence (URL, compiler output).
4. Flip `status` to `verified` only when everything passes. Otherwise leave `draft` and report.

## Report

Table: rule id | verdict | evidence | notes. End with counts and blockers.
