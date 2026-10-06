---
name: accessibility
pack: ui
always: false
triggers: [ui, accessibility, accessible, a11y, contrast, keyboard, focus, aria, label, labels, wcag, zoom]
---

# Accessibility

Accessibility comes from the platform, not from patches. Use native elements first; test with the keyboard as you build.

## Semantics first
- Use button, a, input, label, select, table, ul/ol, dialog for their jobs. A clickable div is a bug.
- Headings describe structure and run in order; one h1 per page in most cases.
- Use real lists and landmarks (header, nav, main, footer) where the page has them.

## Names and text
- Every control has a visible label; a placeholder is not a label.
- Every image has alt text: describe it when meaningful, alt="" when decorative.
- Buttons say what they do; links say where they go. Icon-only controls need an accessible name.
- Errors are text, tied to the field, and announced when they appear.

## Keyboard
- Everything clickable is reachable and operable with Tab / Enter / Space; no traps.
- Tab order follows visual order; do not patch it with positive tabindex.
- Escape closes overlays and focus returns to the trigger that opened them.
- Shortcuts do not fire while the user is typing in an input.

## Focus
- Visible focus on every interactive element; never remove it without an equally visible replacement.
- Focus indicator contrast at least 3:1 against adjacent colors.
- Move focus deliberately into dialogs and restore it on close.

## Targets and layout
- Touch targets at least 44x44px including padding; miss-clicks are accessibility bugs.
- Text scales to 200% without clipping and without horizontal scrolling.
- Never rely on color alone for errors, states, or chart series; add text, icon, or shape.

## Contrast (measure it)
- Body text at least 4.5:1; large text at least 3:1; UI borders and icons at least 3:1.
- Measure against the real background, including images, hover, and disabled states.
- Disabled still needs to be readable; gray-on-gray is a fail, not a style.

## ARIA
- Only when semantics cannot carry it (custom widgets, live regions). Native first.
- Use aria-expanded, aria-controls, aria-live precisely; wrong ARIA is worse than none.
- Do not put roles on elements that already have them.

## Verify
- Tab through the entire flow; zoom the page to 200%; run an automated check (axe or Lighthouse) and hand-review every flagged item.
