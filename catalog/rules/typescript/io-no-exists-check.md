---
id: typescript-io-no-exists-check
lang: typescript
prefix: io
title: Read the file instead of checking that it exists
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exists, race condition, ENOENT]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-io-write-exclusive, typescript-err-boundary-parse]
sources:
  - title: Node.js - File system
    url: https://nodejs.org/api/fs.html
---
> Attempt the read and handle its failure instead of checking existence first.

## Why

Between an existence check and the read, another process can remove or replace the file, so the check adds a race and a second syscall without preventing the failure. The read itself reports whether the file was there.

## Bad

```typescript
declare function exists(path: string): Promise<boolean>;
declare function read(path: string): Promise<string>;

export async function config(path: string): Promise<string | undefined> {
  if (await exists(path)) {
    return read(path);
  }
  return undefined;
}
```

## Good

```typescript
declare function read(path: string): Promise<string>;

export async function config(path: string): Promise<string | undefined> {
  try {
    return await read(path);
  } catch {
    return undefined;
  }
}
```

## See Also

- [typescript-io-write-exclusive](io-write-exclusive.md) - creating atomically instead of checking first
- [typescript-err-boundary-parse](err-boundary-parse.md) - handling the failure where it is reported
