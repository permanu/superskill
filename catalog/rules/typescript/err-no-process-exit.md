---
id: typescript-err-no-process-exit
lang: typescript
prefix: err
title: Set process.exitCode or throw instead of calling process.exit mid-operation
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [process.exit, exit code, shutdown, truncation]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [process.exit, process.exitCode]
related: [typescript-err-log-once]
sources:
  - title: Node.js - Process (process.exit and process.exitCode)
    url: https://nodejs.org/api/process.html
---
> Let the entrypoint set `process.exitCode` or throw; `process.exit` truncates pending output and cleanup.

## Why

`process.exit` terminates as soon as it runs, even with asynchronous work and buffered stdout/stderr still pending, so final log lines and cleanup can be lost. Setting `process.exitCode` or throwing lets the runtime drain the event loop and unwind before exiting with the chosen status.

## Bad

```typescript
declare const process: { exit(code?: number): never };

declare function loadConfig(): { port: number } | undefined;

function main(): void {
  const config = loadConfig();
  if (config === undefined) {
    console.error("missing config");
    process.exit(1);
  }
  console.log(`listening on ${config.port}`);
}
```

## Good

```typescript
declare const process: { exitCode?: number };

declare function loadConfig(): { port: number } | undefined;

function main(): void {
  const config = loadConfig();
  if (config === undefined) {
    throw new Error("missing config");
  }
  console.log(`listening on ${config.port}`);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}
```

## See Also

- [typescript-err-log-once](err-log-once.md) - the single handler that logs the failure before setting the status
