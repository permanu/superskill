---
id: typescript-io-mkdir-recursive
lang: typescript
prefix: io
title: Create directories with recursive true
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mkdir, recursive, directories]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-io-write-exclusive, typescript-io-no-exists-check]
sources:
  - title: Node.js - File system
    url: https://nodejs.org/api/fs.html
---
> Create parent directories with `recursive: true` so setup is idempotent and does not fail on existing paths.

## Why

Without the option, `mkdir` fails with EEXIST when the directory already exists and cannot create missing parents, so setup code needs its own existence checks. `recursive: true` creates the whole chain and leaves an existing directory in place.

## Bad

```typescript
declare function mkdir(path: string): Promise<void>;
declare function writeFile(path: string, data: string): Promise<void>;

export async function save(dir: string, data: string): Promise<void> {
  await mkdir(dir);
  await writeFile(`${dir}/file.txt`, data);
}
```

## Good

```typescript
declare function mkdir(path: string, options: { recursive: boolean }): Promise<void>;
declare function writeFile(path: string, data: string): Promise<void>;

export async function save(dir: string, data: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/file.txt`, data);
}
```

## See Also

- [typescript-io-write-exclusive](io-write-exclusive.md) - the same idempotence question for creating files
- [typescript-io-no-exists-check](io-no-exists-check.md) - why existence checks before I/O are the wrong shape
