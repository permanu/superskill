---
id: shared-sec-filesystem-containment
lang: shared
prefix: sec
title: Enforce physical containment at filesystem operations
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [filesystem jail, path traversal, symlink, containment, TOCTOU]
sources:
  - title: CWE-22 Improper Limitation of a Pathname to a Restricted Directory
    url: https://cwe.mitre.org/data/definitions/22.html
  - title: CWE-367 Time-of-check Time-of-use Race Condition
    url: https://cwe.mitre.org/data/definitions/367.html
---
> Validate physical containment and object identity at the filesystem operation, not merely a textual path prefix.

## Why

Absolute paths, traversal, sibling-prefix collisions and symlinks defeat naive string checks. Bind the validated root, target or creation parent to the operation using platform-supported confinement primitives; a final-component no-follow flag or a repeated pathname check alone does not secure ancestor directories. If the platform cannot confine hostile parent-directory replacement, enforce that untrusted actors cannot modify those parents and state that threat-model limit instead of claiming a complete sandbox. Hard-link aliases, mount changes and privileged attackers also require explicit platform restrictions or exclusion from the threat model.

## Bad

```text
Allowed root: /vault/alpha.
Accept /vault/alpha-other/note because its text starts with the root.
Check a symlink once, then write after another process changes its target.
```

## Good

```text
Reject sibling-prefix and outside-root canonical targets.
With root /vault/alpha, reject ../beta/note and /vault/alpha-other/note.
Bind the operation to the checked object using supported OS primitives.
Reject changed identity, unsafe parents or unresolved containment.
If a parent is replaced after validation, no outside-root write occurs.
Exercise traversal, symlink chains, missing creation parents and replacement races.
```

## See Also

- [shared-sec-project-scope](sec-project-scope.md) - authorize the logical project before physical access
