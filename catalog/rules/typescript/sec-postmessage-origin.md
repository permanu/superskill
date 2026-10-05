---
id: typescript-sec-postmessage-origin
lang: typescript
prefix: sec
title: Check event.origin before trusting a message
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [postMessage, origin, message event, iframe]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [MessageEvent]
related: [typescript-sec-postmessage-target, typescript-err-boundary-parse]
sources:
  - title: MDN - Window.postMessage() (the dispatched event)
    url: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
---
> Check `event.origin` before trusting a message; any window can send one.

## Why

A `message` listener fires for every window in the frame hierarchy, including unrelated and hostile documents, and the event carries no proof of trustworthiness. Comparing `event.origin` against the one expected sender rejects everything else before the payload reaches application logic.

## Bad

```typescript
function handleMessage(event: MessageEvent): void {
  console.log(event.data);
}

window.addEventListener("message", handleMessage);
```

## Good

```typescript
function handleMessage(event: MessageEvent): void {
  if (event.origin !== "https://app.example.com") {
    return;
  }
  console.log(event.data);
}

window.addEventListener("message", handleMessage);
```

## See Also

- [typescript-sec-postmessage-target](sec-postmessage-target.md) - the sending side of the same channel
- [typescript-err-boundary-parse](err-boundary-parse.md) - validating the payload after the sender is verified
