---
id: typescript-sec-project-scope
lang: typescript
prefix: sec
title: Scope every vault lookup to the trusted project
severity: must
enforce: review
baseline: latest
status: verified
related: [shared-sec-project-scope]
triggers:
  keywords: [vault, project jail, project scope, cross-project]
  files: ["**/vault*.ts", "**/workspace*.ts"]
sources:
  - title: OWASP Authorization Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
---
> Reject unresolved project scope and include the trusted project in every vault lookup.

## Why

A valid note identifier does not authorize reading another project's note. Resolve project identity through the trusted workspace or authorization boundary, deny missing scope, and include it in every read and mutation lookup, including search and resource adapters. The example isolates logical authorization; filesystem access additionally requires canonical containment and race-aware ownership checks, and a local project jail does not supply multi-user authentication.

## Bad

```typescript
interface Note { project: string; id: string; body: string }
export function readNote(notes: readonly Note[], project: string | null, id: string): string | undefined {
  return notes.find(note => note.id === id)?.body;
}
```

## Good

```typescript
interface Note { project: string; id: string; body: string }
export function readNote(notes: readonly Note[], project: string | null, id: string): string | undefined {
  if (!project) throw new Error("PROJECT_SCOPE_REQUIRED");
  return notes.find(note => note.project === project && note.id === id)?.body;
}
```

## See Also

- [shared-sec-project-scope](../shared/sec-project-scope.md) - language-independent authorization invariant
