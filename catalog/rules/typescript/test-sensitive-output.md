---
id: typescript-test-sensitive-output
lang: typescript
prefix: test
title: Fail leakage tests without printing the captured payload
severity: must
enforce: review
baseline: latest
status: verified
related: [shared-test-sensitive-output, typescript-obs-log-error-object]
triggers:
  keywords: [leakage test, secret output, test artifacts, sensitive output, canary]
  files: ["**/*privacy*.test.ts", "**/*leak*.test.ts"]
sources:
  - title: OWASP Logging Cheat Sheet - Verification
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
---
> Assert leakage using a boolean or fixed error code, never by printing the captured sensitive payload.

## Why

A failed assertion can copy the very value it is supposed to protect into CI logs or reports. Inject synthetic canaries, capture the actual success and failure sinks including stdout, stderr, snapshots and artifacts, and report only a fixed failure label. This check proves absence of the supplied canary in the inspected outputs, not absence of all secrets; encoded forms and other sinks require separate cases.

## Bad

```typescript
export function assertNoCanary(outputs: readonly string[], canary: string): void {
  for (const output of outputs) {
    if (output.includes(canary)) throw new Error(`Leaked output: ${output}`);
  }
}
```

## Good

```typescript
export function assertNoCanary(outputs: readonly string[], canary: string): void {
  if (canary.length === 0) throw new Error("CANARY_REQUIRED");
  const leaked = outputs.some(output => output.includes(canary));
  if (leaked) throw new Error("SENSITIVE_OUTPUT_DETECTED");
}
```

## See Also

- [shared-test-sensitive-output](../shared/test-sensitive-output.md) - language-independent sink verification contract
- [typescript-obs-log-error-object](obs-log-error-object.md) - emit allowlisted diagnostics
