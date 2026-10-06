---
name: review
pack: ui
always: false
triggers: [ui, ux, design, redesign, review, polish, screenshot, figma, critique]
---

# UI review checklist

Use for UI diffs and "does this look right" requests. Report findings as `path:line: problem. fix.`; block on broken usability, not personal taste.

## Before you judge
- Look at the rendered surface (screenshot or dev server), not only the diff.
- Compare against the rest of the app: same spacing scale, same type ladder, same control shapes.
- State the user-visible consequence of each finding.

## Walk these in order
1. Hierarchy: one obvious primary action; one obvious first place to look; no competing CTAs.
2. Spacing: consistent scale; heading closer to its content than to the block above; edges aligned.
3. Type: measure 65-75ch; clear size and weight steps; no gradient text; no overused default faces.
4. Color and contrast: measured at least 4.5:1 body, 3:1 large/UI; muted text derived from its surface; dark mode checked.
5. States: hover, focus, disabled, loading, error, empty, overflow are each designed.
6. Accessibility: semantic elements, labels and alt text, full keyboard path, visible focus, target sizes, 200% zoom.
7. Responsive: reflows at narrow widths, no horizontal scroll, no clipped controls.
8. Copy: controls name the action; errors name problem and recovery; empty states guide the next step.
9. Motion: one authored moment, exponential ease-out, reduced-motion respected, transform/opacity only.
10. Anti-patterns: card grids as page structure, nested cards, kickers, 01/02/03 without a real sequence, blur decoration, thick colored border-left, emoji as icons.

## Verdict
- Blockers: unusable keyboard path, unreadable contrast, broken layout at a real viewport, misleading copy.
- Nits: spacing drift, inconsistent radius or shadow, hover-only affordance, copy tone.
- If HTML or the graph changed, run the repo QA harness (e.g. `qa viz`) and attach what you saw.
