---
id: shared-sec-project-scope
lang: shared
prefix: sec
title: Bind every resource operation to its trusted project scope
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [vault, project jail, project scope, cross-project, tenant isolation]
sources:
  - title: OWASP Authorization Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
---
> Reject missing trusted scope and include project authorization in every resource lookup and mutation.

## Why

An identifier is not authorization, even when it is difficult to guess. Resolve scope from an authenticated or trusted workspace boundary, then apply it to reads, search, resources, caches and writes; never derive authorization solely from a request's project label. A workspace boundary is trusted only when the caller cannot replace its scope configuration; a local project jail does not authenticate remote users. Filesystem confinement and multi-user authentication remain separate controls.

## Bad

```text
Trusted project: alpha. Requested note: n1.
Lookup n1 globally; return beta's matching note.
```

## Good

```text
Trusted project: alpha. Requested note: n1.
Lookup the authorized pair (alpha, n1); beta's note is invisible.
Missing trusted scope: reject before lookup or mutation.
Test read, search, resource and write entry points with colliding IDs.
An alpha request labeled beta still uses alpha authorization; a cache hit cannot bypass it.
```

## See Also

- [shared-sec-filesystem-containment](sec-filesystem-containment.md) - confine physical access separately from logical scope
