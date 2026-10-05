---
id: typescript-sec-no-innerhtml
lang: typescript
prefix: sec
title: Write untrusted text with textContent, not innerHTML
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [innerHTML, XSS, textContent, DOM]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [innerHTML, textContent]
related: [typescript-sec-no-eval, typescript-err-boundary-parse]
sources:
  - title: MDN - Element.innerHTML (security considerations)
    url: https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
  - title: OWASP - Cross Site Scripting Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
---
> Write untrusted text with `textContent`; `innerHTML` parses it as markup.

## Why

`innerHTML` parses its input as HTML, so an attacker who controls the string can supply markup with event handlers such as `onerror` that execute script in the page. `textContent` treats the same string as plain text, which removes the parsing step entirely.

## Bad

```typescript
function showMessage(element: HTMLElement, message: string): void {
  element.innerHTML = message;
}
```

## Good

```typescript
function showMessage(element: HTMLElement, message: string): void {
  element.textContent = message;
}
```

## See Also

- [typescript-sec-no-eval](sec-no-eval.md) - the script-execution sink behind injected markup
- [typescript-err-boundary-parse](err-boundary-parse.md) - validating the content before it reaches the DOM
