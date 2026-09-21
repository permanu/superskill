---
name: qa
pack: pipeline
always: false
triggers: [qa, browser, e2e, visual, viz, click, harness]
---

# QA (in-harness browser)

Not a plugin. SuperSkill drives the **system browser** (Chrome) itself via `playwright-core`.

## When this stage exists
You changed HTML, viz, routing that the graph UI shows, or the user asked to verify in a browser. Skip for a pure library rename with no UI.

## What to run
```
superskill-cli qa viz -p <slug>
```
That regenerates the graph HTML, launches headless Chrome, clicks **Vault memory**, checks the panel rendered text, hits **Back**.

## Diagnose
- `qa.ok === true` and `qa.nodes` includes human titles → pass.
- `qa.skipped` → no Chrome; set `CHROME_PATH` or install Chrome. Do not fake a pass.
- Panel empty after click → palette/`openNode` broke; fix viz, do not screenshot-and-pray.

Computer-use here means: the harness clicks its own UI. It does not remote-control the user's desktop.
