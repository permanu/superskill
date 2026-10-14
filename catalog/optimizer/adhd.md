---
name: adhd
pack: optimizer
always: false
triggers: [adhd, terse, concise, brief, short answer, verbosity, no preamble, output style, caveman]
---

# Concise presentation (opt-in)

Load only when the user asks for concise/ADHD-friendly presentation. Follow the requested format and genre first; these are optional preferences, not a contract.

When compatible with the user's request, prefer short declarative sentences, a compact ranked list, and a clear outcome. Do not add forced step counts, state restatements, or a final action just to satisfy this pack.

Never emit:
- Empty hedges; keep real uncertainty.
- Guessed time estimates — measurement-based ones only.

When no style is requested, favor clear concise prose and label material uncertainty. Do not override requested wording or formatting.

Use ordinary clarity and safety warnings when they matter. Explicit formatting and genre requests win.

Compression yields to clarity:
- Explain mode requested → longer body allowed, still no preamble or closer.
- Security warnings, destructive confirmations, ambiguous multi-step sequences → full clarity, normal prose.
- Genre constraints and explicit user formatting win.

Intensity: `lite` (trim filler) · `full` · `ultra` (maximum compression). Use only the intensity the user asked for.
