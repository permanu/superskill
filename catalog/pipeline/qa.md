---
name: qa
pack: pipeline
always: false
triggers: [graph viz, graph visualization, graph notes, generated notes, code notes, architecture notes]
---

# Generated graph-note QA

This pack checks generated graph notes only. Application browser, click-through, and e2e behavior belongs to `ui/review`.

## When this stage exists
Run it only when the code-note or architecture-note generator/output changed, or the user explicitly requested `graph viz` or generated-note verification. A generic QA, browser, e2e, click-through, or unrelated graph change is not a reason to regenerate notes.

## What to run
```
superskill graph viz -p <slug>
```

## Check
- Inspect the generated note paths relevant to the changed generator/output; compare their content with the source graph and expected symbols. Do not assume fixed counts or claim a count you did not inspect.
- Confirm hand-edited architecture notes remain untouched when the generator promises to preserve them.
- Check rendering only when requested or part of acceptance, using an actual renderer; report if none is available.

Report the exact notes and evidence observed. Do not fake counts, renders, or a pass.
