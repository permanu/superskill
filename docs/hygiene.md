# Space hygiene

Worktrees, toolchains, Docker, and Xcode all grow quietly until the disk is full. `hygiene` is a read-only report that answers three questions per cache or leftover: **what is it, how big is it, and is it due?** It never deletes anything — every item carries a reason and the exact command to reclaim it, and acting on it is always a separate, explicit step.

## Three ways to reach it

- **CLI** — `superskill hygiene`
- **MCP** — the `hygiene_report` tool (read-only; agents can call it before heavy builds to warn the user)
- **Agent prompt** — "run a space hygiene report" routes to the tool in every host

```bash
superskill hygiene                          # fast report, all probes
superskill hygiene --due                    # only what is due
superskill hygiene --due --sizes            # measure real bytes on disk (slower)
superskill hygiene --category docker xcode  # limit probes
superskill hygiene --json                   # scripts + agents
```

## Probes

| Probe | Looks at | Due when |
|---|---|---|
| `caches` | SuperSkill-managed shared caches **and** default locations (`go-build`, `Mozilla.sccache`, pnpm/pip stores, `~/go/pkg/mod`, …) | auto tier past 30d; consent tier ≥ 1 GiB and past 30d |
| `worktrees` | Prunable registrations and live worktrees across vault-mapped repos | stale registrations; live worktree clean, fully pushed, no ignored files, unlocked, idle ≥ 14d |
| `docker` | Dangling images, unreferenced volumes, build cache (read-only `docker system df`) | dangling images / build cache ≥ 1 GiB; unreferenced volumes ≥ 1 GiB and ≥ 14d old |
| `xcode` | DerivedData, legacy iOS DeviceSupport, unavailable simulators | DerivedData ≥ 5 GiB; DeviceSupport older than the newest version; any unavailable simulator |
| `scratch` | Temp/scratch roots; dirs with a `.superskill-scratch.json` marker are *owned*, everything else is *review-only* | owned scratch idle ≥ 72h |

Each item reports `bytes`, `ageDays`, `tier` (`auto` = regenerable, `consent` = needs an explicit OK, `review` = verify manually), `due`, `reason`, and `plan`. A proposed command is not authorization to run it. Unknown cache-name prefixes are not proof of ownership; unmanaged caches use exact recognized names and tool-native remediation where available. Dirty or unpushed worktrees are blocked, ignored files block removal proposals, and a scratch marker alone does not authorize cleanup outside the managed scratch root. Bounded or incomplete probes report uncertainty rather than claiming a complete inventory.

## Acting on the report

Acting on the report is explicit and reuses the existing safety rails:

```bash
# Caches: the plan hands off to worktree gc (dry-run default, quarantine, undo)
superskill worktree gc --all --older-than 30d         # review
superskill worktree gc --all --older-than 30d --apply # quarantine, reversible

# Docker / Xcode / scratch: review the plan, then run it yourself
superskill hygiene --due --sizes                      # each item prints its plan
```

Tune the thresholds with `SUPERSKILL_HYGIENE_CACHE_AGE_DAYS`, `SUPERSKILL_HYGIENE_SCRATCH_TTL_HOURS`, `SUPERSKILL_HYGIENE_DOCKER_AGE_DAYS`, and point scratch scanning at your own roots with `SUPERSKILL_SCRATCH_ROOTS` (colon-separated paths, added to `$TMPDIR`, `/tmp`, and `~/.superskill/scratch`).
