---
name: qa
pack: pipeline
always: false
triggers: [qa, browser, e2e, visual, viz, click, harness]
---

# QA (markdown output)

Not a plugin. QA now means checking that `graph viz` wrote the notes the vault should have.

## When this stage exists
You changed graph viz, the code-note or architecture-note generation, or the user asked to confirm the visualization. Skip for a pure library rename with no graph change.

## What to run
```
superskill graph viz -p <slug>
```

## Check
- Notes exist and counts are sane: four architecture notes under `projects/<slug>/architecture/`, code notes under `projects/<slug>/code/` (roughly one per source file) with non-empty symbol lists.
- Regeneration works: re-run after a source change and confirm the matching code note picked it up; architecture notes you hand-edited stay untouched.
- Render check (optional): open the notes in Obsidian or any markdown renderer — Mermaid diagrams and fenced code blocks render, `[[wikilinks]]` resolve.

Report the counts you saw or the notes you opened. Do not fake a pass.
