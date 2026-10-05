---
id: typescript-sec-no-eval
lang: typescript
prefix: sec
title: Never execute code from a string
severity: must
enforce: tool
tool: "eslint:no-eval"
baseline: latest
status: verified
triggers:
  keywords: [eval, Function, injection, code execution]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [eval, Function]
related: [typescript-err-boundary-parse, typescript-sec-no-user-regex]
sources:
  - title: MDN - eval() (security considerations)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
  - title: ESLint - no-eval
    url: https://eslint.org/docs/latest/rules/no-eval/
  - title: typescript-eslint - no-implied-eval
    url: https://typescript-eslint.io/rules/no-implied-eval/
---
> Never execute code from a string; map input to explicit operations instead.

## Why

`eval` and `new Function` run their argument with the privileges of the caller, so any string that reaches them from outside the program becomes arbitrary code execution. The same risk appears in the implied form when a string is passed to `setTimeout` or `setInterval`, which parse it as a script body.

## Bad

```typescript
function runExpression(expression: string): number {
  return eval(expression);
}
```

## Good

```typescript
function runExpression(expression: "sum" | "product", a: number, b: number): number {
  switch (expression) {
    case "sum":
      return a + b;
    case "product":
      return a * b;
  }
}
```

## See Also

- [typescript-err-boundary-parse](err-boundary-parse.md) - turning input into data rather than code
- [typescript-sec-no-user-regex](sec-no-user-regex.md) - the regex form of passing input into a parser
