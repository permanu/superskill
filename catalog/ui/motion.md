---
name: motion
pack: ui
always: false
triggers: [ui, animation, animate, animated, motion, hover, transition, gesture, easing, spinner, loading]
---

# Motion

Motion is a sentence, not wallpaper. Choose one authored moment per view; let everything else be instant.

## Decide first
- Should this animate at all? High-frequency changes (list hovers, toggles) are usually better instant.
- Purpose must be one of: orient (where it came from), confirm (it worked), focus (where to look). If it does none, cut it.

## One authored moment
- Pick the element the user should follow (dialog, sheet, new row) and animate that. Do not fade and slide the whole page.
- Coupled elements share timing so the screen reads as one motion.
- Bigger distances and bigger elements take slightly longer; small controls stay snappy.

## Timing
- UI default 150-250ms. Exits are faster (120-180ms) than entrances.
- Ease-out with exponential character, e.g. cubic-bezier(0.16, 1, 0.3, 1). Never linear for entrances.
- No bounce, elastic, or overshoot springs; they read as toy-like in product UI.
- Animate from an already-visible default: the element mounts readable, then transitions. Never let the animation be the thing that makes it appear.

## Interruption
- Motion must be interruptible: re-triggering retargets from the current state, no restart from zero, no queue.
- The user's input wins over the animation; never block interaction while it plays.

## Properties
- Baseline: transform (translate/scale) and opacity. They avoid layout and repaint of neighbors.
- Do not animate width/height/top/left for layout motion; use transform, or let layout snap.
- Never animate something that causes a layout shift or a text reflow flicker.

## Reduced motion
- Respect `prefers-reduced-motion: reduce`: replace travel and scale with instant or a short opacity fade.
- Keep the meaning: the state change is still perceivable without movement.

## Feedback / hover
- Hover is feedback, not theater: a small color or lift change with a fast ease-out.
- Pair every hover cue with focus-visible so keyboard users get the same signal.

## Performance
- Keep transform and opacity on the hot path; use will-change sparingly and remove it after.
- Test on the slowest supported device. If it drops frames, cut the effect, not the duration.
