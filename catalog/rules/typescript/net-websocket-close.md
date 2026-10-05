---
id: typescript-net-websocket-close
lang: typescript
prefix: net
title: Return a way to close the socket you open
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [WebSocket, close, connection]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-conc-interval-cleanup, typescript-net-retry-after]
sources:
  - title: MDN - WebSocket.close
    url: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close
---
> Give the caller a close function for any WebSocket you create so the connection can end.

## Why

A socket that is opened and never closed stays connected for the page's lifetime, holding the connection and its listeners. Returning the close function keeps the connection's lifetime with the subscriber that started it.

## Bad

```typescript
export function subscribe(url: string, onMessage: (data: string) => void): void {
  const socket = new WebSocket(url);
  socket.addEventListener("message", (event) => onMessage(String(event.data)));
}
```

## Good

```typescript
export function subscribe(url: string, onMessage: (data: string) => void): () => void {
  const socket = new WebSocket(url);
  socket.addEventListener("message", (event) => onMessage(String(event.data)));
  return () => socket.close();
}
```

## See Also

- [typescript-conc-interval-cleanup](conc-interval-cleanup.md) - the same lifetime discipline for timers
- [typescript-net-retry-after](net-retry-after.md) - reconnecting after the server asks for a pause
