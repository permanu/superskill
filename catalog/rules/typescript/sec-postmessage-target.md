---
id: typescript-sec-postmessage-target
lang: typescript
prefix: sec
title: Pass an exact target origin to postMessage
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [postMessage, targetOrigin, iframe, window]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [postMessage]
related: [typescript-sec-postmessage-origin, typescript-sec-no-innerhtml]
sources:
  - title: MDN - Window.postMessage() (security concerns)
    url: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
---
> Pass an exact target origin to `postMessage`; a wildcard discloses the message to any page.

## Why

A window reference can navigate to another origin after it was obtained, so sending with `"*"` hands the message to whatever document now occupies that window. Naming the intended origin makes the browser withhold the message from any other document, which keeps tokens and user data inside the intended frame.

## Bad

```typescript
declare const targetWindow: { postMessage(message: string, targetOrigin: string): void };

function sendToken(token: string): void {
  targetWindow.postMessage(token, "*");
}
```

## Good

```typescript
declare const targetWindow: { postMessage(message: string, targetOrigin: string): void };

function sendToken(token: string): void {
  targetWindow.postMessage(token, "https://app.example.com");
}
```

## See Also

- [typescript-sec-postmessage-origin](sec-postmessage-origin.md) - the receiving side of the same channel
- [typescript-sec-no-innerhtml](sec-no-innerhtml.md) - keeping injected content from executing
