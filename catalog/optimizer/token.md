---
name: token
pack: optimizer
always: false
triggers: [token, bloat, lazy, simplify, context, adhd, caveman, ponytail]
---

# Token driving

Do not dump the catalog. Route one task → few files.

- YAGNI, reuse this repo, stdlib, then the minimum (ponytail). Do not vendor those plugins here.
- Follow the user's requested output format; token efficiency does not impose a presentation contract.
- Prefer inverted-index routing (query tokens → posting lists) over scanning every skill body.
