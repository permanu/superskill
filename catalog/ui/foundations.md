---
name: foundations
pack: ui
always: true
triggers: [ui, ux, design, redesign, css, tailwind, styling, style, layout, spacing, typography, font, fonts, color, palette, theme, dark, component, components, button, form, input, modal, nav, navbar, navigation, sidebar, header, footer, hero, landing, page, dashboard, responsive, mobile, viewport, animation, motion, hover, gradient, shadow, icon, icons, accessibility, contrast, figma, screenshot, polish, beautiful, pretty, ugly, empty, frontend]
---

# UI foundations

Apply these to every surface you touch. They are the floor, not the finish line. Build the whole surface, not the component in isolation.

## Hierarchy
- One primary action per view; everything else is secondary or quiet.
- Make size steps obvious: if the title is 24px, the next step is 16-18px, not 22px.
- Size, weight, and color should point the eye to the same element. If the eye bounces, fix hierarchy before adding ornament.
- Layout and content first; decoration only if it earns its place.

## Spacing rhythm
- One scale everywhere: 4, 8, 12, 16, 24, 32, 48, 64. No 13px inventions.
- Space above a heading must exceed space below it; the heading belongs to what follows.
- Group with whitespace first. Borders and boxes only when whitespace is not enough.
- Fewer, larger gaps beat many small tweaks. Align every edge to something.

## Typography
- Body measure 65-75 characters; body line-height 1.4-1.6.
- Two faces maximum (often one); define a clear size and weight ladder and stay on it.
- Tighten large display text to tracking around -0.04em at most; leave body text tracking alone.
- No gradient text. Avoid defaulting to overused system/display faces; choose a face deliberately.
- Left-align paragraphs. Centered body copy longer than two lines is hard to scan.

## Color
- Build neutrals from the brand hue: tint near-black toward it, pull near-white away from pure white.
- One accent, one job. The accent marks the primary action, not decoration.
- Body text contrast at least 4.5:1; large text and UI icons at least 3:1.
- Never put gray text on a colored surface; derive the muted color from that surface.
- Check hover, disabled, and dark variants, not just the default.

## Depth
- Pick one elevation method (soft offset shadow or border) and use it consistently.
- Soft, downward-offset blur. No zero-offset halos, no hard dark offset shadows.
- Elevation signals interactivity or overlay. Static cards usually need no shadow.
- Do not stack depth tricks: border plus shadow plus gradient means simplify.

## Anti-patterns (do not ship)
- Icon + heading + paragraph card grids as the page structure; that is a template, not a design.
- Nested cards (card inside card).
- Kicker/eyebrow labels above headings; the heading carries itself.
- 01 / 02 / 03 numbering unless the order is a real sequence.
- Glass/blur decoration; translucency only for real overlay layers.
- Colored border-left thicker than 1px as a callout; use whitespace or an inline marker.
- Emoji as icons. Inline SVG only, sized and colored like the text around it.
- Center-aligning everything; left-aligned flows scan faster.

## States (design all of them)
- Hover: subtle and fast; never the only affordance, keyboard needs it too.
- Disabled: visibly inert but readable; explain why when it is not obvious.
- Loading: keep layout stable; skeletons only for known shapes, no spinner jumps.
- Error: name the problem and the recovery; preserve the user's input.
- Empty: say what belongs here and the first action. Never ship a blank void.
- Overflow: decide wrap vs truncate; long text must not break the layout.

## Browser surfaces
- Declare the theme (color-scheme) and support dark mode if offered; do not half-style it.
- Style selection, caret, and scrollbars enough that they do not clash with the palette.
- Keep a visible focus ring on every interactive element; never bare `outline: none`.

## Copy
- Controls name the action: "Save changes", not "Submit" or "OK".
- Errors name the problem and recovery: "Card expired — try another", not "Invalid input".
- Empty states and helper text speak to a person: no jargon, no shouting, no filler.

Sources / inspiration: distilled from Impeccable (github.com/pbakaus/impeccable, Apache-2.0).
