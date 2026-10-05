---
id: typescript-io-write-exclusive
lang: typescript
prefix: io
title: Create-once with the wx flag
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exclusive create, lock file, wx]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-io-no-exists-check, typescript-io-mkdir-recursive]
sources:
  - title: Node.js - File system
    url: https://nodejs.org/api/fs.html
---
> Open lock and claim files with the `wx` flag so an existing file fails the write instead of being overwritten.

## Why

A plain write replaces whatever is at the path, so two processes racing to create the same claim both succeed and one silently loses its data. The `wx` flag fails with EEXIST when the path exists, which makes the create a single atomic claim.

## Bad

```typescript
declare function writeFile(path: string, data: string): Promise<void>;

export async function claim(path: string, data: string): Promise<void> {
  await writeFile(path, data);
}
```

## Good

```typescript
declare function writeFile(path: string, data: string, options: { flag: string }): Promise<void>;

export async function claim(path: string, data: string): Promise<void> {
  await writeFile(path, data, { flag: "wx" });
}
```

## See Also

- [typescript-io-no-exists-check](io-no-exists-check.md) - why check-then-create cannot be atomic
- [typescript-io-mkdir-recursive](io-mkdir-recursive.md) - the directory form of idempotent setup
