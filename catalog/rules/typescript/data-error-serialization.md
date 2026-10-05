---
id: typescript-data-error-serialization
lang: typescript
prefix: data
title: Serialize errors with explicit fields
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Error, serialization, logging]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Error]
related: [typescript-err-domain-error-class, typescript-data-explicit-wire-shape]
sources:
  - title: MDN - JSON.stringify
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
  - title: MDN - Error
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
---
> Serialize `name` and `message` explicitly; `JSON.stringify(error)` writes an empty object.

## Why

`JSON.stringify` visits only enumerable own properties, and an Error keeps its message and stack off that surface, so a stringified error is `{}` with no diagnosis in it. Picking the fields by hand keeps logs and responses useful and stable.

## Bad

```typescript
export function serialize(error: Error): string {
  return JSON.stringify(error);
}
```

## Good

```typescript
export function serialize(error: Error): string {
  return JSON.stringify({ name: error.name, message: error.message });
}
```

## See Also

- [typescript-err-domain-error-class](err-domain-error-class.md) - the stable fields a domain error carries
- [typescript-data-explicit-wire-shape](data-explicit-wire-shape.md) - the same explicit-fields discipline for payloads
