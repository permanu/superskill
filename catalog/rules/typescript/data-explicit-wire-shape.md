---
id: typescript-data-explicit-wire-shape
lang: typescript
prefix: data
title: Serialize an explicit wire shape, not the domain object
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [wire format, serialization, payload]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [JSON.stringify]
related: [typescript-data-null-not-undefined, typescript-api-minimal-surface]
sources:
  - title: MDN - JSON.stringify
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
  - title: MDN - JSON
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON
---
> Build the payload from the fields consumers need instead of stringifying the domain object.

## Why

`JSON.stringify` serializes every enumerable own property, so a domain object's internal fields travel with the payload and the wire format changes whenever the class changes. An explicit wire object pins the contract and keeps internal state from leaving the process.

## Bad

```typescript
export class Account {
  constructor(
    public id: string,
    public balanceCents: number,
    public internalNotes: string,
  ) {}
}

export function serialize(account: Account): string {
  return JSON.stringify(account);
}
```

## Good

```typescript
export interface Account {
  id: string;
  balanceCents: number;
  internalNotes: string;
}

export interface AccountWire {
  id: string;
  balanceCents: number;
}

export function serialize(account: Account): string {
  const wire: AccountWire = { id: account.id, balanceCents: account.balanceCents };
  return JSON.stringify(wire);
}
```

## See Also

- [typescript-data-null-not-undefined](data-null-not-undefined.md) - how the chosen fields represent absence
- [typescript-api-minimal-surface](api-minimal-surface.md) - the same discipline for exported symbols
